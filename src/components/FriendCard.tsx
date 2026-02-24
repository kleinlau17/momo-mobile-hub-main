import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FriendCardProps {
  kaomoji: string;
  name: string;
  isOnline: boolean;
  isControlled?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onDragToCenter?: () => void;
}

export default function FriendCard({
  kaomoji,
  name,
  isOnline,
  isControlled = false,
  isSelected = false,
  onClick,
  onDragToCenter,
}: FriendCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapBack, setSnapBack] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const isLongPress = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const originRect = useRef<DOMRect | null>(null);

  const getClientPos = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if ('touches' in e) {
      const touch = e.touches[0] || (e as TouchEvent).changedTouches?.[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : { x: 0, y: 0 };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handlePointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const pos = getClientPos(e);
    startPos.current = pos;
    isLongPress.current = false;

    if (cardRef.current) {
      originRect.current = cardRef.current.getBoundingClientRect();
    }

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      setIsDragging(true);
      setDragOffset({ x: 0, y: 0 });
    }, 300);
  }, []);

  const handlePointerMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isLongPress.current || !isDragging) {
      // If moved too far before long press, cancel
      const pos = getClientPos(e);
      const dx = pos.x - startPos.current.x;
      const dy = pos.y - startPos.current.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }
      return;
    }
    e.preventDefault();
    const pos = getClientPos(e);
    setDragOffset({
      x: pos.x - startPos.current.x,
      y: pos.y - startPos.current.y,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: TouchEvent | MouseEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (isDragging && isLongPress.current) {
      // Check if dropped in center zone (20%-70% of screen height)
      const pos = getClientPos(e);
      const screenH = window.innerHeight;
      const centerY = pos.y;
      const inCenterZone = centerY > screenH * 0.2 && centerY < screenH * 0.7;

      if (inCenterZone && onDragToCenter) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        onDragToCenter();
      } else {
        // Snap back with animation
        setSnapBack(true);
        setDragOffset({ x: 0, y: 0 });
        setTimeout(() => {
          setIsDragging(false);
          setSnapBack(false);
        }, 300);
      }
    } else if (!isLongPress.current) {
      // Regular click
      onClick?.();
    }

    isLongPress.current = false;
  }, [isDragging, onClick, onDragToCenter]);

  useEffect(() => {
    if (isDragging) {
      const moveHandler = (e: TouchEvent | MouseEvent) => handlePointerMove(e);
      const upHandler = (e: TouchEvent | MouseEvent) => handlePointerUp(e);

      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('touchend', upHandler);
      window.addEventListener('mouseup', upHandler);

      return () => {
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('touchend', upHandler);
        window.removeEventListener('mouseup', upHandler);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onTouchStart={handlePointerDown}
      onMouseDown={handlePointerDown}
      className={cn(
        'relative flex-shrink-0 flex flex-col items-center justify-center',
        'w-[80px] h-[80px] rounded-lg border select-none',
        isSelected
          ? 'border-2 border-primary bg-primary-light'
          : 'border-border bg-background',
        !isOnline && 'opacity-60',
        snapBack && 'transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        isDragging && !snapBack && 'transition-none',
        !isDragging && !snapBack && 'transition-bouncy',
      )}
      style={
        isDragging
          ? {
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.1)`,
              zIndex: 999,
              position: 'relative' as const,
              boxShadow: '0 8px 24px rgba(230,0,18,0.3)',
              pointerEvents: 'none' as const,
            }
          : undefined
      }
    >
      {isControlled && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
      )}
      <span className="text-[28px] leading-none">{kaomoji}</span>
      <span className="mt-1 text-[11px] text-foreground truncate max-w-[70px]">
        {name}
      </span>
    </div>
  );
}
