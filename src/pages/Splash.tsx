import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";


export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/today");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo/Brand */}
        <div className="flex justify-center mb-8">
          <h1 className="text-6xl font-bold tracking-tight text-foreground">
            REGIMEN
          </h1>
        </div>

        {/* Tagline */}
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-foreground">
            Track everything, reach your goals
          </h2>
          <p className="text-lg text-muted-foreground">
            Take the guesswork out of dosing, timing, and cycles
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left bg-card/50 rounded-lg p-6 border border-border">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-muted-foreground">Handle complex cycles and titration schedules</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-muted-foreground">Never miss a dose or wonder when to cycle off</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-muted-foreground">Track what matters and understand what's working</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pt-4">
          <Button 
            size="lg" 
            className="w-full"
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
      </div>
    </div>
  );
}
