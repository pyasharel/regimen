import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Activity, Info } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceDot } from 'recharts';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const isMobile = Capacitor.isNativePlatform();

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
      const timeout = setTimeout(() => setLevelAnimating(false), 600);
      return () => clearTimeout(timeout);
    }
    if (currentLevel) {
      setPreviousLevel(currentLevel.percentOfPeak);
    }
  }, [currentLevel?.percentOfPeak]);

  // Generate sparkline data (7 days back + 3 days projection)
  const sparklineData = useMemo(() => {
    if (!halfLifeData || takenDosesForCalc.length === 0) return [];
    
    const now = new Date();
    const startDate = subDays(now, 7);
    const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead
    
    const levels = calculateMedicationLevels(
      takenDosesForCalc,
      halfLifeData.halfLifeHours,
      startDate,
      endDate,
      6, // 6 points per day for smooth curve
      true,
      getTmax(halfLifeData)
    );
    
    // Find max level for percentage calculation
    const maxLevel = Math.max(...levels.map(l => l.absoluteLevel), 0.001);
    
    return levels.map(point => ({
      timestamp: point.timestamp.getTime(),
      level: point.absoluteLevel,
      percentage: (point.absoluteLevel / maxLevel) * 100,
      isFuture: point.isFuture
    }));
  }, [halfLifeData, takenDosesForCalc]);

  // Find current point in sparkline for reference dot
  const currentPointIndex = useMemo(() => {
    const now = Date.now();
    let closestIndex = 0;
    let closestDiff = Infinity;
    
    sparklineData.forEach((point, index) => {
      const diff = Math.abs(point.timestamp - now);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }, [sparklineData]);

  // Format half-life for display
  const formatHalfLife = (hours: number): string => {
    if (hours >= 168) return `~${Math.round(hours / 168)} week${hours >= 336 ? 's' : ''}`;
    if (hours >= 24) return `~${Math.round(hours / 24)} day${hours >= 48 ? 's' : ''}`;
    return `~${Math.round(hours)} hour${hours > 1 ? 's' : ''}`;
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

  const InfoButton = () => (
    isMobile ? (
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="p-1 rounded-full hover:bg-primary/10 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          className="w-64 text-sm bg-popover border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-muted-foreground">
            Shows estimated medication levels based on half-life calculations. 
            Tap for detailed charts and history.
          </p>
        </PopoverContent>
      </Popover>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="p-1 rounded-full hover:bg-primary/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>
              Shows estimated medication levels based on half-life calculations. 
              Tap for detailed charts and history.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  );

  return (
    <div 
      className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent border border-primary/15 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      onClick={handleCardTap}
    >
      <div className="p-4">
        {/* Header with compound selector */}
        <div className="flex items-center justify-between mb-3">
          <div 
            className="flex-1" 
            onClick={(e) => e.stopPropagation()}
          >
            {compoundsWithHalfLife.length > 1 ? (
              <Select 
                value={selectedCompoundId || ''} 
                onValueChange={handleCompoundChange}
              >
                <SelectTrigger className="w-auto h-8 px-3 py-1 text-sm font-medium bg-transparent border-none hover:bg-primary/10 transition-colors [&>svg]:ml-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <SelectValue placeholder="Select medication" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {compoundsWithHalfLife.map(compound => (
                    <SelectItem key={compound.id} value={compound.id}>
                      {compound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : selectedCompound ? (
              <div className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span>{selectedCompound.name}</span>
              </div>
            ) : null}
          </div>
          
          <InfoButton />
        </div>

        {/* Level display */}
        {currentLevel && takenDosesForCalc.length > 0 ? (
          <div className="space-y-3">
            {/* Percentage and absolute level */}
            <div className="flex items-baseline gap-3">
              <span 
                className={`text-3xl font-bold text-primary transition-all duration-300 ${
                  levelAnimating ? 'scale-110 text-secondary' : ''
                }`}
              >
                {Math.round(currentLevel.percentOfPeak)}%
              </span>
              <span className="text-sm text-muted-foreground">of peak</span>
            </div>
            
            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit} in system</span>
              {halfLifeData && (
                <span className="text-muted-foreground/70">
                  Half-life: {formatHalfLife(halfLifeData.halfLifeHours)}
                </span>
              )}
            </div>
            
            {/* Mini sparkline chart */}
            {sparklineData.length > 0 && (
              <div className="h-10 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="level"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
                      fill="url(#sparklineGradient)"
                    />
                    {sparklineData[currentPointIndex] && (
                      <ReferenceDot
                        x={sparklineData[currentPointIndex].timestamp}
                        y={sparklineData[currentPointIndex].level}
                        r={4}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
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
    </div>
  );
};
