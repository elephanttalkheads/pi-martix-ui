import { useEffect, useRef } from 'react';
import { useFeed, type FxState } from '../store';

// 深度分层数字雨 —— 移植自 ui-demo/index-v3.html：
// - 半角片假名 + 数字/字母/符号；约一半字形水平镜像（Simon Whiteley 考证细节）
// - 每列携带深度 d∈[0.45,1]：近处更大、更亮、下落更快
// - 列首白炽闪光 + bloom（shadowBlur 只用于 ~5% 字形，防掉帧规则，勿全量开）
// - FX 驱动：speed → 帧节流（busy 时雨加速）；glow → 白点频率/强度；load → 普通字形亮度

const CHARS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFXYZ<>+*:;';
const FS = 16;

interface Col {
  x: number;
  y: number;
  d: number;
}

export default function MatrixBg() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const fx = useFeed((s) => s.fx);
  // 氛围层只读 FX target（ref 模式：effect 只跑一次，每帧读最新目标）
  const fxRef = useRef<FxState>(fx);
  fxRef.current = fx;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    let cols: Col[] = [];
    // 当前插值值（每帧向目标 FX 指数逼近）
    const cur = { ...fxRef.current };

    const resize = () => {
      canvas.width = window.innerWidth + 80;
      canvas.height = window.innerHeight + 80;
      cols = Array.from({ length: Math.ceil(canvas.width / FS) }, (_, i) => ({
        x: i * FS,
        y: Math.random() * -60 * FS,
        d: 0.45 + Math.random() * 0.55,
      }));
    };
    resize();
    window.addEventListener('resize', resize);
    ctx.textAlign = 'center';

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      const tgt = fxRef.current;
      cur.speed += (tgt.speed - cur.speed) * 0.05;
      cur.glow += (tgt.glow - cur.glow) * 0.05;
      cur.load += (tgt.load - cur.load) * 0.05;
      // busy 时雨加速：节流间隔随 speed 缩短
      if (ts - last < 46 / (1 + (cur.speed - 1) * 0.45)) return;
      last = ts;
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // glow 0.55(基线)→1(busy)：白点更频繁、光晕更强
      const glowK = 0.55 + cur.glow * 0.75;
      // load 0.25(基线)→0.95(busy)：普通字形更亮
      const loadK = 0.55 + cur.load * 0.55;
      for (let k = 0; k < cols.length; k++) {
        const c = cols[k];
        const size = FS * (0.65 + c.d * 0.55);
        ctx.font = `${size}px monospace`;
        const ch = CHARS[(Math.random() * CHARS.length) | 0];
        const x = c.x + FS / 2;
        if (Math.random() < 0.05 * c.d * glowK) {
          // 列首白炽闪光 + bloom（近处更频繁、更强）
          ctx.shadowColor = 'rgba(0,255,65,0.9)';
          ctx.shadowBlur = 16 * c.d;
          ctx.fillStyle = `rgba(200,255,212,${(0.6 + c.d * 0.4).toFixed(3)})`;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(0,255,65,${((0.14 + c.d * 0.5) * loadK).toFixed(3)})`;
        }
        if (Math.random() < 0.45) {
          // 镜像字形：水平翻转绘制
          ctx.save();
          ctx.translate(x, c.y);
          ctx.scale(-1, 1);
          ctx.fillText(ch, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(ch, x, c.y);
        }
        // 深度视差：近处下落更快
        c.y += (0.55 + c.d * 0.85) * size;
        if (c.y > canvas.height && Math.random() > 0.97) c.y = Math.random() * -30 * size;
      }
      ctx.shadowBlur = 0;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="rain" aria-hidden="true" />;
}
