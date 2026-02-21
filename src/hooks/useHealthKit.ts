import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  CapacitorHealthkit,
  type OtherData,
  type SleepData,
  SampleNames,
} from "@perfood/capacitor-healthkit";
import { supabase } from "@/integrations/supabase/client";
import { getUserIdWithFallback } from "@/utils/safeAuth";

const HEALTHKIT_READ_TYPES = [
  "weight",
  "bodyFat",
  "restingHeartRate",
  "activity", // includes sleepAnalysis in plugin
];

function getDateRangeLast30Days(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * React hook for Apple HealthKit integration via @perfood/capacitor-healthkit.
 * All native calls are guarded with Capacitor.isNativePlatform() (iOS only).
 */
export function useHealthKit() {
  /**
   * Checks if HealthKit is available (native iOS only).
   */
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    try {
      await CapacitorHealthkit.isAvailable();
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Requests read access for weight, body fat %, lean body mass, sleep analysis,
   * resting heart rate, and heart rate variability (SDNN).
   */
  const requestPermission = useCallback(async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    await CapacitorHealthkit.requestAuthorization({
      read: HEALTHKIT_READ_TYPES,
      write: [],
      all: [],
    });
  }, []);

  /**
   * Reads weight samples from the last 30 days.
   * Plugin returns value in kg; unitName is "kilogram".
   */
  const readWeight = useCallback(
    async (): Promise<Array<{ date: string; value: number; unit: string }>> => {
      if (!Capacitor.isNativePlatform()) return [];
      const { startDate, endDate } = getDateRangeLast30Days();
      try {
        const { resultData } = await CapacitorHealthkit.queryHKitSampleType<
          OtherData
        >({
          sampleName: SampleNames.WEIGHT,
          startDate,
          endDate,
          limit: 0,
        });
        return (resultData ?? []).map((s) => ({
          date: s.startDate.slice(0, 10),
          value: s.value,
          unit: s.unitName ?? "kilogram",
        }));
      } catch (e) {
        console.warn("[useHealthKit] readWeight failed:", e);
        return [];
      }
    },
    []
  );

  /**
   * Reads body fat % from the last 30 days.
   */
  const readBodyFat = useCallback(
    async (): Promise<Array<{ date: string; value: number }>> => {
      if (!Capacitor.isNativePlatform()) return [];
      const { startDate, endDate } = getDateRangeLast30Days();
      try {
        const { resultData } = await CapacitorHealthkit.queryHKitSampleType<
          OtherData
        >({
          sampleName: SampleNames.BODY_FAT,
          startDate,
          endDate,
          limit: 0,
        });
        return (resultData ?? []).map((s) => ({
          date: s.startDate.slice(0, 10),
          value: s.value,
        }));
      } catch (e) {
        console.warn("[useHealthKit] readBodyFat failed:", e);
        return [];
      }
    },
    []
  );

  /**
   * Reads lean body mass from the last 30 days.
   * Note: @perfood/capacitor-healthkit does not expose leanBodyMass; returns [] on iOS.
   */
  const readLeanBodyMass = useCallback(
    async (): Promise<Array<{ date: string; value: number; unit: string }>> => {
      if (!Capacitor.isNativePlatform()) return [];
      // Plugin has no SampleNames.LEAN_BODY_MASS; would require plugin extension
      return [];
    },
    []
  );

  /**
   * Reads sleep analysis from the last 30 days.
   * Total sleep hours = sum of durations where sleepState === "Asleep".
   * Plugin returns "InBed" | "Asleep" (no asleepCore/asleepDeep/asleepREM breakdown).
   */
  const readSleep = useCallback(
    async (): Promise<
      Array<{ date: string; hours: number; quality?: string }>
    > => {
      if (!Capacitor.isNativePlatform()) return [];
      const { startDate, endDate } = getDateRangeLast30Days();
      try {
        const { resultData } = await CapacitorHealthkit.queryHKitSampleType<
          SleepData
        >({
          sampleName: SampleNames.SLEEP_ANALYSIS,
          startDate,
          endDate,
          limit: 0,
        });
        const byDay: Record<string, number> = {};
        for (const s of resultData ?? []) {
          if (s.sleepState !== "Asleep") continue;
          const date = s.startDate.slice(0, 10);
          byDay[date] = (byDay[date] ?? 0) + (s.duration ?? 0);
        }
        return Object.entries(byDay).map(([date, hours]) => ({
          date,
          hours,
        }));
      } catch (e) {
        console.warn("[useHealthKit] readSleep failed:", e);
        return [];
      }
    },
    []
  );

  /**
   * Reads resting heart rate from the last 30 days (bpm).
   */
  const readRestingHeartRate = useCallback(
    async (): Promise<Array<{ date: string; value: number }>> => {
      if (!Capacitor.isNativePlatform()) return [];
      const { startDate, endDate } = getDateRangeLast30Days();
      try {
        const { resultData } = await CapacitorHealthkit.queryHKitSampleType<
          OtherData
        >({
          sampleName: SampleNames.RESTING_HEART_RATE,
          startDate,
          endDate,
          limit: 0,
        });
        return (resultData ?? []).map((s) => ({
          date: s.startDate.slice(0, 10),
          value: s.value,
        }));
      } catch (e) {
        console.warn("[useHealthKit] readRestingHeartRate failed:", e);
        return [];
      }
    },
    []
  );

  /**
   * Reads heart rate variability from the last 30 days (ms).
   * iOS uses SDNN; Android (Health Connect) uses RMSSD — measurement_type marks which.
   * Note: @perfood/capacitor-healthkit does not expose HRV; returns [] on iOS.
   */
  const readHRV = useCallback(
    async (): Promise<
      Array<{ date: string; value: number; measurement_type: "sdnn" | "rmssd" }>
    > => {
      if (!Capacitor.isNativePlatform()) return [];
      // Plugin has no heartRateVariabilitySDNN; would require plugin extension. Android would use RMSSD.
      return [];
    },
    []
  );

  /**
   * Syncs all health data into progress_entries.
   * Upserts by (user_id, entry_date, category). metrics include source: "healthkit".
   */
  const syncToProgress = useCallback(async (): Promise<void> => {
    const userId = await getUserIdWithFallback(3000);
    if (!userId) throw new Error("Not authenticated");

    const [weightData, bodyFatData, leanMassData, sleepData, restingHRData, hrvData] =
      await Promise.all([
        readWeight(),
        readBodyFat(),
        readLeanBodyMass(),
        readSleep(),
        readRestingHeartRate(),
        readHRV(),
      ]);

    const rows: Array<{
      user_id: string;
      entry_date: string;
      category: string;
      metrics: Record<string, unknown> & { source: "healthkit" };
    }> = [];

    for (const e of weightData) {
      rows.push({
        user_id: userId,
        entry_date: e.date,
        category: "weight",
        metrics: { weight: e.value, unit: e.unit, source: "healthkit" },
      });
    }
    for (const e of bodyFatData) {
      rows.push({
        user_id: userId,
        entry_date: e.date,
        category: "body_fat",
        metrics: { body_fat_percentage: e.value, source: "healthkit" },
      });
    }
    for (const e of leanMassData) {
      rows.push({
        user_id: userId,
        entry_date: e.date,
        category: "lean_mass",
        metrics: {
          lean_body_mass: e.value,
          unit: e.unit,
          source: "healthkit",
        },
      });
    }
    for (const e of sleepData) {
      rows.push({
        user_id: userId,
        entry_date: e.date,
        category: "sleep",
        metrics: { sleep_hours: e.hours, source: "healthkit" },
      });
    }
    for (const e of restingHRData) {
      rows.push({
        user_id: userId,
        entry_date: e.date,
        category: "resting_hr",
        metrics: { resting_hr_bpm: e.value, source: "healthkit" },
      });
    }
    for (const e of hrvData) {
      rows.push({
        user_id: userId,
        entry_date: e.date,
        category: "hrv",
        metrics: {
          hrv_ms: e.value,
          measurement_type: e.measurement_type,
          source: "healthkit",
        },
      });
    }

    if (rows.length === 0) return;

    const { error } = await supabase
      .from("progress_entries")
      .upsert(rows, { onConflict: "user_id,entry_date,category" });

    if (error) throw error;
  }, [
    readWeight,
    readBodyFat,
    readLeanBodyMass,
    readSleep,
    readRestingHeartRate,
    readHRV,
  ]);

  return {
    checkAvailability,
    requestPermission,
    readWeight,
    readBodyFat,
    readLeanBodyMass,
    readSleep,
    readRestingHeartRate,
    readHRV,
    syncToProgress,
  };
}
