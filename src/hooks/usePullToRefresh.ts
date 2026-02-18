import { useCallback, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const PULL_THRESHOLD = 60; // px to trigger refresh
const MAX_PULL = 120; // max visual pull distance
const RESISTANCE = 0.4; // drag resistance factor

interface PullToRefreshState {
  pulling: boolean;
  pullDistance: number;
  refreshing: boolean;
}

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    pullDistance: 0,
    refreshing: false,
  });

  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const thresholdHapticFired = useRef(false);
  const refreshingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshingRef.current) return;
    
    // Only activate if scrolled to top
    const target = e.currentTarget;
    if (target.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    thresholdHapticFired.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshingRef.current) return;

    const dy = e.touches[0].clientY - startYRef.current;
    
    // Only pull down
    if (dy <= 0) {
      if (state.pulling) {
        setState(s => ({ ...s, pulling: false, pullDistance: 0 }));
        pullDistanceRef.current = 0;
      }
      return;
    }

    // Check scroll position again during drag
    const target = e.currentTarget;
    if (target.scrollTop > 0) return;

    const pullDistance = Math.min(dy * RESISTANCE, MAX_PULL);
    pullDistanceRef.current = pullDistance;
    setState({ pulling: true, pullDistance, refreshing: false });

    // Haptic when crossing threshold
    if (pullDistance >= PULL_THRESHOLD && !thresholdHapticFired.current) {
      thresholdHapticFired.current = true;
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
    }
  }, [state.pulling]);

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;

    const finalPull = pullDistanceRef.current;
    pullDistanceRef.current = 0;

    if (finalPull >= PULL_THRESHOLD && !refreshingRef.current) {
      refreshingRef.current = true;
      setState({ pulling: false, pullDistance: PULL_THRESHOLD * RESISTANCE, refreshing: true });

      try {
        await onRefresh();
      } finally {
        refreshingRef.current = false;
        setState({ pulling: false, pullDistance: 0, refreshing: false });
      }
    } else {
      setState({ pulling: false, pullDistance: 0, refreshing: false });
    }
  }, [onRefresh]);

  return {
    ...state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
