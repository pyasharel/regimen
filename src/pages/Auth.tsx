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
import { trackSignup, trackLogin, setUserId } from "@/utils/analytics";
import { getStoredAttribution, clearAttribution } from "@/utils/attribution";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);


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
        console.log('[Auth] User signed in, checking onboarding status');
        // Set GA4 user ID for cross-session tracking
        setUserId(currentSession.user.id);
        setCheckingAuth(true);
        checkOnboardingStatus(currentSession.user.id);
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

  // Track if we've already checked onboarding for this user
  const checkedUsers = useRef<Set<string>>(new Set());

  const checkOnboardingStatus = async (userId: string) => {
    // Prevent multiple calls for the same user
    if (checkedUsers.current.has(userId)) {
      console.log('[Auth] Already checked onboarding for this user, skipping');
      return;
    }
    checkedUsers.current.add(userId);

    try {
      console.log('[Auth] Checking onboarding status for user:', userId);
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_completed, welcome_email_sent, full_name")
        .eq("user_id", userId)
        .single();

      if (profileError) {
        console.error("[Auth] Error fetching profile:", profileError);
        setTimeout(() => {
          setCheckingAuth(false);
          navigate("/onboarding", { replace: true });
        }, 100);
        return;
      }

      console.log('[Auth] Profile loaded:', { 
        onboarding_completed: profile.onboarding_completed,
        welcome_email_sent: profile.welcome_email_sent 
      });

      // Send welcome email if not sent yet - use atomic update to prevent race condition
      if (!profile?.welcome_email_sent) {
        console.log('[Auth] Attempting to send welcome email');
        // Atomically update only if welcome_email_sent is still false
        const { data: updateResult } = await supabase
          .from('profiles')
          .update({ welcome_email_sent: true })
          .eq('user_id', userId)
          .eq('welcome_email_sent', false)
          .select();

        // Only send email if we successfully updated (meaning we won the race)
        if (updateResult && updateResult.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            console.log('[Auth] Won race condition, sending welcome email to:', user.email);
            supabase.functions.invoke('send-welcome-email', {
              body: { 
                email: user.email,
                fullName: profile?.full_name || 'there'
              }
            }).catch((emailError) => {
              console.error('[Auth] Error sending welcome email:', emailError);
              // Reset flag only if email send failed
              supabase
                .from('profiles')
                .update({ welcome_email_sent: false })
                .eq('user_id', userId);
            });
          }
        } else {
          console.log('[Auth] Lost race condition - welcome email already sent by another process');
        }
      } else {
        console.log('[Auth] Welcome email already sent previously');
      }

      // Use setTimeout to ensure React processes state updates before navigation
      setTimeout(() => {
        setCheckingAuth(false);
        // Skip onboarding for beta - navigate directly to /today
        console.log('[Auth] Navigating to /today');
        navigate("/today", { replace: true });
      }, 100);
    } catch (error) {
      console.error("[Auth] Error in checkOnboardingStatus:", error);
      setTimeout(() => {
        setCheckingAuth(false);
        navigate("/today", { replace: true });
      }, 100);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;
      
      toast.success("Password reset email sent! Check your inbox.");
      setIsForgotPassword(false);
      setEmail("");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Detect if running on native platform
      const isNative = Capacitor.isNativePlatform();
      console.log('Platform:', isNative ? 'native' : 'web');
      
      if (isNative) {
        // Native: Use Social Login SDK (already initialized in useEffect)
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
        
        // Access idToken from the nested result object
        const idToken = (result.result as any)?.idToken;
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }

        // Sign in to Supabase with the Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) throw error;
        console.log('Successfully signed in with Google');
        trackLogin('google');
        
        // Persist attribution for Google sign-in on native
        if (data?.user) {
          const attribution = getStoredAttribution();
          const locale = navigator.language || 'en-US';
          const countryCode = locale.split('-')[1] || null;
          
          if (attribution?.utm_source || attribution?.referrer || countryCode) {
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
            }).eq('user_id', data.user.id);
            console.log('[Auth] Google Sign-in attribution and country persisted');
          }
          clearAttribution();
        }
      } else {
        // Web: Use OAuth flow with forced account selection
        console.log('Starting web Google Sign-In with account picker');
        const redirectTo = `${window.location.origin}/auth`;
        console.log('[Auth] Starting web Google Sign-In, redirectTo:', redirectTo);

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            // Redirect back to /auth (unprotected) so the OAuth code exchange can complete
            // without getting interrupted by ProtectedRoute.
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account', // Force account picker every time
            },
          },
        });

        if (error) throw error;
        // OAuth will redirect, so we keep loading state
        return;
      }
      
      // onAuthStateChange will handle navigation for native
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.message?.includes('popup_closed_by_user') || error.message?.includes('canceled')) {
        // User cancelled - don't show error
        console.log('User cancelled Google sign-in');
      } else {
        toast.error(error.message || "Failed to sign in with Google");
      }
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs with zod schema
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
        // Account created - onAuthStateChange will handle navigation
        // Welcome email will be sent in checkOnboardingStatus
        trackSignup('email');
        
        // Persist attribution data and country to the user's profile
        const attribution = getStoredAttribution();
        const locale = navigator.language || 'en-US';
        const countryCode = locale.split('-')[1] || null;
        
        if (signUpData?.user) {
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
          }).eq('user_id', signUpData.user.id);
          console.log('[Auth] Attribution and country data persisted to profile');
        }
        // Clear attribution after successful signup
        clearAttribution();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        // Signed in - onAuthStateChange will handle navigation
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

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">
              {isResettingPassword
                ? "Reset Password"
                : isForgotPassword
                ? "Forgot Password"
                : isSignUp
                ? "Create Account"
                : "Welcome Back"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isResettingPassword
                ? "Enter your new password"
                : isForgotPassword
                ? "We'll send you a reset link"
                : isSignUp
                ? "Join thousands optimizing their health"
                : "Sign in to continue"}
            </p>
          </div>

          {/* Form Container with internal padding */}
          <div className="space-y-6">

        {isResettingPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                  className="pr-10"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                <>{isSignUp ? "Sign Up" : "Sign In"}</>
              )}
            </Button>

            {!Capacitor.isNativePlatform() && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full"
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  Google
                </Button>
              </>
            )}
          </form>
        )}
          </div>

        <div className="mt-6 text-center space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
        {isForgotPassword ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsForgotPassword(false);
              setEmail("");
            }}
            className="w-full"
            disabled={loading}
          >
            Back to sign in
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full"
            disabled={loading}
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"}
          </Button>
        )}
          </div>
        </div>
      </Card>
    </div>
  );
}
