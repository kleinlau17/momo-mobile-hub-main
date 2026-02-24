export interface User {
  id: string;
  nickname: string;
  momoName: string;
  deviceId: string | null;
  friends: Friend[];
}

export interface Friend {
  userId: string;
  nickname: string;
  momoName: string;
  deviceId: string | null;
  isWhitelist: boolean;
}

export interface MomoStatus {
  userPresent: boolean;
  mood: 'positive' | 'neutral' | 'negative';
  quietMode: boolean;
  controlledBy: string | null;
  controllerName: string | null;
  currentAction: string | null;
  online: boolean;
}

export interface InitData {
  user: User;
  myMomoStatus: MomoStatus | null;
  friendMomoStatuses: Record<string, MomoStatus>;
}

export type MomoAction = 'POKE' | 'NUDGE' | 'WAVE_HI' | 'DANCE';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type ActionContext = 'self' | 'control' | 'retaliate';
