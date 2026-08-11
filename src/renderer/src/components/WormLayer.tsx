import { useEffect, useRef } from 'react';

// 蠕虫动画层 —— 移植自 ui-demo/index-v3.html 的 releaseWorm：
// 编辑类工具调用时，一条假名字符蛇从输入区沿折线路径爬向目标消息项，命中后目标放电高亮。
// 纯装饰（canvas 固定层，pointer-events 穿透），业务状态不经过这里。

const WORM_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789<>+*';
const LEN = 16; // 蠕虫体节数
const SPEED = 3; // 每帧前进的采样点数
const CELL = 13;

let wormCv: HTMLCanvasElement | null = null;
let wormCtx: CanvasRenderingContext2D | null = null;
let wormAnim = 0;

function wormResize() {
  if (!wormCv) return;
  wormCv.width = window.innerWidth;
  wormCv.height = window.innerHeight;
}

/** 组件挂载时初始化画布（全屏常驻固定层） */
function initWorm(canvas: HTMLCanvasElement) {
  wormCv = canvas;
  wormCtx = canvas.getContext('2d');
  wormResize();
  window.addEventListener('resize', wormResize);
}

/**
 * 释放蠕虫：从输入区中央上方出发，经折线途经点爬向目标元素，命中后放电高亮。
 * @param targetEl 目标 DOM（如 feed 中的 tool 行）；需要 getBoundingClientRect
 * @param done 命中后回调
 */
export function releaseWorm(targetEl: HTMLElement, done?: () => void) {
  if (!wormCv || !wormCtx) return;
  const startEl = document.querySelector('.input-row');
  const sr = startEl?.getBoundingClientRect() ?? { left: 0, width: window.innerWidth, top: window.innerHeight };
  const sx = sr.left + sr.width * 0.5;
  const sy = (sr.top ?? window.innerHeight) - 6;

  const tr2 = targetEl.getBoundingClientRect();
  const TX = tr2.left + 14;
  const TY = tr2.top + tr2.height / 2;

  // 途经点：先向右出输入区，再横向切到目标，制造折线爬行的「虫子」感
  const midX = sr.left + sr.width * 0.78;
  const path = [
    { x: sx, y: sy },
    { x: midX, y: sy - 30 },
    { x: midX, y: TY },
    { x: TX, y: TY },
  ];
  // 折线路径采样成等距点
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(2, Math.floor(segLen / 10));
    for (let s = 0; s < steps; s++) {
      pts.push({ x: a.x + (b.x - a.x) * (s / steps), y: a.y + (b.y - a.y) * (s / steps) });
    }
  }
  pts.push({ x: TX, y: TY });

  let head = 0;
  if (wormAnim) cancelAnimationFrame(wormAnim);
  const frame = () => {
    if (!wormCv || !wormCtx) return;
    wormCtx.clearRect(0, 0, wormCv.width, wormCv.height);
    head += SPEED;
    if (head >= pts.length + LEN * 2) {
      wormCtx.clearRect(0, 0, wormCv.width, wormCv.height);
      wormAnim = 0;
      // 命中：目标放电高亮
      targetEl.classList.remove('worm-hit');
      void targetEl.offsetWidth; // 重触发动画
      targetEl.classList.add('worm-hit');
      setTimeout(() => targetEl.classList.remove('worm-hit'), 950);
      done?.();
      return;
    }
    for (let i = 0; i < LEN; i++) {
      const idx = head - i;
      if (idx < 0 || idx >= pts.length) continue;
      const p = pts[idx];
      const t = 1 - i / LEN; // 头亮尾暗
      const a = 0.15 + t * 0.75;
      wormCtx.font = `${CELL}px monospace`;
      wormCtx.textAlign = 'center';
      wormCtx.textBaseline = 'middle';
      if (i === 0) {
        wormCtx.shadowColor = 'rgba(0,255,65,0.95)';
        wormCtx.shadowBlur = 14;
        wormCtx.fillStyle = `rgba(200,255,212,${a.toFixed(3)})`;
      } else {
        wormCtx.shadowBlur = 0;
        wormCtx.fillStyle = `rgba(0,255,65,${a.toFixed(3)})`;
      }
      const ch = WORM_CHARS[(Math.random() * WORM_CHARS.length) | 0];
      wormCtx.fillText(ch, p.x, p.y + Math.sin(idx * 0.5) * 2);
    }
    wormCtx.shadowBlur = 0;
    wormAnim = requestAnimationFrame(frame);
  };
  wormAnim = requestAnimationFrame(frame);
}

export default function WormLayer() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    initWorm(ref.current);
    return () => {
      if (wormAnim) cancelAnimationFrame(wormAnim);
      window.removeEventListener('resize', wormResize);
    };
  }, []);

  return <canvas ref={ref} className="worm" aria-hidden="true" />;
}
