import type { User, Friend, MomoStatus, InitData, MomoAction } from '@/types/momo';

const DEMO_USER: User = {
  id: 'user_001',
  nickname: '小A',
  momoName: '豆豆',
  deviceId: 'MOMO-A3F8',
  friends: [
    { userId: 'user_002', nickname: '小B', momoName: '年糕', deviceId: 'MOMO-B7K2', isWhitelist: true },
    { userId: 'user_003', nickname: '小C', momoName: '团子', deviceId: null, isWhitelist: false },
  ],
};

const DEMO_STATUS: MomoStatus = {
  userPresent: true,
  mood: 'positive',
  quietMode: false,
  controlledBy: null,
  controllerName: null,
  currentAction: null,
  online: true,
};

const FRIEND_STATUSES: Record<string, MomoStatus> = {
  'MOMO-B7K2': {
    userPresent: true,
    mood: 'neutral',
    quietMode: false,
    controlledBy: null,
    controllerName: null,
    currentAction: null,
    online: true,
  },
};

export type MockCallbackMode = 'always_success' | 'random_timeout' | 'always_timeout';

let callbackMode: MockCallbackMode = 'always_success';
let currentUser: User = { ...DEMO_USER };
let myStatus: MomoStatus = { ...DEMO_STATUS };
let friendStatuses: Record<string, MomoStatus> = { ...FRIEND_STATUSES };

// Event listeners
type Listener = (data: any) => void;
const listeners: Record<string, Listener[]> = {};

export function mockOn(event: string, cb: Listener) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(cb);
}

export function mockOff(event: string, cb: Listener) {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter(l => l !== cb);
  }
}

function emit(event: string, data: any) {
  listeners[event]?.forEach(cb => cb(data));
}

export function setCallbackMode(mode: MockCallbackMode) {
  callbackMode = mode;
}

export function getCallbackMode(): MockCallbackMode {
  return callbackMode;
}

export function mockRegister(nickname: string, momoName: string, deviceId: string | null): Promise<{ userId: string }> {
  return new Promise(resolve => {
    setTimeout(() => {
      currentUser = {
        id: 'user_' + Date.now(),
        nickname,
        momoName,
        deviceId,
        friends: [],
      };
      myStatus = {
        ...DEMO_STATUS,
        online: !!deviceId,
      };
      resolve({ userId: currentUser.id });
    }, 800);
  });
}

export function mockConnect(): Promise<InitData> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        user: currentUser,
        myMomoStatus: currentUser.deviceId ? myStatus : null,
        friendMomoStatuses: friendStatuses,
      });
    }, 600);
  });
}

export function mockDoAction(targetDeviceId: string, action: MomoAction): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      if (callbackMode === 'always_timeout') {
        // Don't resolve, let it timeout
        return;
      }
      if (callbackMode === 'random_timeout' && Math.random() > 0.5) {
        return;
      }
      resolve({ success: true });
    }, delay);
  });
}

export function mockRequestControl(targetDeviceId: string): Promise<{ approved: boolean }> {
  const friend = currentUser.friends.find(f => f.deviceId === targetDeviceId);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ approved: friend?.isWhitelist ?? false });
    }, friend?.isWhitelist ? 300 : 2000);
  });
}

export function mockGenerateInvite(): Promise<{ inviteCode: string; link: string }> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  return Promise.resolve({
    inviteCode: code,
    link: `${window.location.origin}/join/${code}`,
  });
}

export function mockAcceptInvite(inviteCode: string): Promise<{ success: boolean; friend?: Friend }> {
  return new Promise(resolve => {
    setTimeout(() => {
      const newFriend: Friend = {
        userId: 'user_' + Date.now(),
        nickname: '新朋友',
        momoName: '布丁',
        deviceId: 'MOMO-X' + Math.random().toString(36).substring(2, 5).toUpperCase(),
        isWhitelist: false,
      };
      currentUser.friends.push(newFriend);
      resolve({ success: true, friend: newFriend });
    }, 800);
  });
}

export function mockBindDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    setTimeout(() => {
      currentUser.deviceId = deviceId;
      myStatus = { ...DEMO_STATUS, online: true };
      resolve({ success: true });
    }, 800);
  });
}

export function mockRenameMomo(newName: string) {
  currentUser.momoName = newName;
}

export function mockSetQuietMode(enabled: boolean) {
  myStatus.quietMode = enabled;
}

export function mockSetMyStatus(updates: Partial<MomoStatus>) {
  myStatus = { ...myStatus, ...updates };
}

export function mockRemoveFriend(friendId: string) {
  currentUser.friends = currentUser.friends.filter(f => f.userId !== friendId);
}

export function mockSetWhitelist(friendId: string, isWhitelist: boolean) {
  const friend = currentUser.friends.find(f => f.userId === friendId);
  if (friend) friend.isWhitelist = isWhitelist;
}

// Simulate events from backend
export function mockSimulateEmotionAlert(friendIndex: number = 0) {
  const friend = currentUser.friends[friendIndex];
  if (friend) {
    emit('emotion_alert', {
      deviceId: friend.deviceId,
      ownerName: friend.nickname,
      momoName: friend.momoName,
    });
  }
}

export function mockSimulateControlRequest() {
  emit('control_request', {
    requesterId: 'user_002',
    requesterName: '小B',
    deviceId: currentUser.deviceId,
  });
}

export function mockSimulateControlled() {
  myStatus.controlledBy = 'user_002';
  myStatus.controllerName = '小B';
  emit('status_update', {
    deviceId: currentUser.deviceId,
    ...myStatus,
  });
}

export function mockSimulateControlEnd() {
  myStatus.controlledBy = null;
  myStatus.controllerName = null;
  emit('status_update', {
    deviceId: currentUser.deviceId,
    ...myStatus,
  });
}

export { currentUser, myStatus, friendStatuses };
