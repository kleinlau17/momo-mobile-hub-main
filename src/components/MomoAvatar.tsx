import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import sound from '@/utils/sounds';
import { FRAME_ANIMATIONS } from '@/utils/kaomoji';
import useLongPress from '@/hooks/useLongPress';
import { getFlag, setFlag } from '@/utils/storage';

interface MomoAvatarProps {
  kaomoji: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  breathe?: boolean;
  animationClass?: string;
  frameAnimationState?: string;
  onClick?: () => void;
  onLongPress?: () => void;
  onDrivingMode?: () => void;
  isDriving?: boolean;
  onDrivingDrag?: (direction: string | null, intensity: number) => void;
  onDrivingStop?: () => void;
  onExitDriving?: () => void;
  disabled?: boolean;
  className?: string;
}

const sizeMap = { sm: 28, md: 40, lg: 72, xl: 72 };

function getAdaptiveFontSize(kaomoji: string, baseSize: number): number {
  const len = kaomoji.length;
  if (len <= 8) return baseSize;
  return Math.max(36, Math.min(baseSize, Math.floor(600 / len)));
}

const MAX_DRAG = 80;
const DIR_THRESHOLD = 30;

const DIRECTION_KAOMOJI: Record<string, string> = {
  up: '(・ω・)↑',
  down: '↓(・ω・)',
  left: '(・ω←)',
  right: '(→ω・)',
};

function snapDirection(dx: number, dy: number): string | null {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < DIR_THRESHOLD) return null;
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  if (angle >= -45 && angle < 45) return 'right';
  if (angle >= 45 && angle < 135) return 'up';
  if (angle >= -135 && angle < -45) return 'down';
  return 'left';
}

function dampen(raw: number): number {
  return MAX_DRAG * Math.tanh(raw / MAX_DRAG);
}

// SVG progress ring component
function ProgressRing({ progress, stage }: { progress: number; stage: 0 | 1 | 2 }) {
  if (stage === 0 && progress <= 0) return null;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(progress, 1);
  const offset = circumference * (1 - p);
  const color = stage >= 1 ? '#111' : '#E60012';

  return (
    <svg
      className="absolute pointer-events-none"
      width="120" height="120"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 50ms linear, stroke 200ms ease' }}
        transform="rotate(-90 60 60)"
      />
    </svg>
  );
}

