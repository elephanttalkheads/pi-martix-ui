// 蠕虫入侵 —— 全屏字符虫（v4 规格 §6，招牌之三）
// 神经核心 (#core) 释放 → L 形路径（先垂直后水平，每 8px 采样）爬向目标文件行
// → 命中后文件名扰码解密（620ms 逐字符还原，`.` 保持不动）+ 行闪烁 900ms。
// 触发源：编辑类工具调用（App 事件接线）。REDUCED 下跳过动画直接命中。
import { useEffect, useRef } from 'react';
import { SND } from './SoundFx';
import { CORE } from './NeuralCore';

const WORM_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789ABCDEF<>+*';
const SCRAMBLE_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789ABCDEF#$%&@';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let sigCv: HTMLCanvasElement | null = null;

/** 命中：目标行扰码 + 闪烁；done 在动画结束后调用 */
function intrudeRow(row: HTMLElement, done?: () => void) {
  const nameEl = row.querySelector('.ft-name');
  row.classList.add('breached');
  window.setTimeout(() => row.classList.remove('breached'), 900);
  if (!nameEl || REDUCED) {
    done?.();
    return;
  }
  const original = nameEl.textContent ?? '';
  const dur = 620;
  const t0 = performance.now();
  const scramble = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const locked = Math.floor(original.length * p);
    let out = original.slice(0, locked);
    for (let i = locked; i < original.length; i++) {
      out += original[i] === '.' ? '.' : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
    }
    nameEl.textContent = out;
    if (p < 1) requestAnimationFrame(scramble);
    else {
      nameEl.textContent = original;
      done?.();
    }
  };
  requestAnimationFrame(scramble);
}

/**
 * 释放蠕虫：从神经核心中心沿 L 形路径爬向目标行。
 * targetEl 为目标行 DOM（文件树行 / 工具链块行）；null 时直接 done。
 */
export function releaseWorm(targetEl: HTMLElement | null, done?: () => void) {
  const hit = () => {
    if (targetEl) intrudeRow(targetEl, done);
    else done?.();
  };
  if (REDUCED || !sigCv || !targetEl) {
    hit();
    return;
  }
  const ctx = sigCv.getContext('2d');
  if (!ctx) {
    hit();
    return;
  }

  // 起点：神经核心画布中心
  const coreEl = document.getElementById('core');
  if (!coreEl) {
    hit();
    return;
  }
  const cr = coreEl.getBoundingClientRect();
  const sx = cr.left + cr.width / 2;
  const sy = cr.top + cr.height / 2;

  // 终点：目标行左边缘 +12px、垂直中心；可视区外先滚动侧栏居中
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const srect = sidebar.getBoundingClientRect();
    let tr = targetEl.getBoundingClientRect();
    if (tr.top < srect.top || tr.bottom > srect.bottom) {
      sidebar.scrollTop += tr.top - srect.top - srect.height / 2;
      tr = targetEl.getBoundingClientRect();
    }
    const TX = tr.left + 12;
    const TY = tr.top + tr.height / 2;

    // L 形路径：先垂直后水平；每 8px 采样
    const path = [
      { x: sx, y: sy },
      { x: sx, y: TY },
      { x: TX, y: TY },
    ];
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const steps = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 8));
      for (let s = 0; s < steps; s++) {
        pts.push({ x: a.x + (b.x - a.x) * (s / steps), y: a.y + (b.y - a.y) * (s / steps) });
      }
    }
    pts.push({ x: TX, y: TY });

    CORE.burst();
    SND.worm();

    const glyphs = pts.map(() => WORM_CHARS[(Math.random() * WORM_CHARS.length) | 0]);
    let head = 0;
    const TAIL = 18;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const frame = () => {
      ctx.clearRect(0, 0, sigCv!.width, sigCv!.height);
      head += 3;
      if (head >= pts.length + TAIL) {
        ctx.clearRect(0, 0, sigCv!.width, sigCv!.height);
        hit();
        return;
      }
      for (let i = 0; i < TAIL; i++) {
        const idx = head - i;
        if (idx < 0 || idx >= pts.length) continue;
        const p = pts[idx];
        // 尾节字符随机突变 + 轻微抖动，制造"爬行"感
        if (i > 0 && Math.random() < 0.35) glyphs[idx] = WORM_CHARS[(Math.random() * WORM_CHARS.length) | 0];
        const jx = i ? Math.sin((idx + head) * 0.9) * 1.5 : 0;
        ctx.fillStyle = i === 0 ? 'rgba(200,255,212,0.95)' : `rgba(61,255,143,${((1 - i / TAIL) * 0.7).toFixed(3)})`;
        ctx.fillText(glyphs[idx], p.x + jx, p.y);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  } else {
    hit();
  }
}

export default function SignalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    sigCv = cv;
    const resize = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    return () => {
      sigCv = null;
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas id="signal" ref={canvasRef} aria-hidden="true" />;
}
