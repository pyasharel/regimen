import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface WheelPickerColumnProps {
  values: (string | number)[];
  value: string | number;
  onChange: (value: string | number) => void;
  label?: string;
  className?: string;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;

export function WheelPickerColumn({ 
  values, 
  value, 
  onChange, 
  label,
  className 
}: WheelPickerColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
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

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div 
        className="relative overflow-hidden"
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      >
        {/* Selection indicator */}
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10 border-y border-border bg-primary/5"
          style={{ 
            top: ITEM_HEIGHT * 2, 
            height: ITEM_HEIGHT 
          }}
        />
        
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
        
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
                "flex items-center justify-center transition-all duration-150 snap-center",
                v === value 
                  ? "text-foreground font-semibold text-2xl" 
                  : "text-muted-foreground text-lg"
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => {
                onChange(v);
                scrollToValue(v);
              }}
            >
              {v}
            </div>
          ))}
          
          {/* Padding items */}
          <div style={{ height: ITEM_HEIGHT * 2 }} />
        </div>
      </div>
      
      {label && (
        <span className="text-sm text-muted-foreground mt-1">{label}</span>
      )}
    </div>
  );
}

interface HeightWheelPickerProps {
  unit: 'imperial' | 'metric';
  feet?: number;
  inches?: number;
  cm?: number;
  onChangeFeet?: (val: number) => void;
  onChangeInches?: (val: number) => void;
  onChangeCm?: (val: number) => void;
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

  if (unit === 'imperial') {
    return (
      <div className={cn("flex justify-center gap-4", className)}>
        <WheelPickerColumn
          values={feetValues}
          value={feet}
          onChange={(v) => onChangeFeet?.(v as number)}
          label="ft"
          className="w-20"
        />
        <WheelPickerColumn
          values={inchValues}
          value={inches}
          onChange={(v) => onChangeInches?.(v as number)}
          label="in"
          className="w-20"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center", className)}>
      <WheelPickerColumn
        values={cmValues}
        value={cm}
        onChange={(v) => onChangeCm?.(v as number)}
        label="cm"
        className="w-24"
      />
    </div>
  );
}

interface WeightWheelPickerProps {
  unit: 'lb' | 'kg';
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

export function WeightWheelPicker({
  unit,
  value,
  onChange,
  className
}: WeightWheelPickerProps) {
  const minWeight = unit === 'lb' ? 80 : 36;
  const maxWeight = unit === 'lb' ? 400 : 180;
  const weightValues = Array.from(
    { length: maxWeight - minWeight + 1 }, 
    (_, i) => i + minWeight
  );

  return (
    <div className={cn("flex justify-center items-end gap-2", className)}>
      <WheelPickerColumn
        values={weightValues}
        value={value}
        onChange={(v) => onChange(v as number)}
        className="w-24"
      />
      <span className="text-lg text-muted-foreground pb-2 mb-24">{unit}</span>
    </div>
  );
}
