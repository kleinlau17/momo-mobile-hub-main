import React from 'react';
import type { ConnectionStatus } from '@/types/momo';
import { cn } from '@/lib/utils';

interface ConnectionDotProps {
  status: ConnectionStatus;
}

export default function ConnectionDot({ status }: ConnectionDotProps) {
  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full transition-colors duration-300',
        status === 'connected' && 'bg-status-online',
        status === 'disconnected' && 'bg-status-offline',
        status === 'connecting' && 'bg-status-connecting animate-pulse-dot',
      )}
      title={
        status === 'connected' ? '已连接' :
        status === 'disconnected' ? '已断线' : '连接中...'
      }
    />
  );
}
