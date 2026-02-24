import React, { useState } from 'react';
import {
  mockSimulateEmotionAlert,
  mockSimulateControlRequest,
  mockSimulateControlled,
  mockSimulateControlEnd,
  setCallbackMode,
  getCallbackMode,
  type MockCallbackMode,
} from '@/services/mock';
import { cn } from '@/lib/utils';

interface DebugPanelProps {
  isMockMode: boolean;
  onToggleMock: (val: boolean) => void;
  onSetMood: (mood: string) => void;
  lastMoveCommand?: { direction: string | null; intensity: number } | null;
  currentEmotion?: string;
}

export default function DebugPanel({ isMockMode, onToggleMock, onSetMood, lastMoveCommand, currentEmotion }: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [cbMode, setCbMode] = useState<MockCallbackMode>(getCallbackMode());

  return (
    <>
      {/* Float button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-20 right-3 z-30 w-10 h-10 rounded-full',
          'bg-card border border-border shadow-md',
          'flex items-center justify-center text-muted-foreground text-sm',
          'transition-bouncy active:scale-90',
        )}
        style={{ maxWidth: '430px' }}
      >
        *
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="fixed bottom-32 right-3 z-40 w-56 bg-card border border-border rounded-lg shadow-lg p-3 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium">调试面板</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground">×</button>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center justify-between">
              <span>{isMockMode ? '模拟模式' : '真实服务器'}</span>
              <button
                onClick={() => onToggleMock(!isMockMode)}
                className={cn(
                  'w-8 h-4 rounded-full relative transition-colors',
                  isMockMode ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-background transition-transform',
                  isMockMode ? 'translate-x-4' : 'translate-x-0.5',
                )} />
              </button>
            </div>

            {/* Current emotion (real mode only) */}
            {!isMockMode && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">当前情绪</span>
                <span className="text-primary font-medium">{currentEmotion ?? '—'}</span>
              </div>
            )}

            {isMockMode && (
              <>
                <div className="border-t border-border-light" />
                <p className="font-medium">切换心情</p>
                <div className="flex gap-1">
                  {['positive', 'neutral', 'negative'].map(m => (
                    <button key={m} onClick={() => onSetMood(m)}
                      className="px-2 py-1 border border-border rounded text-[10px] active:bg-primary-light">
                      {m === 'positive' ? '开心' : m === 'neutral' ? '普通' : '低落'}
                    </button>
                  ))}
                </div>

                <p className="font-medium">模拟事件</p>
                <div className="space-y-1">
                  <button onClick={() => mockSimulateEmotionAlert()} className="block text-primary">情绪通知</button>
                  <button onClick={() => mockSimulateControlRequest()} className="block text-primary">操控请求</button>
                  <button onClick={() => mockSimulateControlled()} className="block text-primary">被夺舍</button>
                  <button onClick={() => mockSimulateControlEnd()} className="block text-primary">结束夺舍</button>
                </div>

                <p className="font-medium">动作回调</p>
                <div className="flex gap-1">
                  {(['always_success', 'random_timeout', 'always_timeout'] as const).map(m => (
                    <button key={m} onClick={() => { setCallbackMode(m); setCbMode(m); }}
                      className={cn(
                        'px-1.5 py-1 border rounded text-[10px]',
                        cbMode === m ? 'border-primary text-primary' : 'border-border',
                      )}>
                      {m === 'always_success' ? '成功' : m === 'random_timeout' ? '随机' : '超时'}
                    </button>
                  ))}
                </div>

                {/* Move command display */}
                <div className="border-t border-border-light" />
                <p className="font-medium">模拟移动指令</p>
                <div className="bg-background rounded p-2 font-mono text-[10px] text-muted-foreground">
                  {lastMoveCommand ? (
                    <>
                      <div>direction: <span className="text-primary">{lastMoveCommand.direction ?? 'none'}</span></div>
                      <div>intensity: <span className="text-primary">{lastMoveCommand.intensity.toFixed(2)}</span></div>
                    </>
                  ) : (
                    <span>等待移动指令...</span>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
