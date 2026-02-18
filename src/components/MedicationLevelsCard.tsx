import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceDot, XAxis, YAxis, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { getHalfLifeData, getTmax } from "@/utils/halfLifeData";
import { calculateMedicationLevels, calculateCurrentLevel, TakenDose } from "@/utils/halfLifeCalculator";
import { persistentStorage } from "@/utils/persistentStorage";
import { formatLevel } from "@/utils/doseUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
interface Compound {
  id: string;
  name: string;
  is_active: boolean | null;
  dose_unit: string;
}

interface Dose {
  id: string;
  compound_id: string | null;
  dose_amount: number;
  dose_unit: string;
  taken: boolean | null;
  taken_at: string | null;
  scheduled_date: string;
}

interface MedicationLevelsCardProps {
  compounds: Compound[];
  doses: Dose[];
  onCompoundChange?: (compoundId: string) => void;
  switchToCompoundId?: string | null;
}

const STORAGE_KEY = 'selectedLevelsCompound';
const COLLAPSED_KEY = 'medicationLevelsCollapsed';

// Y-axis formatting helpers (ported from CompoundDetailScreenV2)
const formatYAxis = (value: number) => {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  if (value >= 10) return Math.round(value).toString();
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
};

const getAxisMax = (max: number) => {
  if (max <= 0) return 1;
  if (max < 1) return Math.ceil(max * 10) / 10;
  if (max < 10) return Math.ceil(max);
  if (max < 50) return Math.ceil(max / 5) * 5;
  if (max < 100) return Math.ceil(max / 10) * 10;
  if (max < 500) return Math.ceil(max / 25) * 25;
  if (max < 1000) return Math.ceil(max / 50) * 50;
  return Math.ceil(max / 100) * 100;
};

/**
 * Safely parse a database timestamp into a Date object
 * Handles both ISO format (with T) and Postgres format (with space)
 * Returns null if parsing fails or results in invalid date
 */
const parseTakenAt = (takenAt: string | null): Date | null => {
  if (!takenAt) return null;
  
  try {
    let dateStr = takenAt;
    
    // Postgres timestamps may come as "YYYY-MM-DD HH:mm:ss" (space instead of T)
    // iOS WebKit is strict and only reliably parses ISO 8601
    if (!dateStr.includes('T') && dateStr.includes(' ')) {
      dateStr = dateStr.replace(' ', 'T');
    }
    
    // Ensure timezone suffix exists
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      dateStr = dateStr + 'Z';
    }
    
    const date = new Date(dateStr);
    
    // Validate the parsed date
    if (isNaN(date.getTime()) || !Number.isFinite(date.getTime())) {
      console.warn('[MedicationLevelsCard] Invalid date parsed:', takenAt);
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('[MedicationLevelsCard] Failed to parse date:', takenAt, error);
    return null;
  }
};

