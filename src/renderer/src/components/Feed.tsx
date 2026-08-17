// Feed —— 回合化消息流（回合聚合模型 + 回合级 memo；视觉 = agent-reply 组合原型落地：
// 亮度波显影 / 脑波褶 / 机械继电器 / 烧录显影 / 封存带 / 字形蛾光标；雨轨维持凝结数字雨）。
// OPERATOR 回合右对齐；agent 回合内文本段与工具卡按 content 保序渲染；
// 编辑类工具调用触发蠕虫入侵（目标=文件树行，缺省=继电器导轨行）。
// 历史重建回合（turn.historical）不播入场编舞，直接终态（动画只演给"正在发生"的事）。
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

/** 脑波褶 EEG 折线（3.2A：summary 旁的活体脑波；streaming 时流动+振幅呼吸） */
const EEG_PATH = 'M0,7 L8,7 L11,2 L14,12 L17,7 L26,7 L30,4 L33,10 L36,7 L46,7 L49,1 L53,13 L56,7 L72,7';

/**
 * 字形蛾（3.7B）—— 流式光标是 120ms 翻滚的 Matrix 字形蛾（非实色块）：
 * 它活着文本就在生长；回合闭环/中断即卸载（蛾被掐灭）。
 * Matrix Code 字体的 DOM 例外使用点之一（另一个是注入解码乱码帧），字符取自 MATRIX_CHARS。
 */
function MothCaret() {
  const [ch, setCh] = useState(rdec);
  useEffect(() => {
    if (REDUCED_MOTION) return;
    const t = window.setInterval(() => setCh(rdec()), 120);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="caret" aria-hidden="true">
      {ch}
    </span>
  );
}

const ABORT_TEXT = ' [已被操作员中断]';

/**
 * 中断标记（3.7B 中断语义）：中断文从乱码逐位锁定成真字（约 450ms，入场一次）。
 * 与注入解码同语言——「被掐断的传输」。reduced-motion 直接显示原文。
 */
function AbortedMark() {
  const [txt, setTxt] = useState(() => (REDUCED_MOTION ? ABORT_TEXT : ''));
  useEffect(() => {
    if (REDUCED_MOTION) return;
    const chars = [...ABORT_TEXT];
    const start = performance.now();
    const dur = 450;
    let raf = 0;
    const step = (now: number) => {
      const p = (now - start) / dur;
      if (p >= 1) {
        setTxt(ABORT_TEXT);
        return;
      }
      const locked = Math.floor(p * chars.length);
      setTxt(chars.map((c, i) => (i < locked || c === ' ' ? c : rdec())).join(''));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span className="aborted">{txt}</span>;
}

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

/**
 * 机械继电器（3.3C）—— 工具调用是「能量被导入一个真实模块」：
 * DIN 导轨（.trace.track，保留 .trace + data-toolcall 作蠕虫缺省目标挂钩）上一枚继电器单元：
 * 触点 LED 三态（run 琥珀线圈呼吸 / ok 绿 + clack 冲击波 / err 红）+ 数码管耗时；
 * 点击展开铆钉参数抽屉（参数全文）。液态玻璃/角标/涟漪已随旧工具链块退役。
 */
const ToolCard = memo(function ToolCard({ item }: { item: TurnTool }) {
  const expanded = useFeed((s) => !!s.expandedTools[item.toolCallId]);
  // diff 卡渲染以 revealedEdits 为准（蠕虫命中后才渲染，见 renderer/AGENTS.md）
  const revealed = useFeed((s) => !!s.revealedEdits[item.toolCallId]);
  const toggleToolExpand = useFeed((s) => s.toggleToolExpand);
  const durText =
    item.status === 'run' ? '执行中…' : item.status === 'err' ? '失败' : `${(item.dur ?? 0).toFixed(1)}s`;
  const onToggle = () => toggleToolExpand(item.toolCallId);
  const detail = item.args === undefined ? '' : formatToolArgs(item.toolName, item.args);
  return (
    <div className="trace track" data-toolcall={item.toolCallId}>
      <div
        className={`unit ${item.status}${expanded ? ' open' : ''}`}
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
        <span className="contact" aria-hidden="true" />
        <span className="urest">
          <span className="tname">[{item.toolName}]</span>
          <span className="desc">{toolDesc(item.toolName, item.args)}</span>
        </span>
        <span className="dur">{durText}</span>
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
    <div className={`turn-agent${active ? ' is-active' : ''}${turn.historical ? ' historical' : ''}`}>
      <TurnRail active={active} />
      {turn.content.map((entry) => {
        // 注意：tool 分支必须正向判定（kind==='tool' 收窄），反向排除法在 tsgo 下不生效
        if (entry.kind === 'tool') return <ToolCard key={entry.id} item={entry} />;
        if (entry.kind === 'thinking') {
          // 脑波褶（3.2A）：summary 旁活体脑波（streaming 时流动+振幅呼吸）；
          // 思考体按行切片，末 5 行 1→0.38 反向沉降梯度——越新越亮，旧念头自然变暗
          const thinking = streaming && entry.id === lastEntry?.id;
          return (
            <details key={entry.id} className={`think${thinking ? ' streaming' : ''}`}>
              <summary>
                <span className="t-label">思路</span>
                {thinking && <span className="st-tag">· 思考中…</span>}
                <svg className="eeg" viewBox="0 0 72 14" aria-hidden="true">
                  <path d={EEG_PATH} />
                </svg>
              </summary>
              <div className="think-body">
                {entry.text.split('\n').map((ln, i) => (
                  <span key={i} className="tl">
                    {ln || ' '}
                  </span>
                ))}
              </div>
            </details>
          );
        }
        return (
          <div key={entry.id} className="msg agent">
            {/* 亮度波显影（3.1A）：段 mount 时播一次（流式追加直出，写入头叙事归字形蛾）；
                agent 段无 msg-head——会话名只在输入框上方微簇显示（◆ 标题），不逐段重复 */}
            <div className={`msg-body${turn.historical ? '' : ' develop'}`}>
              <Body text={entry.text} />
              {turn.interrupted && entry.id === lastTextId && <AbortedMark />}
              {streaming && entry.id === lastEntry?.id && <MothCaret />}
            </div>
          </div>
        );
      })}
      {/* 封存带（3.5C）：◆ 锚点后封存带向右展开 + EOL 方块闪两下；
          中断/错误版带尾撕裂锯齿、无 EOL——「被封存」vs「被撕断」形态一眼可辨 */}
      {st && (
        <div className={`settle${st.outcome !== 'ok' ? ' ' + st.outcome : ''}`}>
          <span className="seal-glyph">◆</span>
          <span className="tape">
            {st.outcome === 'interrupted' ? '已中断' : st.outcome === 'error' ? '错误' : '已结算'}
            {` · ${st.tools} tools`}
            {st.tokens !== null && ` · ${st.tokens.toLocaleString()} tok`}
            {` · ${st.dur.toFixed(1)}s`}
          </span>
          {st.outcome === 'ok' && <span className="eol" aria-hidden="true" />}
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
