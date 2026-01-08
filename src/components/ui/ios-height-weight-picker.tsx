import * as React from "react";
import { cn } from "@/lib/utils";
import { usePickerHaptics } from "@/hooks/usePickerHaptics";

const ITEM_HEIGHT = 48;
const WHEEL_PADDING = 96; // 2 items above + 2 items below

type WheelValue = string | number;

interface FlatWheelColumnProps<T extends WheelValue> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  minWidth?: number;
  suffix?: string;
}

function FlatWheelColumn<T extends WheelValue>({
  options,
  value,
  onChange,
  className,
  minWidth = 84,
  suffix,
}: FlatWheelColumnProps<T>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const lastValueRef = React.useRef<T>(value);
  const { triggerHaptic } = usePickerHaptics();

  const scrollToValue = React.useCallback(
    (val: T, behavior: ScrollBehavior = "smooth") => {
      if (!ref.current) return;
      const index = options.indexOf(val);
      if (index < 0) return;

      ref.current.scrollTo({ top: index * ITEM_HEIGHT, behavior });
    },
    [options]
  );

  React.useEffect(() => {
    scrollToValue(value, "auto");
    lastValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (value !== lastValueRef.current) {
      scrollToValue(value, "smooth");
      lastValueRef.current = value;
    }
  }, [scrollToValue, value]);

  const handleScroll = React.useCallback(() => {
    if (!ref.current) return;
    
    const index = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
    const bounded = Math.max(0, Math.min(options.length - 1, index));
    const next = options[bounded];

    if (next !== lastValueRef.current) {
      triggerHaptic(); // Fire haptic FIRST before updating ref
      lastValueRef.current = next;
      onChange(next);
    }
  }, [onChange, options, triggerHaptic]);

  const handleItemTap = (opt: T) => {
    triggerHaptic();
    onChange(opt);
    scrollToValue(opt, "smooth");
  };

  return (
    <div className={cn("relative", className)} style={{ minWidth }}>
      {/* Selection highlight with coral tint - 9% opacity */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-12 bg-primary/[0.09] border-y border-primary/20 pointer-events-none z-10 rounded-xl" />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-[240px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div style={{ paddingTop: WHEEL_PADDING, paddingBottom: WHEEL_PADDING }}>
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <div
                key={String(opt)}
                onClick={() => handleItemTap(opt)}
                className={cn(
                  "h-12 flex items-center justify-center snap-center text-lg font-medium transition-opacity cursor-pointer active:scale-95 tabular-nums",
                  selected ? "opacity-100" : "opacity-30"
                )}
              >
                <span>{String(opt).padStart(typeof opt === "number" ? 2 : 0, "0")}</span>
                {suffix && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export interface IOSHeightWeightPickerProps {
  unit: "imperial" | "metric";
  feet: number;
  inches: number;
  cm: number;
  weight: number;
  onChangeFeet: (feet: number) => void;
  onChangeInches: (inches: number) => void;
  onChangeCm: (cm: number) => void;
  onChangeWeight: (weight: number) => void;
  className?: string;
}

export function IOSHeightWeightPicker({
  unit,
  feet,
  inches,
  cm,
  weight,
  onChangeFeet,
  onChangeInches,
  onChangeCm,
  onChangeWeight,
  className,
}: IOSHeightWeightPickerProps) {
  const feetValues = React.useMemo(() => Array.from({ length: 6 }, (_, i) => i + 3), []); // 3-8
  const inchValues = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i), []); // 0-11
  const cmValues = React.useMemo(() => Array.from({ length: 154 }, (_, i) => i + 91), []); // 91-244

  const lbsValues = React.useMemo(() => Array.from({ length: 651 }, (_, i) => i + 50), []); // 50-700
  const kgValues = React.useMemo(() => Array.from({ length: 296 }, (_, i) => i + 23), []); // 23-318

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-2 gap-6 items-start">
        {/* Height */}
        <div className="flex flex-col items-center">
          <div className="text-base font-semibold text-muted-foreground mb-3">Height</div>

          {unit === "metric" ? (
            <FlatWheelColumn
              options={cmValues}
              value={cm}
              onChange={(v) => onChangeCm(v as number)}
              minWidth={120}
              suffix="cm"
            />
          ) : (
            <div className="flex gap-2 justify-center">
              <FlatWheelColumn
                options={feetValues}
                value={feet}
                onChange={(v) => onChangeFeet(v as number)}
                minWidth={90}
                suffix="ft"
              />
              <FlatWheelColumn
                options={inchValues}
                value={inches}
                onChange={(v) => onChangeInches(v as number)}
                minWidth={90}
                suffix="in"
              />
            </div>
          )}
        </div>

        {/* Weight */}
        <div className="flex flex-col items-center">
          <div className="text-base font-semibold text-muted-foreground mb-3">Weight</div>
          {unit === "metric" ? (
            <FlatWheelColumn
              options={kgValues}
              value={weight}
              onChange={(v) => onChangeWeight(v as number)}
              minWidth={120}
              suffix="kg"
            />
          ) : (
            <FlatWheelColumn
              options={lbsValues}
              value={weight}
              onChange={(v) => onChangeWeight(v as number)}
              minWidth={120}
              suffix="lb"
            />
          )}
        </div>
      </div>
    </div>
  );
}
