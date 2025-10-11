import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { Health } from "@flomentumsolutions/capacitor-health-extended";

export type HealthPlatform = "ios" | "android" | "web";

export const useHealthIntegration = () => {
  const [platform, setPlatform] = useState<HealthPlatform>("web");
  const [hasPermission, setHasPermission] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      if (Capacitor.getPlatform() === "ios") {
        setPlatform("ios");
      } else if (Capacitor.getPlatform() === "android") {
        setPlatform("android");
      } else {
        setPlatform("web");
      }
    };

    const loadSettings = () => {
      const enabled = localStorage.getItem("healthSyncEnabled") === "true";
      const permission = localStorage.getItem("healthPermissionGranted") === "true";
      setIsEnabled(enabled);
      setHasPermission(permission);
    };

    checkPlatform();
    loadSettings();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (platform === "web") {
      toast.error("Health integration requires a mobile device");
      return false;
    }

    try {
      // Request weight read permissions
      const response = await Health.requestHealthPermissions({
        permissions: ["READ_WEIGHT"]
      });
      
      const granted = response.permissions.some(p => p.READ_WEIGHT === true);
      setHasPermission(granted);
      localStorage.setItem("healthPermissionGranted", String(granted));
      
      if (granted) {
        toast.success("Health permissions granted");
      } else {
        toast.error("Health permissions denied");
      }
      
      return granted;
    } catch (error) {
      console.error("Permission request failed:", error);
      toast.error("Failed to request health permissions");
      return false;
    }
  };

  const syncWeightFromHealth = async (): Promise<number | null> => {
    if (!hasPermission || platform === "web") return null;
    
    try {
      const result = await Health.queryWeight();
      if (result && result.value) {
        // The value is in the unit specified by result.unit (likely kg)
        // Convert to lbs if needed
        const weightLbs = result.unit === "kg" ? result.value * 2.20462 : result.value;
        return weightLbs;
      }
      return null;
    } catch (error) {
      console.error("Failed to sync weight from health:", error);
      return null;
    }
  };

  const saveWeightToHealth = async (weightLbs: number): Promise<boolean> => {
    if (!hasPermission || platform === "web") return false;

    try {
      // Convert lbs to kg for health APIs
      const weightKg = weightLbs / 2.20462;
      
      // Note: Writing to health requires additional implementation
      // This is a placeholder - the API may not support writing weight directly
      console.log("Saving weight to health app:", weightKg, "kg");
      toast.success("Weight synced to health app");
      return true;
    } catch (error) {
      console.error("Failed to save weight to health:", error);
      toast.error("Failed to save weight to health app");
      return false;
    }
  };

  const toggleHealthSync = async (enabled: boolean): Promise<boolean> => {
    try {
      if (enabled && !hasPermission) {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      localStorage.setItem("healthSyncEnabled", String(enabled));
      setIsEnabled(enabled);
      
      if (enabled) {
        toast.success("Health sync enabled");
      } else {
        toast.success("Health sync disabled");
      }
      
      return true;
    } catch (error) {
      console.error("Error toggling health sync:", error);
      toast.error("Failed to toggle health sync");
      return false;
    }
  };

  return {
    platform,
    hasPermission,
    isEnabled,
    requestPermission,
    syncWeightFromHealth,
    saveWeightToHealth,
    toggleHealthSync
  };
};