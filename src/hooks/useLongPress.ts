import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  /** Called when press duration is between stage1Ms and stage2Ms and finger is released */
  onStage1?: () => void;
  /** Called when press duration exceeds stage2Ms (while still holding) */
  onStage2?: () => void;
  /** Called on short tap (< tapMaxMs) */
  onTap?: () => void;
  stage1Ms?: number;
  stage2Ms?: number;
  tapMaxMs?: number;
  /** Called when entering stage1 zone (finger still down) */
  onEnterStage1?: () => void;
  /** Called continuously with progress 0-1 for stage1, then 1-2 for stage2 */
  onProgress?: (progress: number, stage: 0 | 1 | 2) => void;
}

export default function useLongPress({
  onStage1,
  onStage2,
  onTap,
  onEnterStage1,
  onProgress,
  stage1Ms = 600,
  stage2Ms = 2000,
  tapMaxMs = 200,
}: UseLongPressOptions) {
  const startTime = useRef(0);
  const stage1Timer = useRef<ReturnType<typeof setTimeout>>();
  const stage2Timer = useRef<ReturnType<typeof setTimeout>>();
  const progressRaf = useRef<number>();
  const stage2Fired = useRef(false);
  const stage1Entered = useRef(false);
  const isDown = useRef(false);

  const clearTimers = useCallback(() => {
    if (stage1Timer.current) clearTimeout(stage1Timer.current);
    if (stage2Timer.current) clearTimeout(stage2Timer.current);
    if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
    isDown.current = false;
  }, []);

  const tickProgress = useCallback(() => {
    if (!isDown.current || !onProgress) return;
    const elapsed = Date.now() - startTime.current;
    if (elapsed < stage1Ms) {
      onProgress(elapsed / stage1Ms, 0);
    } else if (elapsed < stage2Ms) {
      onProgress((elapsed - stage1Ms) / (stage2Ms - stage1Ms), 1);
    } else {
      onProgress(1, 2);
      return; // stop ticking
    }
    progressRaf.current = requestAnimationFrame(tickProgress);
  }, [onProgress, stage1Ms, stage2Ms]);

  const handleDown = useCallback(() => {
    startTime.current = Date.now();
    stage2Fired.current = false;
    stage1Entered.current = false;
    isDown.current = true;

    if (onProgress) {
      onProgress(0, 0);
      progressRaf.current = requestAnimationFrame(tickProgress);
    }

    stage1Timer.current = setTimeout(() => {
      stage1Entered.current = true;
      onEnterStage1?.();
    }, stage1Ms);

    stage2Timer.current = setTimeout(() => {
      stage2Fired.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onStage2?.();
      if (onProgress) onProgress(1, 2);
    }, stage2Ms);
  }, [onEnterStage1, onStage2, onProgress, stage1Ms, stage2Ms, tickProgress]);

  const handleUp = useCallback(() => {
    clearTimers();
    const elapsed = Date.now() - startTime.current;

    if (stage2Fired.current) {
      return;
    }

    if (stage1Entered.current) {
      onStage1?.();
      return;
    }

    if (elapsed < tapMaxMs) {
      onTap?.();
    }

    if (onProgress) onProgress(0, 0);
  }, [clearTimers, onStage1, onTap, tapMaxMs, onProgress]);

  const handlers = {
    onTouchStart: handleDown,
    onTouchEnd: handleUp,
    onMouseDown: handleDown,
    onMouseUp: handleUp,
    onMouseLeave: () => { clearTimers(); if (onProgress) onProgress(0, 0); },
  };

  return handlers;
}
