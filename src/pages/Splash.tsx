import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import wordmark from "@/assets/regimen-wordmark-transparent.png";
import { Capacitor } from "@capacitor/core";


export default function Splash() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let failsafeTimer: NodeJS.Timeout | null = null;
    let hasNavigated = false;
    
    console.log('[Splash] Component mounted, checking session, isNative:', isNative);
    
    // Failsafe: Show content faster on native (1s) vs web (3s)
    const failsafeDelay = isNative ? 1000 : 3000;
    failsafeTimer = setTimeout(() => {
      console.log('[Splash] Failsafe triggered - showing content regardless');
      setShowContent(true);
    }, failsafeDelay);
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !hasNavigated) {
        console.log('[Splash] Session found, navigating to /today');
        hasNavigated = true;
        if (failsafeTimer) clearTimeout(failsafeTimer);
        navigate("/today", { replace: true });
      } else if (!session) {
        // Skip animation on native, show content immediately
        const contentDelay = isNative ? 0 : 2200;
        console.log('[Splash] No session, showing content after', contentDelay, 'ms');
        timer = setTimeout(() => {
          console.log('[Splash] Timer fired, showing content');
          if (failsafeTimer) clearTimeout(failsafeTimer);
          setShowContent(true);
        }, contentDelay);
      }
    }).catch((error) => {
      console.error('[Splash] Session check error:', error);
      // Show content immediately on native, with delay on web
      if (!timer) {
        const contentDelay = isNative ? 0 : 2200;
        timer = setTimeout(() => {
          if (failsafeTimer) clearTimeout(failsafeTimer);
          setShowContent(true);
        }, contentDelay);
      }
    });

    return () => {
      if (timer) {
        console.log('[Splash] Cleaning up timer');
        clearTimeout(timer);
      }
      if (failsafeTimer) {
        console.log('[Splash] Cleaning up failsafe timer');
        clearTimeout(failsafeTimer);
      }
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo/Brand - Skip animation on native */}
        <div className="flex justify-center mb-8">
          <img 
            src={wordmark} 
            alt="REGIMEN" 
            className={`w-[220px] h-auto ${isNative ? '' : 'animate-splash-logo'}`}
          />
        </div>

        {/* Content - fades in after animation */}
        {showContent && (
          <>
            {/* Headline */}
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-[36px] font-bold text-white leading-tight mb-4">
                Track your stack. See what's working.
              </h1>
              <p className="text-[18px] text-[#9CA3AF] mb-10">
                Smart tracking, precise calculations, and progress analytics in one app
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 text-left rounded-lg p-6 border border-[#2A2A2A] animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FF6F61] mt-2 flex-shrink-0" />
                <p className="text-base text-white">Precise dosing calculator with unit conversions</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FF6F61] mt-2 flex-shrink-0" />
                <p className="text-base text-white">Automated cycle management and reminders</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#FF6F61] mt-2 flex-shrink-0" />
                <p className="text-base text-white">Visualize progress with photos and analytics</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-4 animate-fade-in">
            <Button 
              variant="gradient"
              className="w-full h-[56px] text-[18px] rounded-xl"
              onClick={() => {
                console.log('[Splash] Get Started clicked, navigating to /auth?mode=signup');
                navigate("/auth?mode=signup");
              }}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full"
              onClick={() => {
                console.log('[Splash] Sign In clicked, navigating to /auth?mode=signin');
                navigate("/auth?mode=signin");
              }}
            >
              Already have an account? Sign In
            </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
