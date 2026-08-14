// Feed —— 回合化消息流（阶段一：回合聚合模型 + 回合级 memo，视觉与 v4 一致）。
// OPERATOR 回合右对齐；agent 回合内文本段与工具卡按 content 保序渲染；
// 编辑类工具调用触发蠕虫入侵（目标=文件树行，缺省=工具链块行）。
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFeed, type TurnTool } from '../store';
import { formatToolArgs, toolExpandTitle } from '../toolfmt';
import { parseBody } from '../markdown';
import { MATRIX_CHARS } from '../matrixGlyphs';
import DiffCard from './DiffCard';
import TurnRail from './TurnRail';

/** 注入解码字符集（Matrix Code 电影字形，见 CONTEXT.md「注入解码」） */
const DEC_CHARS = MATRIX_CHARS;
const rdec = () => DEC_CHARS[(Math.random() * DEC_CHARS.length) | 0];
const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * OPERATOR 正文 —— 注入解码：入场时假名乱码逐位还原（约 450ms，仅入场播一次）。
 * 解码期间显示纯文本，完成后交给 Body 做 code/高亮解析；DEC 关闭或 reduced-motion 时直接 Body。
 */
function OperatorBody({ text }: { text: string }) {
  const decOn = useFeed((s) => s.decOn);
  const [decoding, setDecoding] = useState<string | null>(decOn && !REDUCED_MOTION ? '' : null);
  useEffect(() => {
    if (!decOn || REDUCED_MOTION) return;
    const chars = [...text];
    const start = performance.now();
    const dur = Math.min(700, 240 + chars.length * 6);
    let raf = 0;
    const step = (now: number) => {
      const p = (now - start) / dur;
      if (p >= 1) {
        setDecoding(null);
        return;
      }
      const locked = Math.floor(p * chars.length);
      setDecoding(
        chars.map((c, i) => (i < locked || c === ' ' || c === '\n' ? c : rdec())).join(''),
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // 仅入场一次：text/decOn 变化不重播
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return decoding === null ? (
    <Body text={text} />
  ) : (
    <span className="decoding">{decoding}</span>
  );
}

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

/** 正文渲染：行内 `code` / 【高亮词】 + ``` 三反引号代码块（parseBody 纯函数，markdown.test 覆盖） */
function Body({ text }: { text: string }) {
  const parts = useMemo(() => parseBody(text), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.k === 'f' ? (
          <pre key={i} className="msg-code">{p.v}</pre>
        ) : p.k === 'c' ? (
          <code key={i}>{p.v.slice(1, -1)}</code>
        ) : p.k === 'h' ? (
          <span key={i} className="hl">{p.v.slice(1, -1)}</span>
        ) : (
          <span key={i}>{p.v}</span>
        ),
      )}
    </>
  );
}

const ToolCard = memo(function ToolCard({ item }: { item: TurnTool }) {
  const expanded = useFeed((s) => !!s.expandedTools[item.toolCallId]);
  // diff 卡渲染以 revealedEdits 为准（蠕虫命中后才渲染，见 renderer/AGENTS.md）
  const revealed = useFeed((s) => !!s.revealedEdits[item.toolCallId]);
  const toggleToolExpand = useFeed((s) => s.toggleToolExpand);
  const stateText =
    item.status === 'run' ? '执行中…' : item.status === 'err' ? '失败' : `完成 · ${(item.dur ?? 0).toFixed(1)}s`;
  const onToggle = () => toggleToolExpand(item.toolCallId);
  const detail = item.args === undefined ? '' : formatToolArgs(item.toolName, item.args);
  return (
    <div className="trace corner" data-toolcall={item.toolCallId}>
      <div className="t-head">工具链 · 1 步</div>
      <div
        className={`step ${item.status === 'run' ? 'run' : item.status === 'ok' ? 'done' : 'err'}${expanded ? ' open' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="tag">[{item.toolName}]</span>
        <span className="t-desc">{toolDesc(item.toolName, item.args)}</span>
        <span className="st">{stateText}</span>
      </div>
      {expanded && detail && (
        <div className="trace-expand">
          <div className="te-title">{toolExpandTitle(item.toolName, item.args)}</div>
          <pre>{detail}</pre>
        </div>
      )}
      {item.edit && revealed && item.edit.rows.length > 0 && (
        <DiffCard file={item.edit.file} rows={item.edit.rows} />
      )}
      {/* 凝结涟漪：工具收尾（run→ok/err）时玻璃荡开一圈光，挂载即播一次 */}
      {item.status !== 'run' && <span className="ripple" aria-hidden="true" />}
    </div>
  );
});

/**
 * 回合视图 —— memo 边界：流式期间 store 只替换活动回合对象，
 * 历史回合 props/context 不变 → 零重渲染。
 */
const TurnView = memo(function TurnView({
  id,
  active,
  streaming,
}: {
  id: string;
  /** 活动（未闭环）回合：驱动凝结雨轨 */
  active: boolean;
  streaming: boolean;
}) {
  const turn = useFeed((s) => s.turns[id]);
  const sessionTitle = useFeed((s) => s.sessionTitle);
  if (!turn) return null;

  if (turn.kind === 'operator') {
    return (
      <div className="msg user">
        <div className="msg-head">
          <span>OPERATOR</span>
          <span className="m-time">{turn.time}</span>
        </div>
        <div className="msg-body">
          <OperatorBody text={turn.text} />
        </div>
      </div>
    );
  }

  const lastEntry = turn.content[turn.content.length - 1];
  // 中断标记落在最后一个正文段上（与 v4「末条 assistant」语义一致）
  const lastTextId = [...turn.content].reverse().find((e) => e.kind === 'text')?.id;
  const st = turn.settle;

  return (
    <div className={`turn-agent${active ? ' is-active' : ''}`}>
      <TurnRail active={active} />
      {turn.content.map((entry) => {
        // 注意：tool 分支必须正向判定（kind==='tool' 收窄），反向排除法在 tsgo 下不生效
        if (entry.kind === 'tool') return <ToolCard key={entry.id} item={entry} />;
        if (entry.kind === 'thinking') {
          return (
            <details key={entry.id} className="think">
              <summary>
                思路{streaming && entry.id === lastEntry?.id ? ' · 思考中…' : ''}
              </summary>
              <div className="think-body">{entry.text}</div>
            </details>
          );
        }
        return (
          <div key={entry.id} className="msg agent">
            <div className="msg-head">
              <span>{sessionTitle}</span>
              <span className="m-time">{entry.time}</span>
            </div>
            <div className="msg-body">
              <Body text={entry.text} />
              {turn.interrupted && entry.id === lastTextId && (
                <span className="aborted"> [已被操作员中断]</span>
              )}
              {streaming && entry.id === lastEntry?.id && <span className="caret" />}
            </div>
          </div>
        );
      })}
      {st && (
        <div className={`settle${st.outcome !== 'ok' ? ' ' + st.outcome : ''}`}>
          <span className="seal-glyph">◆</span>
          <span>
            {st.outcome === 'interrupted' ? '已中断' : st.outcome === 'error' ? '错误' : '已结算'}
            {` · ${st.tools} tools`}
            {st.tokens !== null && ` · ${st.tokens.toLocaleString()} tok`}
            {` · ${st.dur.toFixed(1)}s`}
          </span>
        </div>
      )}
    </div>
  );
});

export default function Feed() {
  const order = useFeed((s) => s.order);
  const sessionState = useFeed((s) => s.sessionState);
  const activeTurnId = useFeed((s) => s.activeTurnId);
  // 自动滚动只关心末回合的内容变化（流式 = 末回合在更新）
  const lastTurn = useFeed((s) => (s.order.length ? s.turns[s.order[s.order.length - 1]] : undefined));
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastTurn, sessionState]);

  return (
    <div id="feed" ref={feedRef} aria-live="polite">
      {order.length === 0 && <div className="feed-empty">ZION :: 会话就绪。输入指令开始。</div>}
      {order.map((tid) => (
        <TurnView
          key={tid}
          id={tid}
          active={tid === activeTurnId}
          streaming={sessionState === 'STREAMING' && tid === activeTurnId}
        />
      ))}
    </div>
  );
}
