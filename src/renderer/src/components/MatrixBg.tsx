import { useEffect, useRef } from 'react';

// 数字雨背景（极简移植，后续从 ui-demo/index-v3.html 对齐深度分层完整版）
export default function MatrixBg() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const glyphs = 'アイウエオカキクケコサシスセソタチツテト01<>/\\|_$#*+='.split('');
    let cols: number[] = [];
    let drops: number[] = [];
    let fontSize = 16;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      fontSize = 16;
      cols = Array.from({ length: Math.floor(canvas.width / fontSize) }, (_, i) => i);
      drops = cols.map(() => Math.floor(Math.random() * -40));
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
      for (let i = 0; i < cols.length; i++) {
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillStyle = Math.random() > 0.975 ? '#c8ffd4' : '#00ff41';
        ctx.fillText(ch, cols[i] * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="matrix-bg" aria-hidden="true" />;
}
