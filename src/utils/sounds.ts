// ============================================================
// MoMo Sound Engine — Web Audio API 纯代码合成音效
// 无需任何音频文件，全部用 AudioContext 实时合成
// ============================================================

type OscType = OscillatorType;

interface NoteEvent {
  freq: number;
  duration: number;
  delay?: number;
  type?: OscType;
  volume?: number;
  attack?: number;
  decay?: number;
  slide?: number; // slide to this freq
}

// ────────────────────────────────────────────────────────────
// 核心引擎
// ────────────────────────────────────────────────────────────

class MomoSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted: boolean = false;
  private _volume: number = 0.5;

  get muted() { return this._muted; }
  get volume() { return this._volume; }

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : this._volume;
    localStorage.setItem('momo_sound_muted', String(muted));
  }

  setVolume(vol: number) {
    this._volume = vol;
    if (this.masterGain && !this._muted) this.masterGain.gain.value = vol;
  }

  loadMutedState() {
    const saved = localStorage.getItem('momo_sound_muted');
    if (saved === 'true') this._muted = true;
  }

  // ── 播放单音 ──────────────────────────────────────────────
  private playNote(note: NoteEvent) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const t = now + (note.delay ?? 0);
    const dur = note.duration;
    const attack = note.attack ?? 0.005;
    const decay = note.decay ?? 0.05;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = note.type ?? 'square';
    osc.frequency.setValueAtTime(note.freq, t);
    if (note.slide !== undefined) {
      osc.frequency.linearRampToValueAtTime(note.slide, t + dur);
    }

    const vol = (note.volume ?? 0.3);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.setValueAtTime(vol, t + dur - decay);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // ── 播放音符序列 ──────────────────────────────────────────
  private playSequence(notes: NoteEvent[]) {
    notes.forEach(n => this.playNote(n));
  }

  // ── 噪声爆破（用于打击感）────────────────────────────────
  private playNoise(delay = 0, duration = 0.08, vol = 0.15) {
    const ctx = this.getCtx();
    const now = ctx.currentTime + delay;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    source.start(now);
  }

  // ────────────────────────────────────────────────────────────
  // 音效库
  // ────────────────────────────────────────────────────────────

  /** 应用启动 — 上扬三音符开机音 */
  startup() {
    this.playSequence([
      { freq: 261, duration: 0.12, delay: 0,    type: 'square', volume: 0.25 },
      { freq: 392, duration: 0.12, delay: 0.13, type: 'square', volume: 0.25 },
      { freq: 523, duration: 0.25, delay: 0.26, type: 'square', volume: 0.3  },
    ]);
  }

  /** 点击逗MoMo — 短促Q弹噗声 */
  poke() {
    this.playNote({ freq: 520, duration: 0.08, type: 'sine', volume: 0.35, slide: 380 });
    this.playNoise(0, 0.05, 0.08);
  }

  /** MoMo被戳反应 (>_<) — 小惊叫上扬 */
  poked() {
    this.playSequence([
      { freq: 600, duration: 0.06, delay: 0,    type: 'sine', volume: 0.3, slide: 900 },
      { freq: 800, duration: 0.1,  delay: 0.07, type: 'sine', volume: 0.2, slide: 700 },
    ]);
  }

  // MoMo被蹭 — 软糯波动音
  nudged() {
    this.playSequence([
      { freq: 440, duration: 0.15, delay: 0,    type: 'sine', volume: 0.2, slide: 494 },
      { freq: 494, duration: 0.15, delay: 0.15, type: 'sine', volume: 0.2, slide: 440 },
      { freq: 440, duration: 0.1,  delay: 0.3,  type: 'sine', volume: 0.15 },
    ]);
  }

  /** MoMo跳舞 ヾ(≧▽≦)ゝ — 轻快8bit小旋律 */
  dancing() {
    const melody = [
      [523, 0.08], [659, 0.08], [784, 0.08], [659, 0.08],
      [523, 0.08], [784, 0.08], [1047, 0.16],
    ];
    let t = 0;
    melody.forEach(([freq, dur]) => {
      this.playNote({ freq: freq as number, duration: dur as number, delay: t, type: 'square', volume: 0.2 });
      t += (dur as number) + 0.01;
    });
  }

  /** MoMo招呼 (￣▽￣)/ — 清脆叮 */
  waved() {
    this.playNote({ freq: 880, duration: 0.15, type: 'triangle', volume: 0.3, attack: 0.002, decay: 0.12 });
    this.playNote({ freq: 1108, duration: 0.1, delay: 0.08, type: 'triangle', volume: 0.2, attack: 0.002, decay: 0.08 });
  }

  /** 卡片左右滑动 — 轻嗖声 */
  swipe() {
    this.playNote({ freq: 400, duration: 0.1, type: 'sine', volume: 0.15, slide: 600, decay: 0.08 });
    this.playNoise(0, 0.06, 0.06);
  }

  /** 好友MoMo飞入中央 — 嗖+叮 */
  flyIn() {
    this.playNote({ freq: 300, duration: 0.2, type: 'sine', volume: 0.2, slide: 800 });
    this.playNote({ freq: 1047, duration: 0.2, delay: 0.18, type: 'triangle', volume: 0.3, attack: 0.002, decay: 0.15 });
  }

  /** 操控按钮点击 — 红白机按键音 */
  buttonPress() {
    this.playNote({ freq: 220, duration: 0.06, type: 'square', volume: 0.25 });
    this.playNoise(0.01, 0.04, 0.1);
  }

  /** 动作执行成功 — 上扬叮咚 */
  success() {
    this.playSequence([
      { freq: 523, duration: 0.1,  delay: 0,    type: 'square', volume: 0.25 },
      { freq: 784, duration: 0.15, delay: 0.11, type: 'square', volume: 0.3  },
    ]);
  }

  /** 动作超时失败 — 低沉嘟 */
  timeout() {
    this.playNote({ freq: 180, duration: 0.25, type: 'square', volume: 0.25, slide: 120, decay: 0.2 });
  }

  /** 情绪通知到达 — 软萌三连叮 */
  emotionAlert() {
    this.playSequence([
      { freq: 784,  duration: 0.1, delay: 0,    type: 'triangle', volume: 0.3 },
      { freq: 784,  duration: 0.1, delay: 0.15, type: 'triangle', volume: 0.3 },
      { freq: 1047, duration: 0.2, delay: 0.3,  type: 'triangle', volume: 0.35 },
    ]);
  }

  /** 好友呼叫 — 节奏稍快的提示音 */
  callAlert() {
    this.playSequence([
      { freq: 880,  duration: 0.08, delay: 0,    type: 'triangle', volume: 0.3 },
      { freq: 1047, duration: 0.08, delay: 0.1,  type: 'triangle', volume: 0.3 },
      { freq: 880,  duration: 0.08, delay: 0.2,  type: 'triangle', volume: 0.3 },
      { freq: 1047, duration: 0.12, delay: 0.3,  type: 'triangle', volume: 0.35 },
    ]);
  }

  /** 添加好友成功 — 欢快上扬 */
  friendAdded() {
    this.playSequence([
      { freq: 392,  duration: 0.1,  delay: 0,    type: 'square', volume: 0.22 },
      { freq: 523,  duration: 0.1,  delay: 0.11, type: 'square', volume: 0.22 },
      { freq: 659,  duration: 0.1,  delay: 0.22, type: 'square', volume: 0.22 },
      { freq: 784,  duration: 0.2,  delay: 0.33, type: 'square', volume: 0.28 },
    ]);
  }

  /** 设置面板打开 — 低沉咔 */
  panelOpen() {
    this.playNote({ freq: 260, duration: 0.08, type: 'square', volume: 0.2 });
    this.playNoise(0.02, 0.04, 0.08);
  }

  /** 设置面板关闭 — 反向咔 */
  panelClose() {
    this.playNote({ freq: 200, duration: 0.08, type: 'square', volume: 0.18, slide: 150 });
    this.playNoise(0, 0.03, 0.07);
  }

  /** 引导页翻页 — 柔和切换 */
  pageTurn() {
    this.playNote({ freq: 330, duration: 0.12, type: 'sine', volume: 0.2, slide: 440 });
  }

  /** 注册完成欢迎旋律 — 完整小旋律 */
  welcome() {
    const melody: [number, number][] = [
      [523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1],
      [784, 0.1], [880, 0.1], [1047, 0.25],
      [784, 0.08], [880, 0.08], [1047, 0.08], [1319, 0.3],
    ];
    let t = 0;
    melody.forEach(([freq, dur]) => {
      this.playNote({ freq, duration: dur, delay: t, type: 'square', volume: 0.22 });
      t += dur + 0.015;
    });
  }

  /** 断线 — 下降长音 */
  disconnect() {
    this.playNote({ freq: 440, duration: 0.4, type: 'square', volume: 0.2, slide: 220, decay: 0.3 });
  }

  /** 重连成功 — 回弹上扬 */
  reconnect() {
    this.playSequence([
      { freq: 330, duration: 0.1,  delay: 0,    type: 'square', volume: 0.22 },
      { freq: 523, duration: 0.15, delay: 0.11, type: 'square', volume: 0.25 },
    ]);
  }

  /** 静音切换反馈音（不受静音开关影响） */
  muteToggle(nowMuted: boolean) {
    const ctx = this.getCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.2;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = nowMuted ? 300 : 600;
    osc.connect(gain);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

// ────────────────────────────────────────────────────────────
// 单例导出
// ────────────────────────────────────────────────────────────
export const sound = new MomoSoundEngine();
sound.loadMutedState();

// ────────────────────────────────────────────────────────────
// React Hook
// ────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

export function useSound() {
  const [muted, setMutedState] = useState(sound.muted);

  const toggleMute = useCallback(() => {
    const next = !sound.muted;
    sound.setMuted(next);
    sound.muteToggle(next);
    setMutedState(next);
  }, []);

  return { sound, muted, toggleMute };
}

export default sound;
