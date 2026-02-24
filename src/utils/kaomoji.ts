export const KAOMOJI_POOL: Record<string, string[]> = {
  happy:     ['(￣▽￣)', '(＾▽＾)', '(*´▽`*)', '(o´▽`o)', 'ヽ(✿ﾟ▽ﾟ)ノ'],
  normal:    ['(・ω・)', '(・ω・ )', '( ・ω・)', '(°ω°)'],
  sad:       ['(´·ω·`)', '(；ω；)', '(╥ω╥)', '(っ˘̩╭╮˘̩)っ'],
  sleeping:  ['(-.-)zzZ', '(￣o￣)zzZ', '(-_-)zzZ'],
  quiet:     ['(￣︶￣)'],
  poked:     ['(>_<)', '(っ°Д°)っ', 'Σ(°ロ°)', '(ﾉ°▽°)ﾉ'],
  nudged:    ['(*/ω＼*)', '(*ﾉωﾉ)', '(〃∀〃)', '(*´꒳`*)'],
  waved:     ['(￣▽￣)/', '(＾▽＾)/', '(o´▽`o)/'],
  dancing:   ['ヾ(≧▽≦)ゝ', 'ヽ(・∀・)ﾉ', '┌(★ｏ☆)┘', '♪(´▽｀)'],
  excited:   ['(((o(*ﾟ▽ﾟ*)o)))', 'ヾ(＾∇＾)', '(*≧▽≦)', 'ヽ(✿ﾟ▽ﾟ)ノ'],
  shy:       ['(*ﾉωﾉ)', '(〃ω〃)', '(*´꒳`*)', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)'],
  angry:     ['(╯°□°）╯', '(￣^￣)', '(`Д´)', '(°ロ°)！'],
  surprised: ['Σ(°ロ°)', '(ﾟOﾟ)', 'Σ(*ﾟдﾟ*)', '(°o°)！'],
  controlled:['(◉▽◉)'],
  noBody:    ['(｡·ω·｡)'],
  offline:   ['(；ω；)'],
  greeting:  ['(＾▽＾)'],
  curious:   ['(・ω・)?'],
  poking:    ['(σ‾▿‾)σ'],
};

// Legacy single-value access for backward compat
export const KAOMOJI: Record<string, string> = Object.fromEntries(
  Object.entries(KAOMOJI_POOL).map(([k, v]) => [k, v[0]])
);

export type KaomojiKey = keyof typeof KAOMOJI_POOL;

export function getKaomoji(state: string): string {
  const pool = KAOMOJI_POOL[state] ?? KAOMOJI_POOL.normal;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const ACTION_KAOMOJI: Record<string, { executing: KaomojiKey; reaction: KaomojiKey; animation: string }> = {
  POKE:    { executing: 'poking', reaction: 'poked',   animation: 'animate-jump' },
  NUDGE:   { executing: 'poking', reaction: 'nudged',  animation: 'animate-wiggle' },
  WAVE_HI: { executing: 'poking', reaction: 'waved',   animation: 'animate-bounce-q' },
  DANCE:   { executing: 'poking', reaction: 'dancing', animation: 'animate-jump' },
};

// Frame animation definitions: states that cycle between frames
export const FRAME_ANIMATIONS: Record<string, { frames: string[]; interval: number }> = {
  dancing:  { frames: ['ヾ(≧▽≦)ゝ', 'ヾ(≦▽≧)ゞ'], interval: 600 },
  thinking: { frames: ['(・ω・)?', '(?・ω・)'], interval: 600 },
  sleeping: { frames: ['(-.-)zzZ', '(-_-)zzZ'], interval: 600 },
};

export const MOMO_NAME_POOL = ['年糕', '麻薯', '团子', '豆豆', '芋圆', '丸子', '饭团', '汤圆', '糍粑', '布丁'];

export function getRandomNames(count: number = 3): string[] {
  const shuffled = [...MOMO_NAME_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getMoodKaomoji(mood: string, hasDevice: boolean): string {
  if (!hasDevice) return getKaomoji('noBody');
  switch (mood) {
    case 'positive': return getKaomoji('happy');
    case 'negative': return getKaomoji('sad');
    default: return getKaomoji('normal');
  }
}

/** 情绪标签（fake_emotion / Autodl）→ 颜文字 key */
export const EMOTION_TO_KAOMOJI_KEY: Record<string, KaomojiKey> = {
  '开心': 'happy',
  '伤心': 'sad',
  '焦虑': 'angry',
  '无聊': 'sleeping',
  '无人': 'noBody',
};

/** 根据情绪标签获取颜文字，用于本地验证时随情绪变化 */
export function getEmotionKaomoji(emotion: string | undefined, hasDevice: boolean): string {
  if (!hasDevice) return getKaomoji('noBody');
  if (emotion && EMOTION_TO_KAOMOJI_KEY[emotion]) {
    return getKaomoji(EMOTION_TO_KAOMOJI_KEY[emotion]);
  }
  return getKaomoji('normal');
}
