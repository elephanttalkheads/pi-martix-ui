// TurnRail —— 凝结雨轨（见 CONTEXT.md）：活动回合左侧一枚迷你数字雨 canvas，
// 回合闭环后组件卸载 canvas、凝为 ◆（rAF 立即停，长会话零常驻开销）。
// 帧节流与背景雨同一 FX 折算规则（90 / fx.speed）。
import { useEffect, useRef } from 'react';
import { fx } from '../store';

const CHARS = 'アイウエオカキクケコサシスセソ0123456789<>+*';
const REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function TurnRail({ active }: { active: boolean }) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const cv = cvRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;

    let raf = 0;
    let alive = true;
    let last = 0;
    const rand = () => CHARS[(Math.random() * CHARS.length) | 0];
    const drops = [Math.random() * -20, Math.random() * -20];

    const paint = () => {
      const w = cv.width;
      const h = cv.height;
      // destination-out 衰减：拖尾向透明方向消退（而非盖实色）——
      // canvas 永远透明，轨道能透出底下的背景雨，不会积成黑色实条
      cx.globalCompositeOperation = 'destination-out';
      cx.fillStyle = 'rgba(0,0,0,0.14)';
      cx.fillRect(0, 0, w, h);
      cx.globalCompositeOperation = 'source-over';
      cx.font = "11px 'Share Tech Mono', monospace";
      cx.textAlign = 'center';
      for (let i = 0; i < 2; i++) {
        const y = drops[i] * 12;
        cx.fillStyle = Math.random() < 0.08 ? 'rgba(194,255,217,0.7)' : 'rgba(0,255,65,0.5)';
        cx.fillText(rand(), (w / 2) * i + w / 4, y);
        drops[i] = y > h + Math.random() * 300 ? 0 : drops[i] + 0.8;
      }
    };
    const resize = () => {
      cv.width = cv.clientWidth;
      cv.height = cv.clientHeight;
    };
    resize();

    if (REDUCED) {
      paint(); // reduced-motion：只画一帧静态雨
      return;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const loop = (ts: number) => {
      if (!alive) return;
      if (ts - last >= 90 / fx.speed) {
        paint();
        last = ts;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active]);

  return (
    <div className={`rail${active ? '' : ' settled'}`} aria-hidden="true">
      {active ? <canvas ref={cvRef} /> : <span className="seal">◆</span>}
    </div>
  );
}
