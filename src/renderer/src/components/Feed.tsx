import { useEffect, useRef, type ReactNode } from 'react';
import { useFeed, type FeedItem } from '../store';
import DiffCard from './DiffCard';
import { releaseWorm } from './WormLayer';

// 轻量 inline 高亮：【…】→ 高亮段；`code` → code 元素（React 渲染，天然转义）
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(【[^】]+】|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('【') && p.endsWith('】')) return <span key={i} className="hl">{p.slice(1, -1)}</span>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    return p;
  });
}

function AssistantText({ text }: { text: string }) {
  return (
    <div className="msg-body">
      {text.split('\n').map((l, i) => (
        <span key={i}>
          {renderInline(l)}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

const TOOL_LABEL: Record<string, string> = {
  edit: '修改文件',
  apply_patch: '应用补丁',
  write: '写入文件',
  multi_edit: '批量修改',
  patch: '应用补丁',
  batch_execute: '批量执行',
};

function ToolRow({ item }: { item: Extract<FeedItem, { kind: 'tool' }> }) {
  const args = item.args === undefined ? '' : JSON.stringify(item.args).slice(0, 160);
  const label = TOOL_LABEL[item.toolName] ?? item.toolName;
  return (
    <div className={`trace tool-row ${item.status}`} data-tool-id={item.id}>
      <div className={`step ${item.status === 'run' ? 'run' : 'done'}`}>
        <span className="tag">▶</span>
        <span className="label">{label}</span>
        {args && <span className="t-args">{args}</span>}
        <span className="st">
          {item.status === 'run' ? '执行中…' : item.status === 'ok' ? '完成' : '失败'}
        </span>
      </div>
      {item.edit && <DiffCard file={item.edit.file} rows={item.edit.rows} />}
    </div>
  );
}

export default function Feed() {
  const items = useFeed((s) => s.items);
  const busy = useFeed((s) => s.busy);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const wormedRef = useRef<string | null>(null);

  // 自动滚动到底
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  // 编辑类工具调用 → 蠕虫从输入区爬向新出现的 tool 行（渲染完成后再触发）
  useEffect(() => {
    const last = items[items.length - 1];
    if (!last || last.kind !== 'tool' || !last.edit || last.status !== 'run') return;
    if (wormedRef.current === last.id) return;
    wormedRef.current = last.id;
    const el = feedRef.current?.querySelector(`[data-tool-id="${last.id}"]`);
    if (el instanceof HTMLElement) releaseWorm(el);
  }, [items]);

  return (
    <div className="feed" id="feed" ref={feedRef}>
      {items.length === 0 && !busy && (
        <div className="feed-empty">ZION :: 会话就绪。输入指令开始。</div>
      )}
      {items.map((it) => {
        switch (it.kind) {
          case 'user':
            return (
              <div key={it.id} className="msg user">
                <div className="msg-head">
                  <span>OPERATOR</span>
                  <span className="m-time">{it.time}</span>
                </div>
                <div className="msg-body">{it.text}</div>
              </div>
            );
          case 'system':
            return (
              <div key={it.id} className="msg system">
                <div className="msg-head">
                  <span>SYSTEM</span>
                  <span className="m-time">{it.time}</span>
                </div>
                <div className="msg-body">{it.text}</div>
              </div>
            );
          case 'tool':
            return <ToolRow key={it.id} item={it} />;
          case 'assistant':
            return (
              <div key={it.id} className="msg agent">
                <div className="msg-head">
                  <span>ZION</span>
                  <span className="m-time">{it.time}</span>
                </div>
                <AssistantText text={it.text} />
              </div>
            );
        }
      })}
    </div>
  );
}
