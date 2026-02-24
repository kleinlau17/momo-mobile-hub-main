import React, { useEffect } from 'react';
import sound from '@/utils/sounds';

interface EmotionAlertBannerProps {
  ownerName: string;
  momoName: string;
  type: 'emotion' | 'call';
  onDismiss: () => void;
}

export default function EmotionAlertBanner({
  ownerName,
  momoName,
  type,
  onDismiss,
}: EmotionAlertBannerProps) {
  useEffect(() => {
    if (type === 'emotion') sound.emotionAlert();
    else sound.callAlert();
  }, [type]);

  const message = type === 'emotion'
    ? `${ownerName} 可能需要一点关心~`
    : `${ownerName} 想让你来陪 ${momoName}~`;

  return (
    <div className="mx-4 mb-3 animate-fade-in-up">
      <div className="bg-primary-light border border-border-light rounded-md overflow-hidden flex">
        <div className="w-1 bg-primary flex-shrink-0" />
        <div className="flex-1 px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">{message}</p>
            <p className="text-[28px] leading-none mt-1">(´·ω·`)</p>
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="mt-2 text-xs text-muted-foreground mx-auto block"
      >
        现在不方便~
      </button>
    </div>
  );
}
