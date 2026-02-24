import React, { useRef, useCallback, useState } from 'react';
import type { MomoAction } from '@/types/momo';
import { cn } from '@/lib/utils';

interface GestureAreaProps {
  kaomoji: string;
  animationClass?: string;
  onGesture: (action: MomoAction) => void;
  disabled?: boolean;
}

export default function GestureArea({ kaomoji, animationClass, onGesture, disabled = false }: GestureAreaProps) {
  const [touching, setTouching] = useState(false);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const gestureHandled = useRef(false);

  const handleStart = useCallback((x: number, y: number) => {
    if (disabled) return;
    setTouching(true);
    gestureHandled.current = false;
    touchStart.current = { x, y, time: Date.now() };

    longPressTimer.current = setTimeout(() => {
      if (!gestureHandled.current) {
        gestureHandled.current = true;
        if (navigator.vibrate) navigator.vibrate(30);
        onGesture('DANCE');
      }
    }, 800);
  }, [disabled, onGesture]);

  const handleMove = useCallback((x: number) => {
    if (!touchStart.current || gestureHandled.current || disabled) return;
    const dx = Math.abs(x - touchStart.current.x);
    if (dx > 30) {
      gestureHandled.current = true;
      clearTimeout(longPressTimer.current);
      onGesture('NUDGE');
    }
  }, [disabled, onGesture]);

  const handleEnd = useCallback(() => {
    setTouching(false);
    clearTimeout(longPressTimer.current);
    if (gestureHandled.current || disabled || !touchStart.current) return;

    const now = Date.now();
    const timeSinceLast = now - lastTap.current;

    if (timeSinceLast < 300) {
      gestureHandled.current = true;
      onGesture('WAVE_HI');
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (!gestureHandled.current && lastTap.current === now) {
          onGesture('POKE');
        }
      }, 310);
    }
  }, [disabled, onGesture]);

  return (
    <div
      className={cn(
        'w-[320px] max-w-[90vw] h-[200px] mx-auto flex items-center justify-center',
        'rounded-lg border border-dashed border-primary transition-bouncy overflow-visible',
        touching && 'border-2 bg-primary-light',
      )}
      onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => e.buttons && handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { setTouching(false); clearTimeout(longPressTimer.current); }}
    >
      <span
        className={cn('leading-none select-none whitespace-nowrap w-full text-center', animationClass)}
        style={{ fontSize: `${Math.max(36, Math.min(72, Math.floor(600 / kaomoji.length)))}px` }}
      >
        {kaomoji}
      </span>
    </div>
  );
}
