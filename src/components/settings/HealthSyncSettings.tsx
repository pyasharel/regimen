import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useHealthIntegration } from "@/hooks/useHealthIntegration";
import { useNavigate } from "react-router-dom";

export const HealthSyncSettings = () => {
  const navigate = useNavigate();
  const { platform, isEnabled, toggleHealthSync } = useHealthIntegration();

  const handleToggle = async (checked: boolean) => {
    await toggleHealthSync(checked);
  };

  const getPlatformName = () => {
    switch (platform) {
      case "ios":
        return "Apple Health";
      case "android":
        return "Google Health Connect";
      default:
        return "Health App";
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border px-4 py-4 bg-background/95 backdrop-blur-sm safe-top">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Health Sync</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {platform === "web" ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Health Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Health integration requires a mobile device
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="health-sync" className="font-medium">
                      Sync with {getPlatformName()}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync your weight data
                    </p>
                  </div>
                </div>
                <Switch
                  id="health-sync"
                  checked={isEnabled}
                  onCheckedChange={handleToggle}
                />
              </div>
            </div>

            {isEnabled && (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="font-medium mb-2">How it works</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>When you log weight in Regimen, it syncs to {getPlatformName()}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>Your health data stays private and secure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>You can disable sync anytime</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};