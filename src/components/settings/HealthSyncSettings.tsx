import { Activity } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useHealthIntegration } from "@/hooks/useHealthIntegration";

export const HealthSyncSettings = () => {
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

  if (platform === "web") {
    return (
      <div className="space-y-4">
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
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label htmlFor="health-sync" className="font-medium">
              Sync with {getPlatformName()}
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync your weight data with {getPlatformName()}
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
  );
};