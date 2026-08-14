// ZionModal —— 通用模态弹层壳（ADR-0005）：遮罩点击关闭 + Esc 关闭 + 初始焦点 + 开关动画。
// 视觉：v4 令牌底子（--surface-2 + 细边框）+ 轻装饰（绿 glow 边框、▚▞ 角标、打开时扫描线扫过）。
// 各弹层只提供标题与内容；同一时刻只开一个（store.openModal 天然互斥）。
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** 副标题（可省略） */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** 面板宽度（默认 480px） */
  width?: number;
}

export default function ZionModal({ title, subtitle, onClose, children, width = 480 }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc 关闭 + 初始焦点捕获（进入面板即聚焦，Tab 循环留在弹层内）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="zion-modal-mask" onClick={onClose}>
      <div
        ref={panelRef}
        className="zion-modal"
        style={{ width }}
        tabIndex={-1}
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zion-modal-scan" aria-hidden="true" />
        <header className="zion-modal-head">
          <span className="zion-modal-corner" aria-hidden="true">▚</span>
          <div className="zion-modal-titles">
            <h2 className="zion-modal-title">{title}</h2>
            {subtitle && <p className="zion-modal-sub">{subtitle}</p>}
          </div>
          <button className="zion-modal-x" onClick={onClose} aria-label="关闭">
            ✕
          </button>
          <span className="zion-modal-corner" aria-hidden="true">▞</span>
        </header>
        <div className="zion-modal-body">{children}</div>
      </div>
    </div>
  );
}
