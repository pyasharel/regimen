import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import wordmark from "@/assets/regimen-wordmark-transparent.png";


export default function Splash() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/today");
      } else {
        // Start animation and show content after 1.8 seconds
        const timer = setTimeout(() => {
          setShowContent(true);
        }, 1800);
        return () => clearTimeout(timer);
      }
    });
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
                onClick={() => navigate("/auth?mode=signup")}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full"
                onClick={() => navigate("/auth?mode=signin")}
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
