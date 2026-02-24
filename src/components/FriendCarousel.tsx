import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import sound from '@/utils/sounds';

interface CarouselItem {
  id: string;
  kaomoji: string;
  name: string;
  isAddButton?: boolean;
  isOnline?: boolean;
  isControlled?: boolean;
}

interface FriendCarouselProps {
  items: CarouselItem[];
  onClickCenter: (item: CarouselItem) => void;
}

function getCardFontSize(kaomoji: string): number {
  const len = kaomoji.length;
  if (len <= 8) return 48;
  return Math.max(28, Math.min(48, Math.floor(360 / len)));
}

type SlideDir = 'left' | 'right' | null;

const SWIPE_THRESHOLD = 20;
const TAP_THRESHOLD = 5;

export default function FriendCarousel({ items, onClickCenter }: FriendCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragCurrentX = useRef(0);
  const isDragging = useRef(false);
  const didSwipe = useRef(false);
  const [slideDir, setSlideDir] = useState<SlideDir>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const count = items.length;
  const getWrappedIndex = (i: number) => ((i % count) + count) % count;

  const goTo = useCallback((newIndex: number, dir: SlideDir) => {
    if (isAnimating || count === 0) return;
    sound.swipe();
    setSlideDir(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setActiveIndex(getWrappedIndex(newIndex));
      setSlideDir(null);
      setIsAnimating(false);
    }, 250);
  }, [count, isAnimating]);

  const handlePointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (isAnimating) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = x;
    dragCurrentX.current = x;
    isDragging.current = true;
    didSwipe.current = false;
  }, [isAnimating]);

  useEffect(() => {
    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!isDragging.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      dragCurrentX.current = x;
      const delta = Math.abs(x - dragStartX.current);
      if (delta > SWIPE_THRESHOLD) {
        didSwipe.current = true;
      }
    };

    const handleUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const delta = dragCurrentX.current - dragStartX.current;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        didSwipe.current = true;
        if (delta < 0) {
          goTo(activeIndex + 1, 'left');
        } else {
          goTo(activeIndex - 1, 'right');
        }
      }
    };

    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [activeIndex, goTo]);

  const handleCardClick = (offset: number, item: CarouselItem) => {
    // If we just swiped, don't trigger card click
    if (didSwipe.current) return;
    const totalDelta = Math.abs(dragCurrentX.current - dragStartX.current);
    if (totalDelta > TAP_THRESHOLD) return;

    if (offset === 0) {
      onClickCenter(item);
    } else if (offset < 0) {
      goTo(activeIndex + offset, 'right');
    } else {
      goTo(activeIndex + offset, 'left');
    }
  };

  if (count === 0) return null;

  const prevIndex = getWrappedIndex(activeIndex - 1);
  const nextIndex = getWrappedIndex(activeIndex + 1);
  const centerItem = items[activeIndex];
  const prevItem = count > 1 ? items[prevIndex] : null;
  const nextItem = count > 1 ? items[nextIndex] : null;

  const containerWidth = containerRef.current?.offsetWidth || 360;
  const cardWidth = containerWidth * 0.6;
  const spacing = cardWidth * 0.75;

  const exitingItem = centerItem;
  const enteringItem = slideDir === 'left'
    ? items[getWrappedIndex(activeIndex + 1)]
    : slideDir === 'right'
      ? items[getWrappedIndex(activeIndex - 1)]
      : null;

  const renderCardContent = (item: CarouselItem) => {
    const fontSize = getCardFontSize(item.kaomoji);
    return (
      <>
        {item.isControlled && !item.isAddButton && (
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-primary" />
        )}
        <span
          className="leading-none whitespace-nowrap text-center"
          style={{ fontSize: `${fontSize}px` }}
        >
          {item.kaomoji}
        </span>
        <span className="mt-1 text-[11px] text-foreground truncate max-w-[90%]">
          {item.name}
        </span>
      </>
    );
  };

  const sideCard = (item: CarouselItem | null, side: 'left' | 'right', offset: number) => {
    if (!item) return null;
    const x = side === 'left' ? -spacing : spacing;
    return (
      <div
        key={`side-${side}-${item.id}`}
        className="absolute flex flex-col items-center justify-center rounded-xl border border-border bg-background cursor-pointer"
        style={{
          width: `${cardWidth}px`,
          height: '85px',
          transform: `translateX(calc(-50% + ${x}px)) scale(0.8)`,
          left: '50%',
          opacity: 0.4,
          zIndex: 5,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick(offset, item);
        }}
      >
        {renderCardContent(item)}
      </div>
    );
  };

  const exitClass = slideDir === 'left'
    ? 'animate-carousel-exit-left'
    : slideDir === 'right'
      ? 'animate-carousel-exit-right'
      : '';
  const enterClass = slideDir === 'left'
    ? 'animate-carousel-enter-right'
    : slideDir === 'right'
      ? 'animate-carousel-enter-left'
      : '';

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none"
      style={{ height: '100px' }}
      onTouchStart={handlePointerDown}
      onMouseDown={handlePointerDown}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {sideCard(prevItem, 'left', -1)}

        <div
          className={cn(
            'absolute flex flex-col items-center justify-center rounded-xl border cursor-pointer overflow-hidden',
            'border-primary bg-background',
            centerItem.isAddButton && 'border-dashed',
          )}
          style={{
            width: `${cardWidth}px`,
            height: '85px',
            transform: 'translateX(-50%)',
            left: '50%',
            zIndex: 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isAnimating) handleCardClick(0, centerItem);
          }}
        >
          {slideDir && enteringItem ? (
            <>
              <div className={cn('absolute inset-0 flex flex-col items-center justify-center', exitClass)}>
                {renderCardContent(exitingItem)}
              </div>
              <div className={cn('absolute inset-0 flex flex-col items-center justify-center', enterClass)}>
                {renderCardContent(enteringItem)}
              </div>
            </>
          ) : (
            renderCardContent(centerItem)
          )}
        </div>

        {sideCard(nextItem, 'right', 1)}
      </div>
    </div>
  );
}
