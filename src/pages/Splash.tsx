import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import wordmark from "@/assets/regimen-wordmark-transparent.png";


export default function Splash() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Splash] Session found, navigating to /today');
        navigate("/today");
      } else {
        console.log('[Splash] No session, showing content in 2.2s');
        // Start animation and show content after 2.2 seconds
        timer = setTimeout(() => {
          console.log('[Splash] Timer fired, showing content');
          setShowContent(true);
        }, 2200);
      }
    }).catch((error) => {
      console.error('[Splash] Session check error:', error);
      // Show content even if session check fails
      timer = setTimeout(() => {
        setShowContent(true);
      }, 2200);
    });

    return () => {
      if (timer) {
        console.log('[Splash] Cleaning up timer');
        clearTimeout(timer);
      }
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-top safe-bottom">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo/Brand */}
        <div className="flex justify-center mb-8">
          <img 
            src={wordmark} 
            alt="REGIMEN" 
            className="w-[220px] h-auto animate-splash-logo"
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
