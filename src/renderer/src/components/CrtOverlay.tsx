import { useEffect, useRef } from 'react';

// CRT 覆盖层 —— 移植自 ui-demo/index-v3.html（不含开机亮线，属开屏 boot 范畴）：
// 扫描线 / 暗角 / 玻璃曲面 / 亮度抖动（70-180ms 随机微调不透明度，常态微弱、偶发稍强跌落）

export default function CrtOverlay() {
  const flickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fl = flickerRef.current;
    if (!fl) return;
    let t = 0;
    const flick = () => {
      fl.style.opacity =
        Math.random() < 0.06
          ? (0.05 + Math.random() * 0.05).toFixed(3)
          : (Math.random() * 0.03).toFixed(3);
      t = window.setTimeout(flick, 70 + Math.random() * 110);
    };
    flick();
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <div className="scanlines" />
      <div className="vignette" />
      <div className="crt-glass" />
      <div ref={flickerRef} className="crt-flicker" />
    </>
  );
}
