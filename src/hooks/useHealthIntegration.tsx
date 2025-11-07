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
    toast.error("Health sync is currently disabled");
    return false;
  };

  const syncWeightFromHealth = async (): Promise<number | null> => {
    return null;
  };

  const saveWeightToHealth = async (weightLbs: number): Promise<boolean> => {
    return false;
  };

  const toggleHealthSync = async (enabled: boolean): Promise<boolean> => {
    toast.error("Health sync is currently disabled");
    return false;
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