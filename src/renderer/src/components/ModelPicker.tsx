// ModelPicker —— /model 模型选择器（数据驱动触发：主进程 runCommand('model') 附 models 清单；
// 快捷键 Ctrl+Shift+M 打开时无载荷 → 组件自拉清单）。
// 选中即 setModel（主进程落盘会话+settings）；失败内联错误（Q8），不靠 toast 一闪而过。
import { useEffect, useState } from 'react';
import { useFeed } from '../store';
import type { ModelOption } from '../../../shared/protocol';

export default function ModelPicker({ models: initial }: { models: ModelOption[] | null }) {
  const openModal = useFeed((s) => s.openModal);
  const [models, setModels] = useState<ModelOption[] | null>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 无载荷（快捷键路径）→ 自拉清单；与 /model 命令同一数据源
  useEffect(() => {
    if (models) return;
    let alive = true;
    window.zion
      ?.runCommand?.('model')
      ?.then((r) => {
        if (alive && r.ok && Array.isArray(r.data?.models)) setModels(r.data.models as ModelOption[]);
        else if (alive && !r.ok) setError(r.message);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [models]);

  const pick = async (m: ModelOption) => {
    if (busy) return;
    setBusy(m.label);
    setError(null);
    try {
      const r = await window.zion?.runCommand?.('model', m.label);
      if (!r) return;
      if (r.ok) {
        const pushToast = useFeed.getState().pushToast;
        pushToast({ message: r.message, type: 'info' });
        openModal(null); // 切换成功 → 关弹层（状态栏/日志已有反馈）
      } else {
        setError(r.message); // 内联错误（无 auth 等）
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mp-list">
      {error && <div className="mp-error">{error}</div>}
      {models === null ? (
        <div className="mp-empty">加载模型清单…</div>
      ) : models.length === 0 ? (
        <div className="mp-empty">没有可用模型（检查 ~/.pi/agent 认证与模型配置）</div>
      ) : (
        models.map((m) => (
          <button
            key={m.label}
            className={`mp-item${m.current ? ' current' : ''}`}
            onClick={() => void pick(m)}
            disabled={busy === m.label}
          >
            <span className="mp-mark" aria-hidden="true">{m.current ? '▶' : ' '}</span>
            <span className="mp-label">{m.label}</span>
            {m.current && <span className="mp-tag">当前</span>}
          </button>
        ))
      )}
    </div>
  );
}
