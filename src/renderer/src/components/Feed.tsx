// Feed —— v4 消息流：用户消息右对齐（OPERATOR），agent 消息头 accent-muted，
// 行内 `code` / 【高亮词】 / 中断标记；工具调用渲染为细线角标工具链块；
// 编辑类工具调用触发蠕虫入侵（目标=文件树行，缺省=工具链块行）。
import { useEffect, useMemo, useRef } from 'react';
import { useFeed, type FeedItem } from '../store';
import DiffCard from './DiffCard';

/** 工具链块描述：从 args 提取可读摘要 */
function toolDesc(toolName: string, args: unknown): string {
  const a = (args ?? {}) as Record<string, unknown>;
  if (typeof a.file === 'string') return a.file;
  if (typeof a.path === 'string') return a.path;
  if (typeof a.command === 'string') return a.command.slice(0, 60);
  if (typeof a.text === 'string') return a.text.slice(0, 60);
  if (typeof a.question === 'string') return a.question.slice(0, 60);
  return toolName;
}

/** 行内样式：`code` / 【高亮词】 */
function Body({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: { k: 't' | 'c' | 'h'; v: string }[] = [];
    const re = /(`[^`]+`|【[^】]+】)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ k: 't', v: text.slice(last, m.index) });
      out.push({ k: m[0][0] === '`' ? 'c' : 'h', v: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ k: 't', v: text.slice(last) });
    return out;
  }, [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.k === 'c' ? (
          <code key={i}>{p.v.slice(1, -1)}</code>
        ) : p.k === 'h' ? (
          <span key={i} className="hl">
            {p.v.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p.v}</span>
        ),
      )}
    </>
  );
}

function ToolCard({ item, revealed }: { item: Extract<FeedItem, { kind: 'tool' }>; revealed: boolean }) {
  const stateText =
    item.status === 'run' ? '执行中…' : item.status === 'err' ? '失败' : `完成 · ${(item.dur ?? 0).toFixed(1)}s`;
  return (
    <div className="trace" data-toolcall={item.toolCallId}>
      <div className="t-head">工具链 · 1 步</div>
      <div className={`step ${item.status === 'run' ? 'run' : item.status === 'ok' ? 'done' : 'err'}`}>
        <span className="tag">[{item.toolName}]</span>
        <span className="t-desc">{toolDesc(item.toolName, item.args)}</span>
        <span className="st">{stateText}</span>
      </div>
      {item.edit && revealed && item.edit.rows.length > 0 && (
        <DiffCard file={item.edit.file} rows={item.edit.rows} />
      )}
    </div>
  );
}

export default function Feed() {
  const items = useFeed((s) => s.items);
  const sessionState = useFeed((s) => s.sessionState);
  const sessionTitle = useFeed((s) => s.sessionTitle);
  const revealedEdits = useFeed((s) => s.revealedEdits);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // 自动滚动到底
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, sessionState]);

  const lastAssistant = items[items.length - 1];
  const streaming = sessionState === 'STREAMING' && lastAssistant?.kind === 'assistant';

  return (
    <div id="feed" ref={feedRef} aria-live="polite">
      {items.length === 0 && <div className="feed-empty">ZION :: 会话就绪。输入指令开始。</div>}
      {items.map((it) => {
        switch (it.kind) {
          case 'user':
            return (
              <div key={it.id} className="msg user">
                <div className="msg-head">
                  <span>OPERATOR</span>
                  <span className="m-time">{it.time}</span>
                </div>
                <div className="msg-body">
                  <Body text={it.text} />
                </div>
              </div>
            );
          case 'assistant':
            return (
              <div key={it.id} className="msg agent">
                <div className="msg-head">
                  <span>{sessionTitle}</span>
                  <span className="m-time">{it.time}</span>
                </div>
                <div className="msg-body">
                  <Body text={it.text} />
                  {it.interrupted && <span className="aborted"> [已被操作员中断]</span>}
                  {streaming && it.id === lastAssistant?.id && <span className="caret" />}
                </div>
              </div>
            );
          case 'tool':
            return <ToolCard key={it.id} item={it} revealed={!!revealedEdits[it.toolCallId]} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
