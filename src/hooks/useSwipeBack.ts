import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const EDGE_ZONE = 20; // px from left edge
const TRIGGER_THRESHOLD = 80; // min px to trigger navigation
const MAX_DRAG = 300; // max visual drag distance

interface SwipeBackState {
  active: boolean;
  translateX: number;
}

export function useSwipeBack() {
  const navigate = useNavigate();
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isHorizontalRef = useRef<boolean | null>(null);
  const translateXRef = useRef(0);
  const [state, setState] = useState<SwipeBackState>({ active: false, translateX: 0 });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= EDGE_ZONE) {
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isHorizontalRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    // Determine direction on first significant move
    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
        if (!isHorizontalRef.current) {
          // Vertical scroll - abort
          startXRef.current = null;
          startYRef.current = null;
          return;
        }
      } else {
        return;
      }
    }

    if (!isHorizontalRef.current) return;

    if (dx > 0) {
      e.preventDefault();
      const translateX = Math.min(dx, MAX_DRAG);
      translateXRef.current = translateX;
      setState({ active: true, translateX });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startXRef.current === null) return;
    
    const finalTranslate = translateXRef.current;
    
    if (finalTranslate >= TRIGGER_THRESHOLD) {
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
      navigate(-1);
    }

    // Reset
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalRef.current = null;
    translateXRef.current = 0;
    setState({ active: false, translateX: 0 });
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}