export default function MomoAvatar({
  kaomoji,
  size = 'lg',
  breathe = true,
  animationClass,
  frameAnimationState,
  onClick,
  onLongPress,
  onDrivingMode,
  isDriving = false,
  onDrivingDrag,
  onDrivingStop,
  onExitDriving,
  disabled = false,
  className,
}: MomoAvatarProps) {
  const [bouncing, setBouncing] = useState(false);
  const [displayKaomoji, setDisplayKaomoji] = useState(kaomoji);
  const frameInterval = useRef<ReturnType<typeof setInterval>>();

  // Driving state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const [stoppedMsg, setStoppedMsg] = useState(false);
  const [showFirstDriveGuide, setShowFirstDriveGuide] = useState(!getFlag('firstDriveGuideShown'));
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lastDir = useRef<string | null>(null);
  const throttleRef = useRef(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const isDraggingRef = useRef(false);

  // Progress ring state
  const [ringProgress, setRingProgress] = useState(0);
  const [ringStage, setRingStage] = useState<0 | 1 | 2>(0);

  // Sync displayKaomoji with prop when not in frame animation and not driving
  useEffect(() => {
    if (!frameAnimationState && !isDriving) {
      setDisplayKaomoji(kaomoji);
    }
  }, [kaomoji, frameAnimationState, isDriving]);

  // Frame animation logic
  useEffect(() => {
    if (frameInterval.current) {
      clearInterval(frameInterval.current);
      frameInterval.current = undefined;
    }
    if (frameAnimationState && FRAME_ANIMATIONS[frameAnimationState]) {
      const { frames, interval } = FRAME_ANIMATIONS[frameAnimationState];
      let idx = 0;
      setDisplayKaomoji(frames[0]);
      frameInterval.current = setInterval(() => {
        idx = (idx + 1) % frames.length;
        setDisplayKaomoji(frames[idx]);
      }, interval);
    }
    return () => { if (frameInterval.current) clearInterval(frameInterval.current); };
  }, [frameAnimationState]);

  // When entering driving mode, set kaomoji
  useEffect(() => {
    if (isDriving) {
      setDisplayKaomoji('(°▽°)/');
      setDragOffset({ x: 0, y: 0 });
      setActiveDir(null);
      lastDir.current = null;
      setStoppedMsg(false);
    }
  }, [isDriving]);

  // Click outside to exit driving mode
  useEffect(() => {
    if (!isDriving) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-momo-driving]')) {
        onExitDriving?.();
      }
    };
    // Delay listener to avoid triggering on the same event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDriving, onExitDriving]);

  // Two-stage long press (only active when NOT in driving mode)
  const longPressHandlers = useLongPress({
    onTap: useCallback(() => {
      if (disabled || bouncing) return;
      if (isDriving) {
        // In driving mode, tap = re-press to exit
        onExitDriving?.();
        return;
      }
      setBouncing(true);
      sound.poke();
      onClick?.();
      setTimeout(() => setBouncing(false), 300);
    }, [disabled, bouncing, onClick, isDriving, onExitDriving]),
    onStage1: useCallback(() => {
      if (isDriving) return;
      onDrivingMode?.();
    }, [onDrivingMode, isDriving]),
    onEnterStage1: useCallback(() => {
      if (isDriving) return;
      if (navigator.vibrate) navigator.vibrate(15);
      sound.flyIn();
    }, [isDriving]),
    onStage2: useCallback(() => {
      if (isDriving) return;
      sound.panelOpen();
      onLongPress?.();
    }, [onLongPress, isDriving]),
    onProgress: useCallback((progress: number, stage: 0 | 1 | 2) => {
      if (isDriving) return;
      setRingProgress(progress);
      setRingStage(stage);
    }, [isDriving]),
    stage1Ms: 600,
    stage2Ms: 2000,
    tapMaxMs: 200,
  });

  // Drag handlers for driving mode
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!isDriving) return;
    dragStart.current = { x: clientX, y: clientY };
    isDraggingRef.current = true;
  }, [isDriving]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDriving || !dragStart.current) return;
    const rawDx = clientX - dragStart.current.x;
    const rawDy = clientY - dragStart.current.y;
    const dx = dampen(rawDx);
    const dy = dampen(rawDy);
    setDragOffset({ x: dx, y: dy });

    const dir = snapDirection(rawDx, rawDy);
    setActiveDir(dir);

    if (dir && dir !== lastDir.current) {
      lastDir.current = dir;
      if (navigator.vibrate) navigator.vibrate(15);
      sound.buttonPress();
    }

    setDisplayKaomoji(dir ? DIRECTION_KAOMOJI[dir] : '(°▽°)/');

    const now = Date.now();
    if (now - throttleRef.current >= 100) {
      throttleRef.current = now;
      const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      const intensity = Math.min(dist / MAX_DRAG, 1);
      onDrivingDrag?.(dir, intensity);
    }
  }, [isDriving, onDrivingDrag]);

  const handleDragEnd = useCallback(() => {
    if (!isDriving || !isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStart.current = null;
    lastDir.current = null;
    setActiveDir(null);
    // Snap back with transition but stay in driving mode
    setIsSnapping(true);
    setDragOffset({ x: 0, y: 0 });
    sound.pageTurn();
    setDisplayKaomoji('(°▽°)/');

    // Show stopped message briefly
    setStoppedMsg(true);
    setTimeout(() => setStoppedMsg(false), 1000);

    // Emit stop but DON'T exit driving
    onDrivingStop?.();

    // Mark first-time guide as shown
    if (showFirstDriveGuide) {
      setShowFirstDriveGuide(false);
      setFlag('firstDriveGuideShown', true);
    }

    setTimeout(() => setIsSnapping(false), 400);
  }, [isDriving, onDrivingStop, showFirstDriveGuide]);

  const adaptiveFontSize = getAdaptiveFontSize(displayKaomoji, sizeMap[size]);
  const glowDirs = ['up', 'down', 'left', 'right'];

  if (isDriving) {
    return (
      <div className="relative flex flex-col items-center" data-momo-driving>
        {/* Direction glows */}
        {glowDirs.map(d => {
          const isActive = activeDir === d;
          const pos = d === 'up' ? { top: -28, left: '50%', transform: 'translateX(-50%)' }
            : d === 'down' ? { bottom: -28, left: '50%', transform: 'translateX(-50%)' }
            : d === 'left' ? { left: -28, top: '50%', transform: 'translateY(-50%)' }
            : { right: -28, top: '50%', transform: 'translateY(-50%)' };
          return (
            <div
              key={d}
              className="absolute w-10 h-10 rounded-full pointer-events-none"
              style={{
                ...pos,
                position: 'absolute',
                background: 'radial-gradient(circle, rgba(230,0,18,0.6) 0%, transparent 70%)',
                opacity: isActive ? 0.5 : 0.12,
                transition: 'opacity 0.15s ease',
              }}
            />
          );
        })}

        {/* MoMo kaomoji with drag transform */}
        <div
          className={cn(
            'select-none cursor-grab leading-none text-center whitespace-nowrap',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
          style={{
            fontSize: `${adaptiveFontSize}px`,
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.08)`,
            transition: isSnapping ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            touchAction: 'none',
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            handleDragStart(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            handleDragMove(t.clientX, t.clientY);
          }}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onMouseMove={(e) => { if (e.buttons === 1) handleDragMove(e.clientX, e.clientY); }}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {displayKaomoji}
        </div>

        {/* Hint text */}
        <p className="mt-2 text-[11px]" style={{ color: '#E60012' }}>
          {stoppedMsg ? '停下了~' : '拖我走走~'}
        </p>

        {/* Persistent driving label with blink */}
        <p
          className="mt-1 text-[10px] animate-driving-blink"
          style={{ color: '#E60012' }}
        >
          · 驾驶中 · 再按一下停下来
        </p>

        {/* First-time guide */}
        {showFirstDriveGuide && (
          <p className="mt-1 text-[10px]" style={{ color: '#B0B0B0' }}>
            长按更久可以打开设置哦~
          </p>
        )}
      </div>
    );
  }

  // Normal mode
  return (
    <div className="relative inline-flex flex-col items-center">
      <ProgressRing progress={ringProgress} stage={ringStage} />
      <div
        className={cn(
          'select-none cursor-pointer leading-none w-full text-center whitespace-nowrap',
          breathe && !bouncing && !animationClass && !frameAnimationState && 'animate-breathe',
          bouncing && 'animate-bounce-q',
          animationClass && !bouncing && animationClass,
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        style={{ fontSize: `${adaptiveFontSize}px` }}
        {...longPressHandlers}
        role="button"
        tabIndex={0}
      >
        {displayKaomoji}
      </div>
    </div>
  );
}
