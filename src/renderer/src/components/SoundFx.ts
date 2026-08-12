// SND —— WebAudio 程序化合成音效（无音频文件）
// 参数照 ui-demo/index-v4.html（v4 规格 §9）：振荡器 + Gain 包络，
// gain 6ms 线性升到峰值，指数衰减到 0.0001；默认音量 0.03。
// 开启状态由 store.setSndOn 持久化（localStorage 'zion.snd'）。

interface ToneOpts {
  type?: OscillatorType;
  delay?: number;
  slide?: number;
  vol?: number;
}

class SoundFx {
  private ac: AudioContext | null = null;
  private enabled = true;

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  private ctx(): AudioContext | null {
    if (!this.ac) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ac = new AC();
    }
    if (this.ac.state === 'suspended') void this.ac.resume();
    return this.ac;
  }

  /** 单音：振荡器 + 包络（slide 用指数滑音） */
  private tone(freq: number, dur: number, opts: ToneOpts = {}) {
    if (!this.enabled) return;
    const a = this.ctx();
    if (!a) return;
    const t0 = a.currentTime + (opts.delay ?? 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = opts.type ?? 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opts.vol ?? 0.03, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  /** 发送消息：660Hz 方波 0.06s；延迟 0.05s 后 1320Hz 0.09s */
  send() {
    this.tone(660, 0.06);
    this.tone(1320, 0.09, { delay: 0.05 });
  }
  /** trace 每步完成：1250Hz 正弦 0.03s，音量 0.018 */
  step() {
    this.tone(1250, 0.03, { type: 'sine', vol: 0.018 });
  }
  /** 回复完成：523Hz 正弦 0.08s；延迟 0.07s 后 784Hz 0.1s */
  reply() {
    this.tone(523, 0.08, { type: 'sine' });
    this.tone(784, 0.1, { delay: 0.07, type: 'sine' });
  }
  /** 中断：220Hz 锯齿 0.16s，滑音至 90Hz，音量 0.04 */
  abort() {
    this.tone(220, 0.16, { type: 'sawtooth', slide: 90, vol: 0.04 });
  }
  /** 释放蠕虫：1800Hz 锯齿 0.06s，滑音至 380Hz，音量 0.016 */
  worm() {
    this.tone(1800, 0.06, { type: 'sawtooth', slide: 380, vol: 0.016 });
  }
  /** 蠕虫命中：140Hz 方波 0.12s 音量 0.035；延迟 0.1s 后 880Hz 0.08s 音量 0.022 */
  breach() {
    this.tone(140, 0.12, { type: 'square', vol: 0.035 });
    this.tone(880, 0.08, { delay: 0.1, vol: 0.022 });
  }
  /** 切换开关；开启时 880Hz 0.06s；返回新状态 */
  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.tone(880, 0.06);
    return this.enabled;
  }
  /** 解锁 AudioContext（首次用户手势调用） */
  unlock() {
    this.ctx();
  }
}

/** 模块级单例（氛围层直接引用，不触发渲染） */
export const SND = new SoundFx();

import { useEffect } from 'react';

/** 手势解锁：首次 pointerdown/keydown 创建 AudioContext */
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
