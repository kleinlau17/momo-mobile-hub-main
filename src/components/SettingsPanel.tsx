import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import sound from '@/utils/sounds';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  momoName: string;
  deviceId: string | null;
  quietMode: boolean;
  friends: Array<{
    userId: string;
    nickname: string;
    momoName: string;
    isWhitelist: boolean;
  }>;
  onRename: (name: string) => void;
  onToggleQuiet: (enabled: boolean) => void;
  onCopyInvite: () => void;
  onCallFriends: () => void;
  onRemoveFriend: (id: string) => void;
  onToggleWhitelist: (id: string, val: boolean) => void;
  onBindDevice: () => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  momoName,
  deviceId,
  quietMode,
  friends,
  onRename,
  onToggleQuiet,
  onCopyInvite,
  onCallFriends,
  onRemoveFriend,
  onToggleWhitelist,
  onBindDevice,
}: SettingsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(momoName);
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) sound.panelOpen();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/30 backdrop-blur-[4px] z-40"
        onClick={() => { sound.panelClose(); onClose(); }}
      />
      
      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto',
          'bg-card rounded-t-xl',
          'animate-fade-in-up',
        )}
        style={{ height: '60vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-sm bg-primary" />
        </div>

        <div className="px-5 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 40px)' }}>
          {/* Title */}
          <h2 className="text-base font-semibold mb-4">
            <span className="text-primary">{momoName}</span> 设置
          </h2>

          {/* Name */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">
              名字: {editing ? (
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && nameInput.trim()) {
                      onRename(nameInput);
                      setEditing(false);
                    }
                  }}
                  autoFocus
                  className="border-b border-primary bg-transparent outline-none w-20 text-sm"
                />
              ) : momoName}
            </span>
            <button
              onClick={() => {
                if (editing && nameInput.trim()) {
                  onRename(nameInput);
                  setEditing(false);
                } else {
                  setEditing(true);
                  setNameInput(momoName);
                }
              }}
              className="text-xs text-primary"
            >
              {editing ? '确认' : '改名'}
            </button>
          </div>

          {deviceId && (
            <p className="text-sm text-muted-foreground mb-4">
              设备: <span className="font-mono">{deviceId}</span>
            </p>
          )}

          <div className="border-t border-border-light my-3" />

          {/* Quiet mode */}
          {deviceId && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">安静模式</span>
                <button
                  onClick={() => onToggleQuiet(!quietMode)}
                  className={cn(
                    'w-10 h-5 rounded-full relative transition-colors',
                    quietMode ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform',
                      quietMode ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">让我安静一会儿~</p>

              <div className="border-t border-border-light my-3" />
            </>
          )}

          {/* Friends */}
          {deviceId && (
            <>
              <h3 className="text-sm font-medium mb-2">好友</h3>
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground mb-3">还没有好友呢~</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {friends.map(f => (
                    <div key={f.userId}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {f.nickname}
                          {f.isWhitelist && (
                            <span className="text-xs text-muted-foreground ml-1">(白名单)</span>
                          )}
                        </span>
                        <button
                          onClick={() => setExpandedFriend(expandedFriend === f.userId ? null : f.userId)}
                          className="text-xs text-primary"
                        >
                          管理
                        </button>
                      </div>
                      {expandedFriend === f.userId && (
                        <div className="flex gap-2 mt-1 pl-2">
                          <button
                            onClick={() => onToggleWhitelist(f.userId, !f.isWhitelist)}
                            className="text-xs text-primary"
                          >
                            {f.isWhitelist ? '取消白名单' : '设为白名单'}
                          </button>
                          {confirmDelete === f.userId ? (
                            <button
                              onClick={() => { onRemoveFriend(f.userId); setConfirmDelete(null); }}
                              className="text-xs text-primary font-medium"
                            >
                              确认解除
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(f.userId)}
                              className="text-xs text-primary"
                            >
                              解除好友
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onCopyInvite}
                className="w-full py-2 rounded-md border border-primary text-primary text-sm mb-3 transition-bouncy active:bg-primary-light"
              >
                复制邀请链接
              </button>

              <div className="border-t border-border-light my-3" />

              <button
                onClick={onCallFriends}
                className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-bouncy active:scale-95"
              >
                呼叫好友来陪我！
              </button>
            </>
          )}

          {/* No device */}
          {!deviceId && (
            <button
              onClick={onBindDevice}
              className="w-full py-2.5 rounded-md border border-primary text-primary text-sm font-medium transition-bouncy active:bg-primary-light"
            >
              绑定设备
            </button>
          )}
        </div>
      </div>
    </>
  );
}
