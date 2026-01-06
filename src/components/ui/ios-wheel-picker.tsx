import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

interface WheelPickerColumnProps {
  values: (string | number)[];
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  suffix?: string;
  className?: string;
}

export function WheelPickerColumn({ 
  values, 
  value, 
  onChange, 
  label,
  suffix,
  className 
}: WheelPickerColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (err) {
      // Ignore haptic errors
    }
  };

  const scrollToValue = useCallback((val: string | number, smooth = true) => {
    const index = values.indexOf(val);
    if (index === -1 || !containerRef.current) return;
    
    const scrollTop = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: scrollTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [values]);

  useEffect(() => {
    scrollToValue(value, false);
  }, []);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      scrollToValue(value);
      lastValueRef.current = value;
    }
  }, [value, scrollToValue]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    const newValue = values[clampedIndex];
    
    if (newValue !== lastValueRef.current) {
      lastValueRef.current = newValue;
      triggerHaptic();
      onChange(newValue);
    }
  };

  const handleScrollEnd = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const targetScroll = index * ITEM_HEIGHT;
    
    if (Math.abs(scrollTop - targetScroll) > 1) {
      containerRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  // Calculate which item is selected based on scroll position
  const getItemStyle = (index: number, currentValue: string | number): React.CSSProperties => {
    const isSelected = values[index] === currentValue;
    const selectedIndex = values.indexOf(currentValue);
    const distance = Math.abs(index - selectedIndex);
    
    // Create 3D perspective effect - items further from center are smaller and faded
    const scale = isSelected ? 1 : Math.max(0.7, 1 - distance * 0.15);
    const opacity = isSelected ? 1 : Math.max(0.3, 1 - distance * 0.25);
    
    return {
      height: ITEM_HEIGHT,
      transform: `scale(${scale})`,
      opacity,
      transition: 'transform 0.15s, opacity 0.15s',
    };
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {label && (
        <span className="text-sm font-medium text-muted-foreground mb-2">{label}</span>
      )}
      <div 
        className="relative overflow-hidden"
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      >
        {/* Selection indicator - clean bordered box */}
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10 border border-border rounded-lg bg-muted/30"
          style={{ 
            top: ITEM_HEIGHT * 2, 
            height: ITEM_HEIGHT 
          }}
        />
        
        {/* Gradient overlays for 3D fade effect */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20" />
        
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={handleScroll}
          onTouchEnd={handleScrollEnd}
          onMouseUp={handleScrollEnd}
          style={{ 
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Padding items */}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
          
          {values.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center snap-center tabular-nums",
                v === value 
                  ? "text-foreground font-semibold text-xl" 
                  : "text-muted-foreground text-lg"
              )}
              style={getItemStyle(i, value)}
              onClick={() => {
                onChange(v);
                scrollToValue(v);
              }}
            >
              {v}{suffix && <span className="ml-1 text-muted-foreground font-normal text-base">{suffix}</span>}
            </div>
          ))}
          
          {/* Padding items */}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
        </div>
      </div>
    </div>
  );
}

// Height picker for imperial (feet + inches side by side)
interface HeightWheelPickerProps {
  unit: 'imperial' | 'metric';
  feet?: number;
  inches?: number;
  cm?: number;
  onChangeFeet?: (feet: number) => void;
  onChangeInches?: (inches: number) => void;
  onChangeCm?: (cm: number) => void;
  className?: string;
}

