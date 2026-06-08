import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Vibration } from "react-native";

/**
 * Custom hook for SOS activation with refined haptic feedback:
 * - No vibration on initial touch
 * - Vibrate only after successful SOS activation
 */
export function useSOSHaptics(active: boolean) {
  const [holding, setHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset haptics when SOS becomes active
  useEffect(() => {
    if (active) {
      // Vibrate only on successful activation (1.5s burst)
      Vibration.vibrate([0, 150, 100, 150, 100, 300], false);
    }
  }, [active]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      Vibration.cancel();
    };
  }, []);

  const startHold = () => {
    setHolding(true);
    Vibration.cancel(); // Ensure no residual vibration
  };

  const cancelHold = () => {
    setHolding(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    Vibration.cancel();
  };

  const completeHold = (callback: () => void) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    setHolding(false);
    callback();
  };

  return {
    holding,
    startHold,
    cancelHold,
    completeHold,
  };
}