export const MedicationLevelsCard = ({ 
  compounds, 
  doses,
  onCompoundChange,
  switchToCompoundId
}: MedicationLevelsCardProps) => {
  const navigate = useNavigate();
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);
  const [levelAnimating, setLevelAnimating] = useState(false);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  
  // Collapsible state with localStorage for instant load, Capacitor Preferences for persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved === 'true';
  });
  
  const toggleCollapsed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    // Write to both: localStorage (instant) and Capacitor Preferences (persistent)
    localStorage.setItem(COLLAPSED_KEY, String(newValue));
    persistentStorage.set(COLLAPSED_KEY, String(newValue));
  };
  
  // Sync collapsed state from Capacitor Preferences on mount
  useEffect(() => {
    const syncCollapsedState = async () => {
      const saved = await persistentStorage.get(COLLAPSED_KEY);
      if (saved !== null) {
        const wasCollapsed = saved === 'true';
        setIsCollapsed(wasCollapsed);
        // Sync localStorage for next instant load
        localStorage.setItem(COLLAPSED_KEY, saved);
      }
    };
    syncCollapsedState();
  }, []);
  // Get compounds that have half-life data
  const compoundsWithHalfLife = useMemo(() => {
    return compounds.filter(c => c.is_active && getHalfLifeData(c.name));
  }, [compounds]);

  // Track whether we've initialized the selection (prevents re-running on dose changes)
  const hasInitialized = useRef(false);
  // Track if current selection is a temporary auto-switch (not the user's saved preference)
  const isTemporaryDefault = useRef(false);

  // Helper: check if a compound has any taken doses
  const compoundHasTakenDoses = (compoundId: string): boolean => {
    return doses.some(d => d.compound_id === compoundId && d.taken && d.taken_at);
  };

  // Find the best compound that actually has taken doses (most recent dose wins)
  const findCompoundWithDoses = (): string | null => {
    const takenDoses = doses.filter(d => d.taken && d.taken_at);
    if (takenDoses.length === 0) return null;
    
    const sorted = [...takenDoses].sort((a, b) => 
      new Date(b.taken_at!).getTime() - new Date(a.taken_at!).getTime()
    );
    
    for (const dose of sorted) {
      if (dose.compound_id) {
        const compound = compoundsWithHalfLife.find(c => c.id === dose.compound_id);
        if (compound) return compound.id;
      }
    }
    return null;
  };

  // Fallback default logic (used when no persisted preference exists)
  const getFallbackCompound = (): string | null => {
    // 1. Use most recently taken (smart default for new users)
    const withDoses = findCompoundWithDoses();
    if (withDoses) return withDoses;
    
    // 2. First active compound with half-life data (alphabetical fallback)
    if (compoundsWithHalfLife.length > 0) {
      const sorted = [...compoundsWithHalfLife].sort((a, b) => a.name.localeCompare(b.name));
      return sorted[0].id;
    }
    
    return null;
  };

  // Initialize selected compound from persistent storage on mount
  // Priority: Saved pref (if has doses) > auto-switch to compound with doses > saved pref anyway > fallback
  useEffect(() => {
    if (hasInitialized.current || compoundsWithHalfLife.length === 0) return;
    
    const initializeSelection = async () => {
      // 1. Try Capacitor Preferences first (survives app updates)
      let savedId: string | null = await persistentStorage.get(STORAGE_KEY);
      
      // 2. Fallback to localStorage (web fast path)
      if (!savedId) {
        savedId = localStorage.getItem(STORAGE_KEY);
      }
      
      // Validate saved compound still exists with half-life data
      if (savedId) {
        const compound = compoundsWithHalfLife.find(c => c.id === savedId);
        if (!compound) {
          // Compound no longer exists - clear stale preference
          persistentStorage.remove(STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY);
          savedId = null;
        }
      }
      
      hasInitialized.current = true;
      
      if (savedId) {
        // Saved preference exists and compound is valid
        if (compoundHasTakenDoses(savedId)) {
          // Has doses - use it directly
          isTemporaryDefault.current = false;
          setSelectedCompoundId(savedId);
        } else {
          // Saved pref has NO doses - try to temporarily show one that does
          const withDoses = findCompoundWithDoses();
          if (withDoses) {
            // Temporarily show compound with data, but DON'T overwrite saved preference
            isTemporaryDefault.current = true;
            setSelectedCompoundId(withDoses);
          } else {
            // No compound has doses - just show saved pref
            isTemporaryDefault.current = false;
            setSelectedCompoundId(savedId);
          }
        }
        // Sync to both storages
        localStorage.setItem(STORAGE_KEY, savedId);
        persistentStorage.set(STORAGE_KEY, savedId);
      } else {
        // No saved preference - use fallback logic
        isTemporaryDefault.current = false;
        const fallbackId = getFallbackCompound();
        if (fallbackId) {
          setSelectedCompoundId(fallbackId);
        }
      }
    };
    
    initializeSelection();
  }, [compoundsWithHalfLife, doses]);

  // Handle compound change - explicit user selection, always persist
  const handleCompoundChange = (compoundId: string) => {
    isTemporaryDefault.current = false; // User made an explicit choice
    setSelectedCompoundId(compoundId);
    // Write to both: localStorage (instant) and Capacitor Preferences (persistent across updates)
    localStorage.setItem(STORAGE_KEY, compoundId);
    persistentStorage.set(STORAGE_KEY, compoundId);
    onCompoundChange?.(compoundId);
  };

  // External switch: when a dose is marked as taken, auto-switch to that compound
  useEffect(() => {
    if (!switchToCompoundId) return;
    
    // Only switch if the compound has half-life data
    const exists = compoundsWithHalfLife.find(c => c.id === switchToCompoundId);
    if (!exists) return;
    
    // Already selected - no jarring switch needed
    if (selectedCompoundId === switchToCompoundId) return;
    
    // Switch to the compound (don't persist - this is a temporary contextual switch)
    isTemporaryDefault.current = true;
    setSelectedCompoundId(switchToCompoundId);
    
    // Auto-expand if collapsed
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem(COLLAPSED_KEY, 'false');
      persistentStorage.set(COLLAPSED_KEY, 'false');
    }
  }, [switchToCompoundId, compoundsWithHalfLife, selectedCompoundId, isCollapsed]);

  // Get selected compound data
  const selectedCompound = useMemo(() => {
    return compounds.find(c => c.id === selectedCompoundId);
  }, [compounds, selectedCompoundId]);

  const halfLifeData = selectedCompound ? getHalfLifeData(selectedCompound.name) : null;

  // Get doses for selected compound
  const compoundDoses = useMemo(() => {
    if (!selectedCompoundId) return [];
    return doses.filter(d => 
      d.compound_id === selectedCompoundId && 
      d.taken && 
      d.taken_at
    );
  }, [doses, selectedCompoundId]);

  // Convert to TakenDose format for calculations with robust date parsing
  const takenDosesForCalc: TakenDose[] = useMemo(() => {
    const validDoses: TakenDose[] = [];
    
    for (const d of compoundDoses) {
      const parsedDate = parseTakenAt(d.taken_at);
      
      // Skip doses with invalid dates
      if (!parsedDate) {
        console.warn('[MedicationLevelsCard] Skipping dose with invalid taken_at:', d.id, d.taken_at);
        continue;
      }
      
      validDoses.push({
        id: d.id,
        takenAt: parsedDate,
        amount: d.dose_amount,
        unit: d.dose_unit
      });
    }
    
    return validDoses;
  }, [compoundDoses]);

  // Calculate current level
  const currentLevel = useMemo(() => {
    if (!halfLifeData || takenDosesForCalc.length === 0) return null;
    return calculateCurrentLevel(
      takenDosesForCalc, 
      halfLifeData.halfLifeHours, 
      getTmax(halfLifeData)
    );
  }, [halfLifeData, takenDosesForCalc]);

  // Trigger animation when level changes
  useEffect(() => {
    if (currentLevel && previousLevel !== null && currentLevel.percentOfPeak !== previousLevel) {
      setLevelAnimating(true);
      const timeout = setTimeout(() => setLevelAnimating(false), 300);
      return () => clearTimeout(timeout);
    }
    if (currentLevel) {
      setPreviousLevel(currentLevel.percentOfPeak);
    }
  }, [currentLevel?.percentOfPeak]);

  // Generate chart data (7 days back + 3 days projection) with past/future split
  const chartData = useMemo(() => {
    if (!halfLifeData || takenDosesForCalc.length === 0) return [];
    
    const now = new Date();
    const startDate = subDays(now, 7);
    const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead
    
    const levels = calculateMedicationLevels(
      takenDosesForCalc,
      halfLifeData.halfLifeHours,
      startDate,
      endDate,
      24, // 24 points per day for smooth curve (matching My Stack)
      true,
      getTmax(halfLifeData)
    );
    
    // Calculate max level for percentage calculation
    const maxLevel = Math.max(...levels.map(p => p.absoluteLevel), 0.001);
    
    return levels.map(point => ({
      date: format(point.timestamp, 'MMM d'),
      timestamp: point.timestamp.getTime(),
      level: point.absoluteLevel,
      absoluteLevelFormatted: formatLevel(point.absoluteLevel),
      percentOfPeak: Math.round((point.absoluteLevel / maxLevel) * 100),
      pastLevel: !point.isFuture ? point.absoluteLevel : null,
      futureLevel: point.isFuture ? point.absoluteLevel : null,
      isFuture: point.isFuture
    }));
  }, [halfLifeData, takenDosesForCalc]);

  // Calculate Y-axis max from chart data
  const maxAbsoluteLevel = chartData.length > 0 
    ? Math.max(...chartData.map(p => p.level)) 
    : 0;
  const yAxisMax = getAxisMax(maxAbsoluteLevel * 1.1);

  // Find current point index for reference dot
  const nowIndex = useMemo(() => {
    const now = Date.now();
    let closestIndex = 0;
    let closestDiff = Infinity;
    
    chartData.forEach((point, index) => {
      const diff = Math.abs(point.timestamp - now);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }, [chartData]);

  // Format half-life for display
  const formatHalfLife = (hours: number): string => {
    if (hours >= 168) return `~${Math.round(hours / 168)}w`;
    if (hours >= 24) return `~${Math.round(hours / 24)}d`;
    return `~${Math.round(hours)}h`;
  };

  // Don't render if no compounds with half-life data
  if (compoundsWithHalfLife.length === 0) {
    return null;
  }

  // Navigate to compound detail
  const handleCardTap = () => {
    if (selectedCompoundId) {
      navigate(`/stack-v2/${selectedCompoundId}`);
    }
  };

  return (
    <Collapsible open={!isCollapsed}>
      <div 
        className="mx-4 mt-3 mb-4 rounded-2xl bg-card border border-border overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
        onClick={handleCardTap}
      >
        {/* Single header row with compound selector, current level (when collapsed), and chevron */}
        <div className="flex items-center justify-between px-3 pt-1.5 pb-0">
          <div 
            className="flex-shrink-0 flex items-center gap-2" 
            onClick={(e) => e.stopPropagation()}
          >
            {compoundsWithHalfLife.length > 1 ? (
              <Select 
                value={selectedCompoundId || ''} 
                onValueChange={handleCompoundChange}
              >
                <SelectTrigger className="w-auto h-7 px-2.5 py-0.5 text-xs font-medium bg-muted/50 border border-border/40 rounded-full hover:bg-muted transition-colors [&>svg]:ml-1 [&>svg]:h-3 [&>svg]:w-3">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <SelectValue placeholder="Select medication" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {compoundsWithHalfLife.map(compound => (
                    <SelectItem key={compound.id} value={compound.id} className="text-sm">
                      {compound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : selectedCompound ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span>{selectedCompound.name}</span>
              </div>
            ) : null}
            
            {/* Show current level when collapsed for glanceable data */}
            {isCollapsed && currentLevel && selectedCompound && (
              <span className="text-xs text-muted-foreground">
                ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound.dose_unit}
              </span>
            )}
          </div>
          
          {/* Chevron only in header */}
          <button 
            onClick={toggleCollapsed}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expand chart" : "Collapse chart"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Collapsible Chart area with overlaid stats */}
        <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="relative px-3 pb-1.5">
            {/* Stats overlay - positioned in top-right of chart area */}
            <div className="absolute top-0 right-4 z-10 flex flex-col items-end gap-0 bg-card/80 backdrop-blur-sm rounded pl-2 pb-1">
              {/* Now label */}
              <span className="text-[10px] text-muted-foreground font-medium">Now</span>
              
              {/* Current level (emphasized) */}
              {currentLevel && (
                <span className="text-xs font-medium text-foreground">
                  ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
                </span>
              )}
              
              {/* Half-life (muted) */}
              {halfLifeData && (
                <span className="text-[10px] text-muted-foreground">
                  t½ {formatHalfLife(halfLifeData.halfLifeHours)}
                </span>
              )}
            </div>
            {currentLevel && takenDosesForCalc.length > 0 ? (
              <div>
                {/* Chart with Y-axis - ported from CompoundDetailScreenV2 */}
                {chartData.length > 0 && (
                  <div className="h-28 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                          {/* Exact gradients from CompoundDetailScreenV2 */}
                          <linearGradient id="levelGradientPastCard" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="levelGradientFutureCard" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                            <stop offset="40%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="futureStrokeGradientCard" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                          </linearGradient>
                          <filter id="currentPointGlowCard" x="-100%" y="-100%" width="300%" height="300%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur">
                              <animate attributeName="stdDeviation" values="3;6;3" dur="2s" repeatCount="indefinite" />
                            </feGaussianBlur>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <YAxis 
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, yAxisMax]}
                          tickFormatter={formatYAxis}
                          width={28}
                          tickCount={4}
                        />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          interval={Math.floor(chartData.length / 4)}
                          tickMargin={4}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                  <p className="text-xs text-muted-foreground mb-0.5">
                                    {data.date} {data.isFuture && <span className="text-primary/60">(projected)</span>}
                                  </p>
                                  <p className="text-sm font-semibold text-primary">
                                    ~{data.absoluteLevelFormatted} {selectedCompound?.dose_unit}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {data.percentOfPeak}% of peak
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Past levels - solid line */}
                        <Area
                          type="monotone"
                          dataKey="pastLevel"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#levelGradientPastCard)"
                          isAnimationActive={false}
                          connectNulls={false}
                        />
                        {/* Future levels - dotted line */}
                        <Area
                          type="monotone"
                          dataKey="futureLevel"
                          stroke="url(#futureStrokeGradientCard)"
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                          fill="url(#levelGradientFutureCard)"
                          isAnimationActive={false}
                          connectNulls={false}
                        />
                        {/* Hidden area for tooltip interaction */}
                        <Area
                          type="monotone"
                          dataKey="level"
                          stroke="transparent"
                          strokeWidth={0}
                          fill="transparent"
                          isAnimationActive={false}
                        />
                        {/* Current point with animated glow */}
                        {nowIndex >= 0 && nowIndex < chartData.length && chartData[nowIndex] && (
                          <ReferenceDot
                            x={chartData[nowIndex].date}
                            y={chartData[nowIndex].level}
                            r={6}
                            fill="hsl(var(--primary))"
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                            filter="url(#currentPointGlowCard)"
                          >
                            <animate
                              attributeName="opacity"
                              values="1;0.7;1"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          </ReferenceDot>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                <p>Log doses to track levels</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
