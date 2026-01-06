import * as React from "react";
import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface RulerSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  className?: string;
}

const TICK_WIDTH = 10; // pixels per unit
const MAJOR_TICK_INTERVAL = 10; // Every 10 units is a major tick
const MINOR_TICK_HEIGHT = 24; // Taller ticks
const MAJOR_TICK_HEIGHT = 40; // Much taller major ticks

export function RulerSlider({
  min,
  max,
  value,
  onChange,
  unit,
  step = 1,
  className
}: RulerSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const isDraggingRef = useRef(false);

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (err) {
      // Ignore haptic errors
    }
  };

  const totalWidth = (max - min) * TICK_WIDTH;

  const scrollToValue = useCallback((val: number, smooth = true) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const targetScroll = (val - min) * TICK_WIDTH - containerWidth / 2;
    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [min]);

  useEffect(() => {
    scrollToValue(value, false);
  }, []);

  useEffect(() => {
    if (value !== lastValueRef.current && !isDraggingRef.current) {
      scrollToValue(value);
      lastValueRef.current = value;
    }
  }, [value, scrollToValue]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const scrollLeft = containerRef.current.scrollLeft;
    const centerPosition = scrollLeft + containerWidth / 2;
    
    let newValue = Math.round(centerPosition / TICK_WIDTH) + min;
    newValue = Math.max(min, Math.min(max, newValue));
    
    if (newValue !== lastValueRef.current) {
      lastValueRef.current = newValue;
      triggerHaptic();
      onChange(newValue);
    }
  };

  const handleScrollEnd = () => {
    isDraggingRef.current = false;
    // Snap to nearest value
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const scrollLeft = containerRef.current.scrollLeft;
    const centerPosition = scrollLeft + containerWidth / 2;
    
    let targetValue = Math.round(centerPosition / TICK_WIDTH) + min;
    targetValue = Math.max(min, Math.min(max, targetValue));
    
    scrollToValue(targetValue);
  };

  const handleTouchStart = () => {
    isDraggingRef.current = true;
  };

  // Generate tick marks
  const ticks = [];
  for (let i = min; i <= max; i += step) {
    const isMajor = (i - min) % MAJOR_TICK_INTERVAL === 0;
    ticks.push({ value: i, isMajor });
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Current Value Display */}
      <div className="text-center mb-4">
        <span className="text-5xl font-bold text-foreground tabular-nums">{value}</span>
        <span className="text-xl text-muted-foreground ml-2">{unit}</span>
      </div>
      
      {/* Ruler */}
      <div className="relative">
        {/* Center indicator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary z-10 transform -translate-x-1/2">
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
        </div>
        
        {/* Scrollable ruler */}
        <div
          ref={containerRef}
          className="overflow-x-scroll scrollbar-hide"
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleScrollEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleScrollEnd}
          style={{ 
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div 
            ref={rulerRef}
            className="flex items-end h-24 relative"
            style={{ 
              width: totalWidth + (containerRef.current?.offsetWidth || 300),
              paddingLeft: '50%',
              paddingRight: '50%',
            }}
          >
            {ticks.map(({ value: tickValue, isMajor }, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ 
                  width: TICK_WIDTH,
                  minWidth: TICK_WIDTH,
                }}
              >
                <div 
                  className={cn(
                    "w-0.5 rounded-full transition-colors",
                    isMajor 
                      ? "bg-foreground/40" 
                      : "bg-muted-foreground/30"
                  )}
                  style={{
                    height: isMajor ? MAJOR_TICK_HEIGHT : MINOR_TICK_HEIGHT
                  }}
                />
                {isMajor && (
                  <span className="text-xs text-muted-foreground mt-1 tabular-nums">
                    {tickValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
