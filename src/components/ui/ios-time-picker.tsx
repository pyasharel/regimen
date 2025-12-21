import * as React from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface IOSTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const IOSTimePicker = ({ value, onChange, className }: IOSTimePickerProps) => {
  const [open, setOpen] = React.useState(false);
  
  // Parse the time value (HH:MM format)
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hours: 9, minutes: 0, period: 'AM' };
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hours: displayHours, minutes, period };
  };

  const formatTime = (hours: number, minutes: number, period: string) => {
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 = hours + 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const { hours, minutes, period } = parseTime(value);
  const [selectedHour, setSelectedHour] = React.useState(hours);
  const [selectedMinute, setSelectedMinute] = React.useState(minutes);
  const [selectedPeriod, setSelectedPeriod] = React.useState(period);

  const hourRef = React.useRef<HTMLDivElement>(null);
  const minuteRef = React.useRef<HTMLDivElement>(null);
  
  // Debounce refs to prevent over-sensitive scrolling
  const scrollTimeoutRef = React.useRef<{ hour?: NodeJS.Timeout; minute?: NodeJS.Timeout }>({});

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.hours);
      setSelectedMinute(parsed.minutes);
      setSelectedPeriod(parsed.period);
      setTimeout(() => {
        scrollToSelected(parsed.hours, parsed.minutes);
      }, 100);
    }
  }, [open, value]);

  const scrollToSelected = (hour: number, minute: number) => {
    const itemHeight = 48;
    const offset = 2 * itemHeight; // Center item is at index 2

    if (hourRef.current) {
      const hourIndex = hourOptions.indexOf(hour);
      hourRef.current.scrollTop = hourIndex * itemHeight;
    }
    if (minuteRef.current) {
      const minuteIndex = minuteOptions.indexOf(minute);
      minuteRef.current.scrollTop = minuteIndex * itemHeight;
    }
  };

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    options: any[],
    setter: (value: any) => void,
    key: 'hour' | 'minute'
  ) => {
    if (!ref.current) return;
    
    // Clear existing timeout for this wheel
    if (scrollTimeoutRef.current[key]) {
      clearTimeout(scrollTimeoutRef.current[key]);
    }
    
    // Debounce the scroll handler to prevent over-sensitivity
    scrollTimeoutRef.current[key] = setTimeout(() => {
      if (!ref.current) return;
      const itemHeight = 48;
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const boundedIndex = Math.max(0, Math.min(options.length - 1, index));
      setter(options[boundedIndex]);
    }, 50);
  };

  const handleItemTap = (
    ref: React.RefObject<HTMLDivElement>,
    options: any[],
    value: any,
    setter: (value: any) => void
  ) => {
    setter(value);
    if (ref.current) {
      const itemHeight = 48;
      const index = options.indexOf(value);
      ref.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleDone = () => {
    onChange(formatTime(selectedHour, selectedMinute, selectedPeriod));
    setOpen(false);
  };

  const displayTime = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')} ${selectedPeriod}`;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-11 bg-input border-border",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Select Time</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4">
          {/* iOS-style picker wheels */}
          <div className="relative">
            {/* Selection highlight */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-muted/30 border-y border-border pointer-events-none z-10 rounded-lg" />
            
            <div className="flex gap-2 justify-center items-center">
              {/* Hours wheel */}
              <div className="flex-1 max-w-[100px]">
                <div
                  ref={hourRef}
                  onScroll={() => handleScroll(hourRef, hourOptions, setSelectedHour, 'hour')}
                  className="h-[240px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                  style={{ scrollSnapType: 'y mandatory' }}
                >
                  <div className="py-[96px]">
                    {hourOptions.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => handleItemTap(hourRef, hourOptions, hour, setSelectedHour)}
                        className="h-12 flex items-center justify-center snap-center text-lg font-medium transition-opacity cursor-pointer active:scale-95"
                        style={{
                          opacity: selectedHour === hour ? 1 : 0.3,
                        }}
                      >
                        {String(hour).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-2xl font-bold text-muted-foreground">:</div>

              {/* Minutes wheel */}
              <div className="flex-1 max-w-[100px]">
                <div
                  ref={minuteRef}
                  onScroll={() => handleScroll(minuteRef, minuteOptions, setSelectedMinute, 'minute')}
                  className="h-[240px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                  style={{ scrollSnapType: 'y mandatory' }}
                >
                  <div className="py-[96px]">
                    {minuteOptions.map((minute) => (
                      <div
                        key={minute}
                        onClick={() => handleItemTap(minuteRef, minuteOptions, minute, setSelectedMinute)}
                        className="h-12 flex items-center justify-center snap-center text-lg font-medium transition-opacity cursor-pointer active:scale-95"
                        style={{
                          opacity: selectedMinute === minute ? 1 : 0.3,
                        }}
                      >
                        {String(minute).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AM/PM Toggle - Large tap targets instead of scroll wheel */}
              <div className="flex-1 max-w-[80px]">
                <div className="h-[240px] flex flex-col items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod('AM')}
                    className={cn(
                      "w-full py-4 rounded-xl text-lg font-semibold transition-all active:scale-95",
                      selectedPeriod === 'AM'
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod('PM')}
                    className={cn(
                      "w-full py-4 rounded-xl text-lg font-semibold transition-all active:scale-95",
                      selectedPeriod === 'PM'
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleDone}>Done</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};