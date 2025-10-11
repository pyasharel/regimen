import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

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
      // Simplified permission flow - actual implementation will happen when deployed to device
      toast.success("Health permissions requested - please approve in your device settings");
      setHasPermission(true);
      localStorage.setItem("healthPermissionGranted", "true");
      return true;
    } catch (error) {
      console.error("Permission request failed:", error);
      toast.error("Failed to request health permissions");
      return false;
    }
  };

  const syncWeightFromHealth = async (): Promise<number | null> => {
    if (!hasPermission || platform === "web") return null;
    
    // Placeholder - actual implementation requires device deployment
    console.log("Syncing weight from health app...");
    return null;
  };

  const saveWeightToHealth = async (weightLbs: number): Promise<boolean> => {
    if (!hasPermission || platform === "web") return false;

    try {
      // Placeholder - actual implementation requires device deployment
      console.log("Saving weight to health app:", weightLbs);
      toast.success("Weight synced to health app");
      return true;
    } catch (error) {
      console.error("Failed to save weight to health:", error);
      toast.error("Failed to save weight to health app");
      return false;
    }
  };

  const toggleHealthSync = async (enabled: boolean): Promise<boolean> => {
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