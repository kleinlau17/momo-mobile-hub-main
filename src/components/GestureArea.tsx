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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const gestureHandled = useRef(false);

  const handleStart = useCallback((x: number, y: number) => {
    if (disabled) return;
    setTouching(true);
    gestureHandled.current = false;
    touchStart.current = { x, y };
  }, [disabled]);

  const handleMove = useCallback((x: number, y: number) => {
    if (!touchStart.current || gestureHandled.current || disabled) return;
    
    const dx = x - touchStart.current.x;
    const dy = y - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 只要滑动超过 30px，立刻判定动作并拦截后续触发
    if (absDx > 30 || absDy > 30) {
      gestureHandled.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      
      if (absDx > absDy) {
        // 横向滑动幅度更大 -> 左右滑 -> 蹭蹭
        onGesture('NUDGE');
      } else {
        // 纵向滑动幅度更大
        if (dy < 0) {
          // 上划 -> 招呼
          onGesture('WAVE_HI');
        } else {
          // 下划 -> 跳舞
          onGesture('DANCE');
        }
      }
    }
  }, [disabled, onGesture]);

  const handleEnd = useCallback(() => {
    setTouching(false);
    if (gestureHandled.current || disabled || !touchStart.current) return;
    
    // 如果抬手时还没触发过滑动（滑动幅度没超过 30px），则视为单纯的点击
    gestureHandled.current = true;
    onGesture('POKE');
  }, [disabled, onGesture]);

  return (
    <div
      className={cn(
        'w-[320px] max-w-[90vw] h-[200px] mx-auto flex items-center justify-center',
        'rounded-lg border border-dashed border-primary transition-bouncy overflow-visible cursor-pointer select-none',
        touching && 'border-2 bg-primary-light',
      )}
      onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => e.buttons === 1 && handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => setTouching(false)}
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
