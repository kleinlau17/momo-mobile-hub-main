import React from 'react';
import type { MomoAction } from '@/types/momo';
import { cn } from '@/lib/utils';
import sound from '@/utils/sounds';

interface ActionButtonsProps {
  onAction: (action: MomoAction) => void;
  disabled?: boolean;
}

const actions: { action: MomoAction; label: string }[] = [
  { action: 'POKE', label: '戳戳' },
  { action: 'NUDGE', label: '蹭蹭' },
  { action: 'WAVE_HI', label: '招呼' },
  { action: 'DANCE', label: '跳舞' },
];

export default function ActionButtons({ onAction, disabled = false }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {actions.map(({ action, label }) => (
        <button
          key={action}
          onClick={() => { sound.buttonPress(); onAction(action); }}
          disabled={disabled}
          className={cn(
            'py-2.5 text-[13px] font-medium rounded-md transition-bouncy',
            'border border-primary text-primary bg-background',
            'active:bg-primary-light',
            'disabled:border-border disabled:text-muted-foreground disabled:bg-background',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