export function HeightWheelPicker({
  unit,
  feet = 5,
  inches = 10,
  cm = 178,
  onChangeFeet,
  onChangeInches,
  onChangeCm,
  className
}: HeightWheelPickerProps) {
  const feetValues = Array.from({ length: 5 }, (_, i) => i + 4); // 4-8 feet
  const inchValues = Array.from({ length: 12 }, (_, i) => i); // 0-11 inches
  const cmValues = Array.from({ length: 121 }, (_, i) => i + 120); // 120-240 cm

  if (unit === 'metric') {
    return (
      <div className={cn("flex justify-center", className)}>
        <WheelPickerColumn
          values={cmValues}
          value={cm}
          onChange={(v) => onChangeCm?.(v as number)}
          suffix="cm"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center gap-6", className)}>
      <WheelPickerColumn
        values={feetValues}
        value={feet}
        onChange={(v) => onChangeFeet?.(v as number)}
        suffix="ft"
      />
      <WheelPickerColumn
        values={inchValues}
        value={inches}
        onChange={(v) => onChangeInches?.(v as number)}
        suffix="in"
      />
    </div>
  );
}

// Weight picker - accepts value/onChange with unit for proper lb/kg handling
interface WeightWheelPickerProps {
  unit: 'imperial' | 'metric';
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
}

export function WeightWheelPicker({
  unit,
  value,
  onChange,
  className
}: WeightWheelPickerProps) {
  const lbsValues = Array.from({ length: 401 }, (_, i) => i + 50); // 50-450 lbs
  const kgValues = Array.from({ length: 201 }, (_, i) => i + 25); // 25-225 kg

  const defaultValue = unit === 'metric' ? 68 : 150;
  const currentValue = value ?? defaultValue;

  if (unit === 'metric') {
    return (
      <div className={cn("flex justify-center", className)}>
        <WheelPickerColumn
          values={kgValues}
          value={currentValue}
          onChange={(v) => onChange?.(v as number)}
          suffix="kg"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center", className)}>
      <WheelPickerColumn
        values={lbsValues}
        value={currentValue}
        onChange={(v) => onChange?.(v as number)}
        suffix="lb"
      />
    </div>
  );
}

// Combined height and weight picker - Cal AI style with side-by-side layout
interface CombinedHeightWeightPickerProps {
  unit: 'imperial' | 'metric';
  feet?: number;
  inches?: number;
  cm?: number;
  lbs?: number;
  kg?: number;
  onChangeFeet?: (feet: number) => void;
  onChangeInches?: (inches: number) => void;
  onChangeCm?: (cm: number) => void;
  onChangeLbs?: (lbs: number) => void;
  onChangeKg?: (kg: number) => void;
  className?: string;
}

export function CombinedHeightWeightPicker({
  unit,
  feet = 5,
  inches = 10,
  cm = 178,
  lbs = 150,
  kg = 68,
  onChangeFeet,
  onChangeInches,
  onChangeCm,
  onChangeLbs,
  onChangeKg,
  className
}: CombinedHeightWeightPickerProps) {
  const feetValues = Array.from({ length: 5 }, (_, i) => i + 4);
  const inchValues = Array.from({ length: 12 }, (_, i) => i);
  const cmValues = Array.from({ length: 121 }, (_, i) => i + 120);
  const lbsValues = Array.from({ length: 401 }, (_, i) => i + 50);
  const kgValues = Array.from({ length: 201 }, (_, i) => i + 25);

  if (unit === 'metric') {
    return (
      <div className={cn("flex justify-center gap-12", className)}>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium text-foreground mb-3">Height</span>
          <WheelPickerColumn
            values={cmValues}
            value={cm}
            onChange={(v) => onChangeCm?.(v as number)}
            suffix="cm"
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium text-foreground mb-3">Weight</span>
          <WheelPickerColumn
            values={kgValues}
            value={kg}
            onChange={(v) => onChangeKg?.(v as number)}
            suffix="kg"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center gap-8", className)}>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium text-foreground mb-3">Height</span>
        <div className="flex gap-2">
          <WheelPickerColumn
            values={feetValues}
            value={feet}
            onChange={(v) => onChangeFeet?.(v as number)}
            suffix="ft"
          />
          <WheelPickerColumn
            values={inchValues}
            value={inches}
            onChange={(v) => onChangeInches?.(v as number)}
            suffix="in"
          />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium text-foreground mb-3">Weight</span>
        <WheelPickerColumn
          values={lbsValues}
          value={lbs}
          onChange={(v) => onChangeLbs?.(v as number)}
          suffix="lb"
        />
      </div>
    </div>
  );
}
