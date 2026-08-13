// AskDialog —— 扩展对话框（uiBridge → IPC → 此弹层）
// 三形态：confirm（确认/取消，danger 强调）/ input（单行输入，Enter 确认）/ select（选项，↑↓/Enter）
// Esc 取消（resolve undefined）；timeout 由主进程兜底（超时自动关闭）
import { useEffect, useRef, useState } from 'react';
import { useFeed } from '../store';

export default function AskDialog() {
  const ask = useFeed((s) => s.uiAsk);
  const setUiAsk = useFeed((s) => s.setUiAsk);
  const [draft, setDraft] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 新对话框到来：重置局部状态 + 聚焦
  useEffect(() => {
    if (!ask) return;
    setDraft('');
    setSel(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [ask]);

  if (!ask) return null;

  const answer = (result: string | boolean | undefined) => {
    void window.zion?.uiAnswer?.(ask.id, result);
    setUiAsk(null);
  };

  const options = ask.options ?? [];

  return (
    <div
      className="ask-mask"
      onMouseDown={(e) => {
        // 点击遮罩 = 取消
        if (e.target === e.currentTarget) answer(undefined);
      }}
    >
      <div className="ask-dialog corner" role="dialog" aria-label={ask.title}>
        <div className="ask-title">{ask.title}</div>
        {ask.kind === 'confirm' && ask.message && <div className="ask-msg">{ask.message}</div>}
        {ask.kind === 'input' && (
          <input
            ref={inputRef}
            className="ask-input"
            value={draft}
            placeholder={ask.message}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                answer(draft);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                answer(undefined);
              }
            }}
          />
        )}
        {ask.kind === 'select' && (
          <div className="ask-options" role="listbox">
            {options.map((o, i) => (
              <div
                key={o}
                role="option"
                aria-selected={i === sel}
                className={`ask-opt${i === sel ? ' active' : ''}`}
                onMouseEnter={() => setSel(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => answer(o)}
              >
                <span className="ask-opt-mark">{i === sel ? '❯' : ''}</span>
                <span className="ask-opt-text">{o}</span>
              </div>
            ))}
            {options.length === 0 && <div className="ask-opt empty">（无选项）</div>}
          </div>
        )}
        <div className="ask-actions">
          {(ask.kind === 'confirm' || ask.kind === 'input') && (
            <>
              <button className="ask-btn primary" onClick={() => (ask.kind === 'input' ? answer(draft) : answer(true))}>
                {ask.kind === 'input' ? '确定' : '确认'}
              </button>
              <button className="ask-btn" onClick={() => answer(undefined)}>
                取消
              </button>
            </>
          )}
          {ask.kind === 'select' && (
            <button className="ask-btn" onClick={() => answer(undefined)}>
              取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 扩展通知 toast 队列（3s 自动消失） */
export function ToastHost() {
  const toasts = useFeed((s) => s.toasts);
  const dismissToast = useFeed((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type ?? 'info'}`}>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-x" onClick={() => dismissToast(t.id)} aria-label="关闭通知">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
