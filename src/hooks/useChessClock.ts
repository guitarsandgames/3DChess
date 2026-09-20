import { useState, useEffect, useCallback, useRef } from 'react';
import { Color } from 'chess.js';
import { ClockState } from '../types';

export interface UseChessClockOptions {
  initialTimeControl?: number; // seconds, 0 for untimed
  activeColor: Color;
  isGameActive: boolean;
  onTimeout?: (timedOutColor: Color) => void;
}

export function useChessClock({
  initialTimeControl = 600,
  activeColor,
  isGameActive,
  onTimeout,
}: UseChessClockOptions) {
  const [clock, setClock] = useState<ClockState>({
    w: initialTimeControl,
    b: initialTimeControl,
    active: false,
    timeControl: initialTimeControl,
  });

  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Clock countdown timer
  useEffect(() => {
    if (!clock.active || clock.timeControl === 0 || !isGameActive) {
      return;
    }

    const interval = setInterval(() => {
      setClock((prev) => {
        const remaining = Math.max(0, prev[activeColor] - 1);
        if (remaining === 0) {
          clearInterval(interval);
          onTimeoutRef.current?.(activeColor);
        }
        return {
          ...prev,
          [activeColor]: remaining,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [clock.active, clock.timeControl, activeColor, isGameActive]);

  const setTimeControl = useCallback((seconds: number) => {
    setClock({
      w: seconds,
      b: seconds,
      active: false,
      timeControl: seconds,
    });
  }, []);

  const startClock = useCallback(() => {
    setClock((prev) => ({ ...prev, active: true }));
  }, []);

  const pauseClock = useCallback(() => {
    setClock((prev) => ({ ...prev, active: false }));
  }, []);

  const resetClock = useCallback((seconds?: number) => {
    setClock((prev) => {
      const tc = seconds !== undefined ? seconds : prev.timeControl;
      return {
        w: tc,
        b: tc,
        active: false,
        timeControl: tc,
      };
    });
  }, []);

  return {
    clock,
    setTimeControl,
    startClock,
    pauseClock,
    resetClock,
  };
}
