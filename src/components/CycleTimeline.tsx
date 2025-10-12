import { format, addDays, differenceInDays } from "date-fns";

type CycleTimelineProps = {
  compound: {
    id: string;
    name: string;
    start_date: string;
    end_date: string | null;
    has_cycles: boolean;
    cycle_weeks_on: number | null;
    cycle_weeks_off: number | null;
    is_active: boolean;
  };
};

export const CycleTimeline = ({ compound }: CycleTimelineProps) => {
  if (!compound.has_cycles || !compound.cycle_weeks_on) {
    return null;
  }

  const startDate = new Date(compound.start_date);
  const now = new Date();
  const sixMonthsFromStart = addDays(startDate, 180);
  
  // Calculate cycle periods
  const weeksOn = compound.cycle_weeks_on;
  const weeksOff = compound.cycle_weeks_off || 0;
  const isOnOffCycle = weeksOff > 0;
  
  // Generate cycle periods for display
  const segments: { start: Date; end: Date; isOn: boolean }[] = [];
  let currentDate = new Date(startDate);
  let isOnPeriod = true;
  
  while (currentDate < sixMonthsFromStart && segments.length < 20) {
    const periodWeeks = isOnPeriod ? weeksOn : weeksOff;
    const periodEnd = addDays(currentDate, periodWeeks * 7);
    
    segments.push({
      start: new Date(currentDate),
      end: periodEnd > sixMonthsFromStart ? sixMonthsFromStart : periodEnd,
      isOn: isOnPeriod,
    });
    
    currentDate = periodEnd;
    
    // For on/off cycles, alternate between on and off
    if (isOnOffCycle) {
      isOnPeriod = !isOnPeriod;
    } else {
      // For one-time duration, only show the "on" period
      break;
    }
  }

  // Calculate total width for timeline
  const totalDays = differenceInDays(sixMonthsFromStart, startDate);
  
  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs font-medium text-muted-foreground">
        {isOnOffCycle 
          ? `Cycle: ${weeksOn}w on, ${weeksOff}w off` 
          : `One-time: ${weeksOn} week${weeksOn > 1 ? 's' : ''}`}
      </div>
      
      {/* Horizontal timeline visualization */}
      <div className="relative">
        <div className="flex h-8 rounded-lg overflow-hidden border border-border bg-muted/30">
          {segments.map((segment, index) => {
            const segmentDays = differenceInDays(segment.end, segment.start);
            const widthPercent = (segmentDays / totalDays) * 100;
            const isCurrentPeriod = now >= segment.start && now <= segment.end;
            
            return (
              <div
                key={index}
                className={`relative flex items-center justify-center transition-all ${
                  segment.isOn 
                    ? 'bg-primary' 
                    : 'bg-muted-foreground/20'
                } ${isCurrentPeriod ? 'ring-2 ring-primary ring-inset' : ''}`}
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 8 && (
                  <span className={`text-[10px] font-semibold ${
                    segment.isOn ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                    {segment.isOn ? 'ON' : 'OFF'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Date labels below timeline */}
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>{format(startDate, 'MMM d')}</span>
          <span>{format(sixMonthsFromStart, 'MMM d')}</span>
        </div>
      </div>
      
      {/* Current status indicator */}
      {segments.some(s => now >= s.start && now <= s.end) && (
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground">
            Currently in{' '}
            <span className="font-medium text-foreground">
              {segments.find(s => now >= s.start && now <= s.end)?.isOn ? 'ON' : 'OFF'}
            </span>
            {' '}period
          </span>
        </div>
      )}
    </div>
  );
};
