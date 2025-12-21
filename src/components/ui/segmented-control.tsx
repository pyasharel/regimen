import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentedControlOption<T> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
  size = 'md'
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg'
  };

  const paddingClasses = {
    sm: 'px-3',
    md: 'px-4',
    lg: 'px-5'
  };

  return (
    <div 
      className={cn(
        "inline-flex rounded-xl bg-muted/50 p-1 gap-1",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-lg font-medium transition-all duration-200 active:scale-[0.98]",
            sizeClasses[size],
            paddingClasses[size],
            "flex flex-col items-center justify-center",
            value === option.value
              ? "bg-background text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <span>{option.label}</span>
          {option.sublabel && (
            <span className="text-xs text-muted-foreground">{option.sublabel}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Convenience wrapper for common use cases
interface UnitToggleProps {
  type: 'weight' | 'height';
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function UnitToggle({ type, value, onChange, className }: UnitToggleProps) {
  const options = type === 'weight' 
    ? [
        { value: 'lbs', label: 'lbs', sublabel: 'Pounds' },
        { value: 'kg', label: 'kg', sublabel: 'Kilograms' }
      ]
    : [
        { value: 'imperial', label: 'ft/in', sublabel: 'Imperial' },
        { value: 'metric', label: 'cm', sublabel: 'Metric' }
      ];

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      className={cn("w-full", className)}
      size="lg"
    />
  );
}