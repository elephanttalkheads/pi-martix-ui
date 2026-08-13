// TurnRail —— 凝结雨轨（见 CONTEXT.md）：活动回合左侧一枚迷你数字雨 canvas，
// 回合闭环后组件卸载 canvas、凝为 ◆（rAF 立即停，长会话零常驻开销）。
// 每帧绘制、匀速 0.8 行/帧（9.6px < 11px 字高 → 字符叠影成连续雨幕；
// 不随 fx.speed 缩放——加速会把字符间距拉大、雨幕散成可辨的单字）。
// 半分辨率绘制（SCALE=0.5）：backstore 缩小一倍再让 CSS 放大，双线性插值产生
// 天然柔化——字符不可辨、像真实的雨（对齐 index-v5 demo 观感，与平台 dpr 无关）。
import { useEffect, useRef } from 'react';

const CHARS = 'アイウエオカキクケコサシスセソ0123456789<>+*';
/** 降采样比例：0.5 = 半分辨率绘制，CSS 放大后字符糊成雨丝 */
const SCALE = 0.5;
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
      cx.font = `${11 * SCALE}px 'Share Tech Mono', monospace`;
      cx.textAlign = 'center';
      for (let i = 0; i < 2; i++) {
        const y = drops[i] * 12 * SCALE;
        cx.fillStyle = Math.random() < 0.08 ? 'rgba(194,255,217,0.7)' : 'rgba(0,255,65,0.55)';
        cx.fillText(rand(), (w / 2) * i + w / 4, y);
        drops[i] = y > h + Math.random() * 300 * SCALE ? 0 : drops[i] + 0.8;
      }
    };
    const resize = () => {
      cv.width = Math.max(1, Math.round(cv.clientWidth * SCALE));
      cv.height = Math.max(1, Math.round(cv.clientHeight * SCALE));
    };
    resize();

    if (REDUCED) {
      paint(); // reduced-motion：只画一帧静态雨
      return;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const loop = () => {
      if (!alive) return;
      paint();
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
