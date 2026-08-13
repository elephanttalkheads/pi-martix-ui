// 数字雨 —— v4 单层、低速、Pip-Boy 磷光绿（参数照 ui-demo/index-v4.html §4.1）
// 算法：FS=18 逐列下落；0.035 半透明拖尾（数值越小尾巴越长）；90/FX.speed 帧节流；
// 12% 概率"亮头"（近白磷光 + shadowBlur 8 辉光）；落出屏底 96.5% 概率重置。
// FX 读模块级对象（store.fx），不触发 React 渲染。
// 字形：Matrix Code（真·电影镜像片假名，本地打包）——只映射全角片假名 34 字 +
// 数字 012345789（无 6）+ *+<>:|，字符集必须落在其 cmap 内，否则回退系统字体穿帮。
import { useEffect, useRef } from 'react';
import { fx } from '../store';

const CHARS = 'アウエオカキケコサシスセソタツテナニヌネハヒホマミムメモヤヨラリワー012345789*+<>:|';
const RAIN_FONT = '"Matrix Code", "Share Tech Mono", monospace';
const FS = 18;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Col {
  x: number;
  y: number;
}

export default function RainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cols: Col[] = [];
    let last = 0;
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Array.from({ length: Math.ceil(canvas.width / FS) }, (_, i) => ({
        x: i * FS,
        y: Math.random() * -60 * FS,
      }));
    };
    window.addEventListener('resize', resize);
    resize();

    ctx.textAlign = 'center';

    if (REDUCED) {
      // reduced-motion：只绘制一帧静态雨幕
      ctx.font = `${FS}px ${RAIN_FONT}`;
      ctx.fillStyle = 'rgba(61,255,143,0.6)';
      for (let k = 0; k < cols.length; k++) {
        for (let y = -FS * 2; y < canvas.height; y += FS * 2) {
          ctx.fillText(CHARS[(Math.random() * CHARS.length) | 0], cols[k].x + FS / 2, y);
        }
      }
      return () => window.removeEventListener('resize', resize);
    }

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      if (ts - last < 90 / fx.speed) return;
      last = ts;
      ctx.fillStyle = 'rgba(1,10,4,0.035)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FS}px ${RAIN_FONT}`;
      for (let k = 0; k < cols.length; k++) {
        const c = cols[k];
        const ch = CHARS[(Math.random() * CHARS.length) | 0];
        if (Math.random() < 0.12) {
          // 亮头：近白磷光 + 轻微辉光
          ctx.shadowColor = 'rgba(120,255,175,0.9)';
          ctx.shadowBlur = 8;
          ctx.fillStyle = 'rgba(220,255,232,1)';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(61,255,143,0.95)';
        }
        ctx.fillText(ch, c.x + FS / 2, c.y);
        ctx.shadowBlur = 0;
        c.y += FS * 0.9;
        if (c.y > canvas.height && Math.random() > 0.965) c.y = Math.random() * -30 * FS;
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas id="rain" ref={canvasRef} aria-hidden="true" />;
}
