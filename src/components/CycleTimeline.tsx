import { format, addDays } from "date-fns";

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
  const endDate = compound.end_date ? new Date(compound.end_date) : now;
  
  // Calculate cycle periods
  const weeksOn = compound.cycle_weeks_on;
  const weeksOff = compound.cycle_weeks_off || 0;
  const isOnOffCycle = weeksOff > 0;
  
  // Generate cycle periods for display (max 6 months or until end date)
  const cycles: { start: Date; end: Date; isOn: boolean }[] = [];
  let currentDate = new Date(startDate);
  let isOnPeriod = true;
  
  while (currentDate < endDate && cycles.length < 20) { // Limit to 20 cycles for display
    const periodWeeks = isOnPeriod ? weeksOn : weeksOff;
    const periodEnd = addDays(currentDate, periodWeeks * 7);
    
    cycles.push({
      start: new Date(currentDate),
      end: periodEnd > endDate ? endDate : periodEnd,
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

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {isOnOffCycle 
          ? `Cycle: ${weeksOn}w on, ${weeksOff}w off` 
          : `One-time: ${weeksOn} week${weeksOn > 1 ? 's' : ''}`}
      </div>
      
      <div className="space-y-1.5">
        {cycles.map((cycle, index) => {
          const isCurrentPeriod = now >= cycle.start && now <= cycle.end;
          
          return (
            <div 
              key={index} 
              className={`flex items-center gap-2 text-xs ${
                isCurrentPeriod ? 'font-medium' : 'opacity-70'
              }`}
            >
              <div 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  cycle.isOn 
                    ? 'bg-primary' 
                    : 'bg-muted-foreground/40'
                }`}
              />
              <span className={cycle.isOn ? 'text-foreground' : 'text-muted-foreground'}>
                {cycle.isOn ? 'ON' : 'OFF'}
              </span>
              <span className="text-muted-foreground">
                {format(cycle.start, 'MMM d')} - {format(cycle.end, 'MMM d')}
              </span>
              {isCurrentPeriod && (
                <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-semibold">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
