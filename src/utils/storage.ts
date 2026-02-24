const STORAGE_KEYS = {
  userId: 'momo_user_id',
  onboardingDone: 'momo_onboarding_done',
  gestureGuideShown: 'momo_gesture_guide_shown',
  firstTapGuideShown: 'momo_first_tap_guide',
  firstControlledGuideShown: 'momo_first_controlled_guide',
  mockMode: 'momo_mock_mode',
  dragGuideShown: 'momo_drag_guide_shown',
  firstDriveGuideShown: 'momo_first_drive_guide',
  userProfile: 'momo_user_profile',
} as const;

export interface UserProfile {
  nickname: string;
  momoName: string;
  deviceId: string | null;
}

export function getUserProfile(): UserProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.userProfile);
  try {
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function setUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
}

export function getUserId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.userId);
}

export function setUserId(id: string) {
  localStorage.setItem(STORAGE_KEYS.userId, id);
}

export function clearUserId() {
  localStorage.removeItem(STORAGE_KEYS.userId);
}

export function getFlag(key: keyof typeof STORAGE_KEYS): boolean {
  return localStorage.getItem(STORAGE_KEYS[key]) === 'true';
}

export function setFlag(key: keyof typeof STORAGE_KEYS, value: boolean) {
  localStorage.setItem(STORAGE_KEYS[key], String(value));
}

export function isMockMode(): boolean {
  return localStorage.getItem(STORAGE_KEYS.mockMode) === 'true';
}

export function setMockMode(enabled: boolean) {
  localStorage.setItem(STORAGE_KEYS.mockMode, String(enabled));
}
