import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo-regimen-vertical-new.png";
import { FcGoogle } from "react-icons/fc";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from '@capgo/capacitor-social-login';
import { authSignUpSchema, authSignInSchema } from "@/utils/validation";
import { trackSignup, trackLogin, setUserId, getPlatform } from "@/utils/analytics";
import { getStoredAttribution, clearAttribution } from "@/utils/attribution";
import { appVersion } from '../../capacitor.config';
import { withQueryTimeout, withTimeout } from "@/utils/withTimeout";
import { startAuthTrace, authTrace, endAuthTrace } from "@/utils/authTracer";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// Timeout for post-login background tasks (4 seconds)
const POST_LOGIN_TIMEOUT_MS = 4000;
// Cooldown for resend code button (60 seconds)
const RESEND_COOLDOWN_MS = 60000;

type ForgotPasswordStep = 'email' | 'code' | 'newPassword';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>('email');
  const [resetCode, setResetCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Initialize Google Auth ONCE on native platforms
  useEffect(() => {
    const initializeSocialLogin = async () => {
      if (Capacitor.isNativePlatform()) {
        console.log('[Auth] Initializing Social Login for native platform');
        await SocialLogin.initialize({
          google: {
            webClientId: '495863490632-pu5gu0svgcviivgr3la0c7esmakn6396.apps.googleusercontent.com',
            iOSClientId: '495863490632-lp0fckcnkiv0ktqeq2v4gout41bl8698.apps.googleusercontent.com',
          },
        });
        console.log('[Auth] Social Login initialized successfully');
      }
    };

    initializeSocialLogin();
  }, []); // Run only once on mount

  useEffect(() => {
    const mode = searchParams.get("mode");
    const isResetMode = mode === "reset";
    
    // Check for reset mode from URL parameter
    if (isResetMode) {
      console.log('[Auth] Reset mode detected from URL parameter');
      setIsResettingPassword(true);
      // Don't return early - still need to set up auth listener
    }

    // Check for existing session - but don't redirect if in reset mode
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isResetMode) {
        console.log('[Auth] Existing session found, redirecting to /today');
        navigate("/today", { replace: true });
      } else if (session && isResetMode) {
        console.log('[Auth] Session found in reset mode - showing password form');
        setSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('[Auth] Auth state changed:', event, !!currentSession);
      setSession(currentSession);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] PASSWORD_RECOVERY event received');
        setIsResettingPassword(true);
      } else if (event === 'SIGNED_IN' && currentSession) {
        // Don't redirect if we're in reset mode - user needs to change password
        if (isResetMode || isResettingPassword) {
          console.log('[Auth] Signed in during reset mode - staying on password form');
          return;
        }
        
        // Start auth trace for diagnostics
        startAuthTrace();
        authTrace('SIGNED_IN_RECEIVED', `userId: ${currentSession.user.id.slice(0, 8)}...`);
        
        // Set GA4 user ID for cross-session tracking
        setUserId(currentSession.user.id);
        
        // CRITICAL FIX: Navigate IMMEDIATELY - don't block on any network calls
        authTrace('NAVIGATING_NOW', '/today');
        navigate("/today", { replace: true });
        endAuthTrace(true, '/today');
        
        // Fire background tasks without blocking navigation
        setTimeout(() => {
          runPostLoginTasksInBackground(currentSession.user.id, currentSession);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        if (window.location.pathname !== '/auth') {
          navigate("/auth", { replace: true });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, navigate, isResettingPassword]);

  // Track if we've already run background tasks for this user
  const processedUsers = useRef<Set<string>>(new Set());

  /**
   * Background tasks that run AFTER navigation.
   * These are fire-and-forget with timeouts - they cannot block the UI.
   */
  const runPostLoginTasksInBackground = async (userId: string, currentSession: any) => {
    // Prevent duplicate runs
    if (processedUsers.current.has(userId)) {
      console.log('[Auth] Already ran background tasks for this user, skipping');
      return;
    }
    processedUsers.current.add(userId);

    try {
      authTrace('BG_TASKS_START', 'profile check + welcome email');
      
      // Fetch profile with timeout
      const profileResult = await withQueryTimeout(
        supabase
          .from("profiles")
          .select("onboarding_completed, welcome_email_sent, full_name")
          .eq("user_id", userId)
          .maybeSingle(),
        'profile_fetch',
        POST_LOGIN_TIMEOUT_MS
      );

      if (profileResult.error) {
        authTrace('PROFILE_FETCH_ERROR', profileResult.error.message);
        return;
      }

      const profile = profileResult.data;
      if (!profile) {
        authTrace('PROFILE_NOT_FOUND', 'no profile row');
        return;
      }

      authTrace('PROFILE_LOADED', `welcome_sent: ${profile.welcome_email_sent}`);

      // Send welcome email if not sent yet - use atomic update to prevent race condition
      if (!profile.welcome_email_sent) {
        authTrace('WELCOME_EMAIL_ATTEMPT', 'starting');
        
        const { data: updateResult } = await withQueryTimeout(
          supabase
            .from('profiles')
            .update({ welcome_email_sent: true })
            .eq('user_id', userId)
            .eq('welcome_email_sent', false)
            .select(),
          'welcome_email_flag_update',
          POST_LOGIN_TIMEOUT_MS
        );

        if (updateResult && updateResult.length > 0) {
          const userEmail = currentSession.user.email;
          if (userEmail) {
            authTrace('WELCOME_EMAIL_SENDING', userEmail);
            
            withTimeout(
              supabase.functions.invoke('send-welcome-email', {
                body: { 
                  email: userEmail,
                  fullName: profile.full_name || 'there'
                }
              }),
              POST_LOGIN_TIMEOUT_MS,
              'welcome_email_invoke'
            ).then(() => {
              authTrace('WELCOME_EMAIL_SUCCESS');
            }).catch((emailError) => {
              authTrace('WELCOME_EMAIL_ERROR', emailError.message);
              supabase
                .from('profiles')
                .update({ welcome_email_sent: false })
                .eq('user_id', userId);
            });
          }
        } else {
          authTrace('WELCOME_EMAIL_SKIPPED', 'lost race or already sent');
        }
      }

      authTrace('BG_TASKS_DONE');
    } catch (error: any) {
      authTrace('BG_TASKS_ERROR', error.message || 'unknown error');
      console.error("[Auth] Background task error:", error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      
      toast.success("Password updated successfully! Redirecting...");
      setTimeout(() => navigate("/today"), 1500);
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send 6-digit code to email
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      });

      if (error) throw error;
      
      // Check for rate limit response
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      
      toast.success("Reset code sent! Check your email.");
      setForgotStep('code');
      setResendCooldown(60);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      
      toast.success("New code sent!");
      setResetCode("");
      setResendCooldown(60);
    } catch (error: any) {
      toast.error("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2+3: Verify code and set new password
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (forgotStep === 'code') {
      if (resetCode.length !== 6) {
        toast.error("Please enter the 6-digit code");
        return;
      }
      setForgotStep('newPassword');
      return;
    }

    // Step 3: Submit new password
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-reset-code', {
        body: {
          email,
          code: resetCode,
          new_password: password,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        // If code invalid, go back to code step
        if (data.error.includes('Invalid') || data.error.includes('expired')) {
          setForgotStep('code');
          setResetCode("");
        }
        return;
      }

      toast.success("Password updated! You can now sign in.");
      // Reset all forgot password state
      setIsForgotPassword(false);
      setForgotStep('email');
      setResetCode("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      const isNative = Capacitor.isNativePlatform();
      console.log('Platform:', isNative ? 'native' : 'web');
      
      if (isNative) {
        console.log('Starting native Google Sign-In with Social Login');
        const result = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['profile', 'email'],
          },
        });
        
        console.log('Social Login result:', result);
        
        if (result.provider !== 'google') {
          throw new Error('Unexpected provider result');
        }
        
        const idToken = (result.result as any)?.idToken;
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) throw error;
        console.log('Successfully signed in with Google');
        trackLogin('google');
        
        if (data?.user) {
          const attribution = getStoredAttribution();
          const locale = navigator.language || 'en-US';
          const countryCode = locale.split('-')[1] || null;
          
          if (attribution?.utm_source || attribution?.referrer || countryCode) {
            const platform = getPlatform();
            await supabase.from('profiles').update({
              utm_source: attribution?.utm_source || null,
              utm_medium: attribution?.utm_medium || null,
              utm_campaign: attribution?.utm_campaign || null,
              utm_content: attribution?.utm_content || null,
              referrer: attribution?.referrer || null,
              landing_page: attribution?.landing_page || null,
              attributed_at: attribution?.utm_source || attribution?.referrer ? new Date().toISOString() : null,
              country_code: countryCode,
              detected_locale: locale,
              signup_platform: platform,
              last_platform: platform,
              last_app_version: appVersion,
            } as any).eq('user_id', data.user.id);
            console.log('[Auth] Google Sign-in attribution, country, and platform persisted');
          }
          clearAttribution();
        }
      } else {
        console.log('Starting web Google Sign-In with account picker');
        const redirectTo = `${window.location.origin}/auth`;
        console.log('[Auth] Starting web Google Sign-In, redirectTo:', redirectTo);

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

        if (error) throw error;
        return;
      }
      
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.message?.includes('popup_closed_by_user') || error.message?.includes('canceled')) {
        console.log('User cancelled Google sign-in');
      } else {
        toast.error(error.message || "Failed to sign in with Google");
      }
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isSignUp) {
        authSignUpSchema.parse({ email, password, fullName });
      } else {
        authSignInSchema.parse({ email, password });
      }
    } catch (error: any) {
      if (error.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please check your input");
      }
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName.trim()
            }
          },
        });

        if (error) throw error;
        trackSignup('email');
        
        const attribution = getStoredAttribution();
        const locale = navigator.language || 'en-US';
        const countryCode = locale.split('-')[1] || null;
        
        if (signUpData?.user) {
          const platform = getPlatform();
          await supabase.from('profiles').update({
            utm_source: attribution?.utm_source || null,
            utm_medium: attribution?.utm_medium || null,
            utm_campaign: attribution?.utm_campaign || null,
            utm_content: attribution?.utm_content || null,
            referrer: attribution?.referrer || null,
            landing_page: attribution?.landing_page || null,
            attributed_at: attribution?.utm_source || attribution?.referrer ? new Date().toISOString() : null,
            country_code: countryCode,
            detected_locale: locale,
            signup_platform: platform,
            last_platform: platform,
            last_app_version: appVersion,
          } as any).eq('user_id', signUpData.user.id);
          console.log('[Auth] Attribution, country, and platform data persisted to profile');
        }
        clearAttribution();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        trackLogin('email');
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Try logging in instead.");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine title and subtitle
  const getTitle = () => {
    if (isResettingPassword) return "Reset Password";
    if (isForgotPassword) {
      if (forgotStep === 'email') return "Forgot Password";
      if (forgotStep === 'code') return "Enter Code";
      return "New Password";
    }
    return isSignUp ? "Create Account" : "Welcome Back";
  };

  const getSubtitle = () => {
    if (isResettingPassword) return "Enter your new password";
    if (isForgotPassword) {
      if (forgotStep === 'email') return "We'll send you a 6-digit code";
      if (forgotStep === 'code') return `Enter the code sent to ${email}`;
      return "Choose your new password";
    }
    return isSignUp ? "Join thousands optimizing their health" : "Sign in to continue";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 safe-top safe-bottom overflow-y-auto">
      <Card className="w-full max-w-md border-border my-4">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center pt-2">
            <img src={logo} alt="REGIMEN" className="h-16 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{getTitle()}</h1>
            <p className="text-muted-foreground text-sm">{getSubtitle()}</p>
          </div>

          {/* Form Container */}
          <div className="space-y-6">

        {isResettingPassword ? (
          /* Legacy reset flow - PASSWORD_RECOVERY event from link */
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        ) : isForgotPassword ? (
          /* New 3-step code-based reset flow */
          forgotStep === 'email' ? (
            <form onSubmit={handleSendResetCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Code"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotStep('email');
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to login
              </button>
            </form>
          ) : forgotStep === 'code' ? (
            <form onSubmit={handleVerifyAndReset} className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <InputOTP
                  maxLength={6}
                  value={resetCode}
                  onChange={(value) => setResetCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button type="submit" className="w-full" disabled={loading || resetCode.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setForgotStep('email');
                    setResetCode("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            /* Step 3: New password */
            <form onSubmit={handleVerifyAndReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setForgotStep('code')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleAuth} className="space-y-6">

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Create a password" : "Enter your password"}
                  className="pr-10"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </p>
          </form>
        )}
          </div>
        </div>
      </Card>
    </div>
  );
}
