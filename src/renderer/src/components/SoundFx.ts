import { useEffect } from 'react';

// WebAudio 合成 UI 音效（自 ui-demo/index-v3.html 的 SND 模块移植，行为保持）
// 浏览器自动播放策略：首次用户手势解锁 AudioContext（useSoundFx 挂监听）

const STORAGE_KEY = 'zion.snd';

let ac: AudioContext | null = null;
let enabled = true;

try {
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
} catch {
  /* 无痕/禁用存储时默认开 */
}

function ctx(): AudioContext | null {
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') void ac.resume();
  return ac;
}

interface ToneOpts {
  delay?: number;
  slide?: number;
  vol?: number;
  type?: OscillatorType;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  if (!enabled) return;
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + (opts.delay || 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.vol || 0.035, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const SND = {
  blip: () => tone(880, 0.06),
  send: () => {
    tone(660, 0.06);
    tone(1320, 0.09, { delay: 0.05 });
  },
  step: () => tone(1250, 0.035, { type: 'sine', vol: 0.022 }),
  reply: () => {
    tone(523, 0.08, { type: 'sine' });
    tone(784, 0.1, { delay: 0.07, type: 'sine' });
  },
  abort: () => tone(220, 0.18, { type: 'sawtooth', slide: 90, vol: 0.05 }),
  toggle(): boolean {
    enabled = !enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    if (enabled) tone(880, 0.06);
    return enabled;
  },
  unlock: () => ctx(),
};

/** 挂载后监听首次用户手势解锁 AudioContext（幂等；unlock 是惰性的） */
export function useSoundFx() {
  useEffect(() => {
    const unlock = () => SND.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
}
