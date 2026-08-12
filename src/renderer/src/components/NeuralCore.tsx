// 神经核心 —— 侧栏同心环 canvas（v4 规格 §5.2）
// 外环 24 刻度（每第 6 根主刻度）+ 反向虚线内弧 + 中心点；rot 随 FX.speed 旋转；
// 释放蠕虫时 burst()（700ms 增能衰减）。REDUCED 下静止绘制。
import { useEffect, useRef } from 'react';
import { fx } from '../store';

/** 模块级 burst 时间戳（SignalCanvas 释放蠕虫时调用） */
export const CORE = {
  burstAt: -1e9,
  burst() {
    this.burstAt = performance.now();
  },
};

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function NeuralCore() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let CX = 0;
    let CY = 0;
    const resize = () => {
      W = cv.width = cv.clientWidth * 2;
      H = cv.height = cv.clientHeight * 2;
      CX = W / 2;
      CY = H / 2;
    };
    window.addEventListener('resize', resize);
    resize();

    let rot = 0;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      rot += 0.006 * (REDUCED ? 0 : fx.speed);
      const burst = Math.max(0, 1 - (performance.now() - CORE.burstAt) / 700);
      const e = Math.min(1, fx.energy + burst * 0.6);
      const R = H * 0.34;
      // 外环：刻度
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(rot);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const major = i % 6 === 0;
        ctx.strokeStyle = `rgba(61,255,143,${major ? 0.14 + e * 0.35 : 0.07 + e * 0.15})`;
        ctx.lineWidth = major ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.lineTo(Math.cos(a) * (R + (major ? 9 : 5)), Math.sin(a) * (R + (major ? 9 : 5)));
        ctx.stroke();
      }
      ctx.restore();
      // 内环：反向虚线弧
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(-rot * 1.6);
      ctx.strokeStyle = `rgba(61,255,143,${0.18 + e * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // 中心点
      ctx.fillStyle = `rgba(200,255,212,${0.25 + e * 0.6})`;
      ctx.beginPath();
      ctx.arc(CX, CY, 3 + e * 3, 0, Math.PI * 2);
      ctx.fill();
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas id="core" ref={canvasRef} aria-hidden="true" />;
}
