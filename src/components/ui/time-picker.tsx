import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TimePicker = ({ value, onChange, className }: TimePickerProps) => {
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

  const handleTimeChange = (newHour: number, newMinute: number, newPeriod: string) => {
    setSelectedHour(newHour);
    setSelectedMinute(newMinute);
    setSelectedPeriod(newPeriod);
    onChange(formatTime(newHour, newMinute, newPeriod));
  };

  const displayTime = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')} ${selectedPeriod}`;

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card" align="start">
        <div className="flex gap-0">
          {/* Hours */}
          <div className="flex flex-col border-r border-border">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 text-center border-b border-border">
              Hour
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1 space-y-0.5">
                {hourOptions.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => {
                      handleTimeChange(hour, selectedMinute, selectedPeriod);
                    }}
                    className={cn(
                      "w-14 px-2 py-1.5 text-sm rounded transition-colors block",
                      selectedHour === hour
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Minutes */}
          <div className="flex flex-col border-r border-border">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 text-center border-b border-border">
              Min
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1 space-y-0.5">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => {
                      handleTimeChange(selectedHour, minute, selectedPeriod);
                    }}
                    className={cn(
                      "w-14 px-2 py-1.5 text-sm rounded transition-colors block",
                      selectedMinute === minute
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* AM/PM */}
          <div className="flex flex-col">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 text-center border-b border-border">
              Period
            </div>
            <div className="p-1 space-y-0.5 pt-2">
              <button
                onClick={() => {
                  handleTimeChange(selectedHour, selectedMinute, 'AM');
                }}
                className={cn(
                  "w-14 px-2 py-1.5 text-sm rounded transition-colors block",
                  selectedPeriod === 'AM'
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                AM
              </button>
              <button
                onClick={() => {
                  handleTimeChange(selectedHour, selectedMinute, 'PM');
                }}
                className={cn(
                  "w-14 px-2 py-1.5 text-sm rounded transition-colors block",
                  selectedPeriod === 'PM'
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
