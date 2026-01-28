import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Info } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceDot, XAxis } from 'recharts';
import { format, subDays } from 'date-fns';
import { getHalfLifeData, getTmax } from "@/utils/halfLifeData";
import { calculateMedicationLevels, calculateCurrentLevel, TakenDose } from "@/utils/halfLifeCalculator";
import { formatLevel } from "@/utils/doseUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Capacitor } from '@capacitor/core';

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
}

const STORAGE_KEY = 'selectedLevelsCompound';

export const MedicationLevelsCard = ({ 
  compounds, 
  doses,
  onCompoundChange 
}: MedicationLevelsCardProps) => {
  const navigate = useNavigate();
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null);
  const [levelAnimating, setLevelAnimating] = useState(false);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);

  // Get compounds that have half-life data
  const compoundsWithHalfLife = useMemo(() => {
    return compounds.filter(c => c.is_active && getHalfLifeData(c.name));
  }, [compounds]);

  // Get default compound using tiered logic
  const getDefaultCompound = (): string | null => {
    // 1. User's saved preference (if compound still exists and has half-life data)
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const savedCompound = compoundsWithHalfLife.find(c => c.id === savedId);
      if (savedCompound) {
        return savedCompound.id;
      }
    }
    
    // 2. First active compound with half-life data (alphabetically)
    if (compoundsWithHalfLife.length > 0) {
      const sorted = [...compoundsWithHalfLife].sort((a, b) => a.name.localeCompare(b.name));
      return sorted[0].id;
    }
    
    // 3. Most recently taken dose's compound (if it has half-life data)
    const takenDoses = doses.filter(d => d.taken && d.taken_at);
    if (takenDoses.length > 0) {
      const sorted = [...takenDoses].sort((a, b) => 
        new Date(b.taken_at!).getTime() - new Date(a.taken_at!).getTime()
      );
      const recentCompoundId = sorted[0].compound_id;
      if (recentCompoundId) {
        const compound = compounds.find(c => c.id === recentCompoundId);
        if (compound && getHalfLifeData(compound.name)) {
          return recentCompoundId;
        }
      }
    }
    
    return null;
  };

  // Initialize selected compound
  useEffect(() => {
    if (!selectedCompoundId) {
      const defaultId = getDefaultCompound();
      if (defaultId) {
        setSelectedCompoundId(defaultId);
      }
    }
  }, [compoundsWithHalfLife, doses]);

  // Handle compound change
  const handleCompoundChange = (compoundId: string) => {
    setSelectedCompoundId(compoundId);
    localStorage.setItem(STORAGE_KEY, compoundId);
    onCompoundChange?.(compoundId);
  };

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

  // Convert to TakenDose format for calculations
  const takenDosesForCalc: TakenDose[] = useMemo(() => {
    return compoundDoses.map(d => ({
      id: d.id,
      takenAt: new Date(d.taken_at! + 'Z'),
      amount: d.dose_amount,
      unit: d.dose_unit
    }));
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
      4, // 4 points per day for smooth curve
      true,
      getTmax(halfLifeData)
    );
    
    return levels.map(point => ({
      date: format(point.timestamp, 'MMM d'),
      timestamp: point.timestamp.getTime(),
      level: point.absoluteLevel,
      pastLevel: !point.isFuture ? point.absoluteLevel : null,
      futureLevel: point.isFuture ? point.absoluteLevel : null,
      isFuture: point.isFuture
    }));
  }, [halfLifeData, takenDosesForCalc]);

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
      navigate(`/compound/${selectedCompoundId}`);
    }
  };

  return (
    <div 
      className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent border border-primary/15 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      onClick={handleCardTap}
    >
      <div className="p-3">
        {/* Header with compound selector and Today label */}
        <div className="flex items-center justify-between mb-2">
          <div 
            className="flex-1" 
            onClick={(e) => e.stopPropagation()}
          >
            {compoundsWithHalfLife.length > 1 ? (
              <Select 
                value={selectedCompoundId || ''} 
                onValueChange={handleCompoundChange}
              >
                <SelectTrigger className="w-auto h-7 px-2 py-0.5 text-xs font-medium bg-transparent border-none hover:bg-primary/10 transition-colors [&>svg]:ml-1 [&>svg]:h-3 [&>svg]:w-3">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-primary" />
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
                <Activity className="w-3 h-3 text-primary" />
                <span>{selectedCompound.name}</span>
              </div>
            ) : null}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Today</span>
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="p-1 rounded-full hover:bg-primary/10 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                className="w-56 text-xs bg-popover border border-border p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-muted-foreground">
                  Estimated levels based on half-life. Tap for detailed charts.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Level display - compact inline */}
        {currentLevel && takenDosesForCalc.length > 0 ? (
          <div className="space-y-2">
            {/* Inline stats row */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span 
                className={`text-2xl font-bold text-primary transition-all duration-300 ${
                  levelAnimating ? 'scale-105' : ''
                }`}
              >
                {Math.round(currentLevel.percentOfPeak)}%
              </span>
              <span className="text-xs text-muted-foreground">
                ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
              </span>
              {halfLifeData && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground/70">
                    t½ {formatHalfLife(halfLifeData.halfLifeHours)}
                  </span>
                </>
              )}
            </div>
            
            {/* Enhanced chart with gradients matching CompoundDetailScreenV2 */}
            {chartData.length > 0 && (
              <div className="h-16 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 12 }}>
                    <defs>
                      <linearGradient id="levelGradientPastMini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="levelGradientFutureMini" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="futureStrokeGradientMini" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      </linearGradient>
                      <filter id="currentPointGlowMini" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur">
                          <animate attributeName="stdDeviation" values="2;4;2" dur="2s" repeatCount="indefinite" />
                        </feGaussianBlur>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickMargin={4}
                    />
                    <Area
                      type="monotone"
                      dataKey="pastLevel"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
                      fill="url(#levelGradientPastMini)"
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="futureLevel"
                      stroke="url(#futureStrokeGradientMini)"
                      strokeWidth={1}
                      strokeDasharray="3 2"
                      fill="url(#levelGradientFutureMini)"
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="level"
                      stroke="transparent"
                      strokeWidth={0}
                      fill="transparent"
                      isAnimationActive={false}
                    />
                    {nowIndex >= 0 && nowIndex < chartData.length && chartData[nowIndex] && (
                      <ReferenceDot
                        x={chartData[nowIndex].date}
                        y={chartData[nowIndex].level}
                        r={4}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        filter="url(#currentPointGlowMini)"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-muted-foreground">
            <p>Log doses to track levels</p>
          </div>
        )}
      </div>
    </div>
  );
};
