import React, { useState, useEffect, useCallback, useRef, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import MomoAvatar from '@/components/MomoAvatar';
import FriendCarousel from '@/components/FriendCarousel';
import GestureArea from '@/components/GestureArea';
import ActionButtons from '@/components/ActionButtons';
import ConnectionDot from '@/components/ConnectionDot';
import SettingsPanel from '@/components/SettingsPanel';
import AddFriendModal from '@/components/AddFriendModal';
import ControlRequestPopup from '@/components/ControlRequestPopup';
import EmotionAlertBanner from '@/components/EmotionAlertBanner';
import DebugPanel from '@/components/DebugPanel';
import LoadingDots from '@/components/LoadingDots';
import { KAOMOJI, getKaomoji, getMoodKaomoji, getEmotionKaomoji, ACTION_KAOMOJI } from '@/utils/kaomoji';
import { getUserId, getFlag, setFlag, isMockMode, setMockMode, getUserProfile } from '@/utils/storage';
import { connectSocket, disconnectSocket } from '@/services/socket';
import sound, { useSound } from '@/utils/sounds';
import {
  mockConnect,
  mockDoAction,
  mockRequestControl,
  mockGenerateInvite,
  mockAcceptInvite,
  mockRenameMomo,
  mockSetQuietMode,
  mockRemoveFriend,
  mockSetWhitelist,
  mockSetMyStatus,
  mockOn,
  mockOff,
} from '@/services/mock';
import type { User, Friend, MomoStatus, MomoAction, ConnectionStatus as ConnStatus } from '@/types/momo';
import { cn } from '@/lib/utils';

type ViewMode = 'home' | 'controlling' | 'loading';

export default function Home() {
  const navigate = useNavigate();
  const { muted, toggleMute } = useSound();
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [myStatus, setMyStatus] = useState<MomoStatus | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, MomoStatus>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnStatus>('connecting');
  const [mockMode, setMockModeState] = useState(isMockMode());

  // UI states
  const [currentKaomoji, setCurrentKaomoji] = useState<string>(KAOMOJI.normal);
  const [animClass, setAnimClass] = useState('');
  const [frameAnimState, setFrameAnimState] = useState<string | undefined>();
  const [controllingFriend, setControllingFriend] = useState<Friend | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'executing' | 'success' | 'timeout'>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [controlRequest, setControlRequest] = useState<{ requesterName: string; requesterId: string } | null>(null);
  const [emotionAlert, setEmotionAlert] = useState<{ ownerName: string; momoName: string; deviceId: string; type: 'emotion' | 'call' } | null>(null);
  const [showFirstTapGuide, setShowFirstTapGuide] = useState(!getFlag('firstTapGuideShown'));
  const [showDragGuide, setShowDragGuide] = useState(!getFlag('dragGuideShown'));
  const [copiedMsg, setCopiedMsg] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastInteraction = useRef(Date.now());

  // Driving mode state
  const [isDriving, setIsDriving] = useState(false);
  const [lastMoveCommand, setLastMoveCommand] = useState<{ direction: string | null; intensity: number } | null>(null);

  // Real socket ref (used outside useEffect for drive callbacks)
  const socketRef = useRef<Socket | null>(null);

  // Load data
  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      navigate('/');
      return;
    }

    if (mockMode) {
      mockConnect().then(data => {
        setUser(data.user);
        setMyStatus(data.myMomoStatus);
        setFriendStatuses(data.friendMomoStatuses);
        setConnectionStatus('connected');
        setViewMode('home');
        updateKaomoji(data.myMomoStatus, data.user.deviceId);
      });

      // Listen for mock events
      const onStatusUpdate = (data: any) => {
        setMyStatus(prev => prev ? { ...prev, ...data } : null);
      };
      const onControlRequest = (data: any) => {
        setControlRequest({ requesterName: data.requesterName, requesterId: data.requesterId });
      };
      const onEmotionAlert = (data: any) => {
        setEmotionAlert({ ...data, type: 'emotion' });
      };
      const onFriendCall = (data: any) => {
        setEmotionAlert({ ...data, type: 'call' });
      };

      mockOn('status_update', onStatusUpdate);
      mockOn('control_request', onControlRequest);
      mockOn('emotion_alert', onEmotionAlert);
      mockOn('friend_call', onFriendCall);

      return () => {
        mockOff('status_update', onStatusUpdate);
        mockOff('control_request', onControlRequest);
        mockOff('emotion_alert', onEmotionAlert);
        mockOff('friend_call', onFriendCall);
      };
    } else {
      // Real socket mode: connect to local Socket.IO backend (server.py)
      const profile = getUserProfile();
      const sock = connectSocket();
      socketRef.current = sock;
      setConnectionStatus('connecting');

      sock.on('connect', () => {
        setConnectionStatus('connected');
        // Register with the backend using locally stored profile
        sock.emit(
          'register',
          {
            nickname: profile?.nickname ?? '用户',
            momoName: profile?.momoName ?? 'MoMo',
            deviceId: profile?.deviceId ?? null,
          },
          (data: any) => {
            if (data?.user) {
              setUser(data.user);
              setMyStatus(data.myMomoStatus);
              setFriendStatuses(data.friendMomoStatuses ?? {});
              setViewMode('home');
              updateKaomoji(data.myMomoStatus, data.user.deviceId);
            }
          },
        );
      });

      sock.on('disconnect', () => setConnectionStatus('disconnected'));
      sock.on('reconnect_attempt', () => setConnectionStatus('connecting'));
      sock.on('reconnect', () => setConnectionStatus('connected'));

      // Emotion detection updates MoMo mood and kaomoji
      sock.on('status_update', ({ status }: any) => {
        setMyStatus(prev => {
          const next = prev ? { ...prev, ...status } : (status as MomoStatus);
          return next;
        });
      });

      // Concerning emotion triggers the alert banner
      sock.on('emotion_alert', (data: any) => {
        setEmotionAlert({ ...data, type: 'emotion' });
      });

      sock.on('control_request', (data: any) => {
        setControlRequest({ requesterName: data.requesterName, requesterId: data.requesterId });
      });

      sock.on('friend_call', (data: any) => {
        setEmotionAlert({ ...data, type: 'call' });
      });

      return () => {
        socketRef.current = null;
        disconnectSocket();
      };
    }
  }, [navigate, mockMode]);

  const updateKaomoji = (status: MomoStatus | null, deviceId: string | null) => {
    setFrameAnimState(undefined);
    const emotion = (status as MomoStatus & { emotion?: string })?.emotion;
    if (!deviceId) {
      setCurrentKaomoji(getKaomoji('noBody'));
    } else if (emotion === '无人') {
      setCurrentKaomoji(getKaomoji('noBody'));
    } else if (status?.controlledBy) {
      setCurrentKaomoji(getKaomoji('controlled'));
    } else if (status?.quietMode) {
      setCurrentKaomoji(getKaomoji('quiet'));
    } else if (emotion) {
      setCurrentKaomoji(getEmotionKaomoji(emotion, true));
    } else {
      setCurrentKaomoji(getMoodKaomoji(status?.mood || 'neutral', true));
    }
  };

  // Idle detection → sleeping after 5 min
  const resetIdleTimer = useCallback(() => {
    lastInteraction.current = Date.now();
    if (idleTimer.current) clearTimeout(idleTimer.current);
    // If currently sleeping from idle, restore
    if (frameAnimState === 'sleeping' && !controllingFriend) {
      setFrameAnimState(undefined);
      updateKaomoji(myStatus, user?.deviceId ?? null);
    }
    idleTimer.current = setTimeout(() => {
      if (!controllingFriend && viewMode === 'home') {
        setFrameAnimState('sleeping');
      }
    }, 5 * 60 * 1000);
  }, [frameAnimState, controllingFriend, viewMode, myStatus, user]);

  useEffect(() => {
    resetIdleTimer();
    const handler = () => resetIdleTimer();
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (user && myStatus !== undefined) {
      updateKaomoji(myStatus, user.deviceId);
    }
    // 当情绪离开告警区（伤心/焦虑/无聊）时自动关闭提醒横幅
    const emotion = (myStatus as any)?.emotion as string | undefined;
    if (emotion && !['伤心', '焦虑', '无聊'].includes(emotion)) {
      setEmotionAlert(null);
    }
  }, [myStatus, user]);

  // Handle self tap - Fix F: target controller's device when controlled
  const handleSelfTap = useCallback(() => {
    if (actionInProgress) return;
    if (showFirstTapGuide) {
      setShowFirstTapGuide(false);
      setFlag('firstTapGuideShown', true);
    }

    if (!user?.deviceId) {
      setCurrentKaomoji(getKaomoji('greeting'));
      setAnimClass('animate-bounce-q');
      setTimeout(() => {
        setCurrentKaomoji(getKaomoji('noBody'));
        setAnimClass('');
      }, 1500);
      return;
    }

    const actions: MomoAction[] = ['POKE', 'NUDGE', 'WAVE_HI', 'DANCE'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    // When controlled, retaliate to controller's device; otherwise target self
    const targetId = myStatus?.controlledBy ?? user.deviceId;
    const context = myStatus?.controlledBy ? 'retaliate' : 'self';
    handleAction(targetId, action, context);
  }, [user, actionInProgress, showFirstTapGuide, myStatus]);

  // Handle action
  const handleAction = useCallback(async (targetDeviceId: string, action: MomoAction, _context: string) => {
    setActionInProgress(true);
    setActionStatus('executing');

    const info = ACTION_KAOMOJI[action];
    setFrameAnimState(undefined);
    if (controllingFriend) {
      setCurrentKaomoji(getKaomoji(info.executing));
    }

    // 真实模式：通过 socket 发送 perform_action 给 server.py
    const doAction = mockMode
      ? mockDoAction(targetDeviceId, action)
      : new Promise<{ success: boolean }>((resolve, reject) => {
          if (!socketRef.current) { reject('no socket'); return; }
          socketRef.current.emit(
            'perform_action',
            { action, targetDeviceId },
            (res: any) => res?.success ? resolve(res) : reject(res),
          );
        });

    try {
      const result = await Promise.race([
        doAction,
        new Promise<null>((_, reject) => setTimeout(() => reject('timeout'), 5000)),
      ]);

      setActionStatus('success');
      sound.success();
      setCurrentKaomoji(getKaomoji(info.reaction));
      setAnimClass(info.animation);

      setTimeout(() => {
        setAnimClass('');
        setActionStatus('idle');
        setActionInProgress(false);
        if (controllingFriend) {
          setCurrentKaomoji(getKaomoji('normal'));
        } else {
          updateKaomoji(myStatus, user?.deviceId ?? null);
        }
      }, 1500);
    } catch {
      setActionStatus('timeout');
      sound.timeout();
      setCurrentKaomoji(getKaomoji('offline'));

      setTimeout(() => {
        setActionStatus('idle');
        setActionInProgress(false);
        if (controllingFriend) {
          setCurrentKaomoji(getKaomoji('normal'));
        } else {
          updateKaomoji(myStatus, user?.deviceId ?? null);
        }
      }, 1500);
    }
  }, [controllingFriend, myStatus, user]);

  // Control friend
  const handleControlFriend = useCallback(async (friend: Friend) => {
    if (!friend.deviceId) return;

    // Hide drag guide on first successful drag/control
    if (showDragGuide) {
      setShowDragGuide(false);
      setFlag('dragGuideShown', true);
    }

    setControllingFriend(friend);
    sound.flyIn();
    // Show thinking frame animation while waiting for approval
    setFrameAnimState('thinking');
    setViewMode('controlling');

    try {
      const result = await Promise.race([
        mockRequestControl(friend.deviceId),
        new Promise<{ approved: false }>((resolve) => setTimeout(() => resolve({ approved: false }), 30000)),
      ]);

      setFrameAnimState(undefined);
      if (!result.approved) {
        // Control rejected → angry, then exit
        setCurrentKaomoji(getKaomoji('angry'));
        setAnimClass('animate-wiggle');
        setTimeout(() => {
          setAnimClass('');
          exitControl();
        }, 1000);
      } else {
        setCurrentKaomoji(getKaomoji('normal'));
      }
    } catch {
      exitControl();
    }
  }, [showDragGuide]);

  const exitControl = useCallback(() => {
    setControllingFriend(null);
    setViewMode('home');
    updateKaomoji(myStatus, user?.deviceId ?? null);
  }, [myStatus, user]);

  // Settings actions
  const handleRename = useCallback((name: string) => {
    mockRenameMomo(name);
    setUser(prev => prev ? { ...prev, momoName: name } : null);
  }, []);

  const handleToggleQuiet = useCallback((enabled: boolean) => {
    mockSetQuietMode(enabled);
    setMyStatus(prev => prev ? { ...prev, quietMode: enabled } : null);
  }, []);

  const handleCopyInvite = useCallback(async () => {
    const result = await mockGenerateInvite();
    await navigator.clipboard?.writeText(result.link);
    setCopiedMsg('已复制~');
    setTimeout(() => setCopiedMsg(''), 1500);
  }, []);

  const handleAcceptInvite = useCallback(async (code: string) => {
    setInviteLoading(true);
    setInviteError('');
    const result = await mockAcceptInvite(code);
    setInviteLoading(false);
    if (result.success && result.friend) {
      sound.friendAdded();
      setUser(prev => prev ? { ...prev, friends: [...prev.friends, result.friend!] } : null);
      setAddFriendOpen(false);
      // Excited animation for 2s
      setCurrentKaomoji(getKaomoji('excited'));
      setAnimClass('animate-scale-in');
      setTimeout(() => {
        setAnimClass('');
        updateKaomoji(myStatus, user?.deviceId ?? null);
      }, 2000);
    } else {
      setInviteError('找不到这个邀请码呢 (；ω；)');
    }
  }, []);

  const handleRemoveFriend = useCallback((friendId: string) => {
    mockRemoveFriend(friendId);
    setUser(prev => prev ? { ...prev, friends: prev.friends.filter(f => f.userId !== friendId) } : null);
  }, []);

  const handleToggleWhitelist = useCallback((friendId: string, val: boolean) => {
    mockSetWhitelist(friendId, val);
    setUser(prev => prev ? {
      ...prev,
      friends: prev.friends.map(f => f.userId === friendId ? { ...f, isWhitelist: val } : f),
    } : null);
  }, []);

  const handleControlRequestResponse = useCallback((approved: boolean) => {
    setControlRequest(null);
    if (approved) {
      // First time being controlled → shy, then controlled
      const isFirstControl = !getFlag('firstControlledGuideShown');
      if (isFirstControl) {
        setFlag('firstControlledGuideShown', true);
        setCurrentKaomoji(getKaomoji('shy'));
        setTimeout(() => {
          setCurrentKaomoji(getKaomoji('controlled'));
        }, 1500);
      }
    }
  }, []);

  const handleDismissAlert = useCallback(() => {
    setEmotionAlert(null);
  }, []);

  const handleSetMood = useCallback((mood: string) => {
    mockSetMyStatus({ mood: mood as any });
    setMyStatus(prev => prev ? { ...prev, mood: mood as any } : null);
  }, []);

  // Loading state
  if (viewMode === 'loading') {
    return (
      <div className="momo-app flex flex-col items-center justify-center min-h-[100dvh]">
        <span className="text-[56px] leading-none animate-breathe">{KAOMOJI.curious}</span>
        <p className="mt-4 text-sm text-muted-foreground">
          正在找 MoMo<LoadingDots />
        </p>
      </div>
    );
  }

  if (!user) return null;

  const isControlled = myStatus?.controlledBy != null;
  const hasDevice = user.deviceId != null;

  return (
    <div className="momo-app flex flex-col min-h-[100dvh] relative">
      {/* Connection dot + mute button */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="text-base text-muted-foreground bg-transparent border-none cursor-pointer"
        >
          {muted ? '×♪' : '♪'}
        </button>
        <ConnectionDot status={connectionStatus} />
      </div>

      {/* Copied message */}
      {copiedMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-card px-3 py-1 rounded text-xs text-primary border border-primary animate-fade-in-up">
          {copiedMsg}
        </div>
      )}

      {/* Control request popup */}
      {controlRequest && (
        <ControlRequestPopup
          requesterName={controlRequest.requesterName}
          momoName={user.momoName}
          onApprove={() => handleControlRequestResponse(true)}
          onReject={() => handleControlRequestResponse(false)}
        />
      )}

      {/* Controlling mode */}
      {viewMode === 'controlling' && controllingFriend && (
        <div className="flex-1 flex flex-col">
          {/* Back button */}
          <button
            onClick={exitControl}
            className="absolute top-4 left-4 z-10 text-primary text-xl"
          >
            ←
          </button>

          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {/* Emotion alert banner */}
            {emotionAlert && (
              <EmotionAlertBanner
                ownerName={emotionAlert.ownerName}
                momoName={emotionAlert.momoName}
                type={emotionAlert.type}
                onDismiss={handleDismissAlert}
              />
            )}

            {/* Friend name */}
            <p className="text-sm mb-4">
              <span className="text-muted-foreground">{controllingFriend.nickname} 的 </span>
              <span className="text-primary font-semibold">{controllingFriend.momoName}</span>
            </p>

            {/* Gesture area */}
            <GestureArea
              kaomoji={currentKaomoji}
              animationClass={animClass}
              onGesture={(action) => handleAction(controllingFriend.deviceId!, action, 'control')}
              disabled={actionInProgress}
            />

            {/* Action status */}
            <div className="h-8 flex items-center justify-center mt-3">
              {actionStatus === 'executing' && (
                <span className="text-xs text-muted-foreground">执行中<LoadingDots /></span>
              )}
              {actionStatus === 'success' && (
                <span className="text-xs text-primary font-medium">✓</span>
              )}
              {actionStatus === 'timeout' && (
                <span className="text-xs text-muted-foreground">MoMo 好像睡着了呢...</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 w-full">
              <ActionButtons
                onAction={(action) => handleAction(controllingFriend.deviceId!, action, 'control')}
                disabled={actionInProgress}
              />
            </div>
          </div>
        </div>
      )}

      {/* Home mode */}
      {viewMode === 'home' && (
        <>
          {/* Central area - My MoMo */}
          <div className="flex-1 flex flex-col items-center justify-center px-4" style={{ minHeight: '75vh' }}>
            {/* Emotion alert */}
            {emotionAlert && (
              <EmotionAlertBanner
                ownerName={emotionAlert.ownerName}
                momoName={emotionAlert.momoName}
                type={emotionAlert.type}
                onDismiss={handleDismissAlert}
              />
            )}

            {/* MoMo name */}
            <p className="text-base font-semibold text-primary mb-2">{user.momoName}</p>

            {/* MoMo avatar */}
            <MomoAvatar
              kaomoji={currentKaomoji}
              size="lg"
              animationClass={animClass}
              frameAnimationState={frameAnimState}
              onClick={handleSelfTap}
              onLongPress={() => setSettingsOpen(true)}
              onDrivingMode={() => setIsDriving(true)}
              isDriving={isDriving}
              onDrivingDrag={(direction, intensity) => {
                setLastMoveCommand({ direction, intensity });
                socketRef.current?.emit('move_robot', { direction, intensity });
              }}
              onDrivingStop={() => {
                socketRef.current?.emit('stop_robot', {});
              }}
              onExitDriving={() => {
                setIsDriving(false);
                setLastMoveCommand(null);
              }}
            />

            {/* Status text */}
            <div className="mt-3 text-xs text-muted-foreground">
              {isControlled ? (
                <p>
                  <span className="text-primary">·</span>
                  {' '}{myStatus?.controllerName} 正在逗我玩{' '}
                  <span className="text-primary">·</span>
                </p>
              ) : hasDevice ? (
                <p>
                  <span className="text-primary">·</span>
                  {' '}陪伴中{' '}
                  <span className="text-primary">·</span>
                </p>
              ) : (
                <div className="text-center mt-2">
                  <p className="text-sm text-foreground">人家还没有肉身呢~</p>
                  <p className="text-xs text-muted-foreground mt-1">绑定设备让我活过来嘛！</p>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="mt-3 px-4 py-2 rounded-md border-[1.5px] border-primary text-primary text-sm transition-bouncy active:bg-primary-light"
                  >
                    绑定设备
                  </button>
                </div>
              )}
            </div>

            {/* First tap guide */}
            {showFirstTapGuide && hasDevice && !isDriving && (
              <p className="mt-4 text-[11px]">
                <span className="text-muted-foreground">点它逗它 · </span>
                <span className="text-primary">长按进驾驶 · 超长按进设置</span>
              </p>
            )}

            {/* Action status for self */}
            {actionStatus !== 'idle' && viewMode === 'home' && (
              <div className="mt-2 h-6 flex items-center">
                {actionStatus === 'executing' && <span className="text-xs text-muted-foreground">执行中<LoadingDots /></span>}
                {actionStatus === 'success' && <span className="text-xs text-primary">✓</span>}
                {actionStatus === 'timeout' && <span className="text-xs text-muted-foreground">MoMo 好像睡着了呢...</span>}
              </div>
            )}
          </div>

          {/* Friend bar */}
          <div className="border-t-2 border-primary" style={{ minHeight: '25vh' }}>
            <div className="py-3">
              {(() => {
                const carouselItems = user.friends.map(friend => {
                  const fStatus = friend.deviceId ? friendStatuses[friend.deviceId] : null;
                  const isOnline = fStatus?.online ?? false;
                  const fKaomoji = !friend.deviceId ? KAOMOJI.noBody
                    : !isOnline ? KAOMOJI.offline
                    : getMoodKaomoji(fStatus?.mood || 'neutral', true);
                  return {
                    id: friend.userId,
                    kaomoji: fKaomoji,
                    name: `${friend.nickname}的${friend.momoName}`,
                    isOnline: isOnline || !friend.deviceId,
                    isControlled: fStatus?.controlledBy != null,
                  };
                });
                // Add the (...) card at the end
                carouselItems.push({
                  id: '__add__',
                  kaomoji: '(...)',
                  name: '添加好友',
                  isAddButton: true,
                  isOnline: true,
                  isControlled: false,
                } as any);

                return (
                  <FriendCarousel
                    items={carouselItems}
                    onClickCenter={(item) => {
                      if (item.id === '__add__') {
                        setAddFriendOpen(true);
                      } else {
                        const friend = user.friends.find(f => f.userId === item.id);
                        if (friend?.deviceId) handleControlFriend(friend);
                      }
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        momoName={user.momoName}
        deviceId={user.deviceId}
        quietMode={myStatus?.quietMode ?? false}
        friends={user.friends}
        onRename={handleRename}
        onToggleQuiet={handleToggleQuiet}
        onCopyInvite={handleCopyInvite}
        onCallFriends={() => {}}
        onRemoveFriend={handleRemoveFriend}
        onToggleWhitelist={handleToggleWhitelist}
        onBindDevice={() => {}}
      />

      {/* Add friend modal */}
      <AddFriendModal
        isOpen={addFriendOpen}
        onClose={() => { setAddFriendOpen(false); setInviteError(''); }}
        onAcceptInvite={handleAcceptInvite}
        onCopyInviteLink={handleCopyInvite}
        hasDevice={hasDevice}
        error={inviteError}
        loading={inviteLoading}
      />

      {/* Debug panel */}
      <DebugPanel
        isMockMode={mockMode}
        onToggleMock={(val) => { setMockModeState(val); setMockMode(val); }}
        onSetMood={handleSetMood}
        lastMoveCommand={lastMoveCommand}
        currentEmotion={(myStatus as any)?.emotion}
      />
    </div>
  );
}
