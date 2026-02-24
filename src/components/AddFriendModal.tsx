import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptInvite: (code: string) => void;
  onCopyInviteLink: () => void;
  hasDevice: boolean;
  error?: string;
  loading?: boolean;
}

export default function AddFriendModal({
  isOpen,
  onClose,
  onAcceptInvite,
  onCopyInviteLink,
  hasDevice,
  error,
  loading,
}: AddFriendModalProps) {
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-[4px] z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-[360px] mx-auto bg-background rounded-lg p-5 animate-fade-in-up">
        <h3 className="text-base font-semibold mb-4">添加好友</h3>
        
        <p className="text-sm text-muted-foreground mb-3">输入好友发你的邀请码~</p>
        
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="输入邀请码"
          className="w-full border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary font-mono mb-2"
        />
        
        {error && <p className="text-xs text-primary mb-2">{error}</p>}
        
        <button
          onClick={() => code.trim() && onAcceptInvite(code.trim())}
          disabled={!code.trim() || loading}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium mb-4 transition-bouncy active:scale-95 disabled:opacity-50"
        >
          {loading ? '添加中...' : '确认添加'}
        </button>

        {hasDevice && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">或者</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={onCopyInviteLink}
              className="w-full py-2.5 rounded-md border border-primary text-primary text-sm transition-bouncy active:bg-primary-light"
            >
              复制我的邀请链接
            </button>
          </>
        )}
      </div>
    </>
  );
}
