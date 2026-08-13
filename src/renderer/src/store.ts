import { create } from 'zustand';
import type { ToolExecutionStartEvent } from '@earendil-works/pi-coding-agent';
import type { FileNode, SessionHistoryItem, SessionInfoLike, UiAsk, UiNotify } from '../../shared/protocol';

export type ToolStatus = 'run' | 'ok' | 'err';

/** 会话状态机（v4 四态，见 docs/adr/0002-v4-convergence.md） */
export type SessionState = 'READY' | 'RUNNING' | 'STREAMING' | 'CANCELLING';

/** 日志行（日志抽屉，前端自收集） */
export interface LogLine {
  time: string; // HH:MM:SS
  level: 'ok' | 'err' | 'warn' | 'dim';
  text: string;
}

/** 侧栏 Agent 卡片（已移除——侧栏改为会话列表；保留类型供未来 agent 注册表） */
export interface AgentInfo {
  name: string;
  desc: string;
  state: string;
  online: boolean;
}
/** diff 卡行（与 ui-demo addDiffCard 的 rows 同构） */
export interface DiffRow {
  /** '+' 新增 / '-' 删除 / ' ' 上下文 */
  t: '+' | '-' | ' ';
  /** 行号（未知为 null，如 patch 解析失败时） */
  n: string | null;
  c: string;
}

/** 编辑类工具调用 → diff 卡数据 */
export interface EditInfo {
  file: string;
  rows: DiffRow[];
}

/** 内容段：正文 / 思考（SDK thinking_start/delta/end 干净拆分；渲染层思考段折叠展示） */
export interface TurnSegment {
  id: string;
  kind: 'text' | 'thinking';
  text: string;
  time: string;
}

/** 工具调用条目（回合 content 内的工具卡数据，原 tool FeedItem） */
export interface TurnTool {
  id: string;
  kind: 'tool';
  toolCallId: string;
  toolName: string;
  args?: unknown;
  status: ToolStatus;
  time: string;
  /** 开始时刻（performance.now()，用于「完成 · X.Xs」真实计时） */
  startAt: number;
  /** 耗时秒数（tool_execution_end 时写入） */
  dur?: number;
  /** 编辑类工具调用时携带，渲染为 diff 卡；tool_execution_end 可用 result.patch 升级 */
  edit?: EditInfo;
}

/** 回合内容：内容段与工具调用按到达顺序保序排列 */
export type TurnEntry = TurnSegment | TurnTool;

/** 结算行数据（见 CONTEXT.md「结算行」）：回合闭环时统计 */
export interface TurnSettle {
  tools: number;
  /** 回合内各 LLM turn 的 usage.totalTokens 求和；null = 未收到 usage 数据 */
  tokens: number | null;
  /** agent_start→闭环实测秒数 */
  dur: number;
  /** 中断/错误回合照常结算（标「已中断」/「错误」） */
  outcome: 'ok' | 'interrupted' | 'error';
}

/**
 * 回合 —— feed 的聚合单元（见 CONTEXT.md「agent 回合」）。
 * operator = 一次用户输入；agent = 一次 prompt 驱动的执行周期（agent_start→agent_end）。
 * 回合边界即 React.memo 边界：流式期间只有活动回合对象被替换，历史回合零渲染成本。
 */
export type Turn =
  | { id: string; kind: 'operator'; text: string; time: string }
  | {
      id: string;
      kind: 'agent';
      time: string;
      content: TurnEntry[];
      interrupted?: boolean;
      /** 回合起点（performance.now()，结算行耗时基准） */
      startedAt: number;
      /** Σ usage.totalTokens（turn_end 累积；seenUsage=false 时结算行 tokens 显示 null） */
      tokens: number;
      seenUsage: boolean;
      settle?: TurnSettle;
    };

/** 派生信号 FX（v4：模块级对象广播，不进 React 渲染路径；组件直接 import fx 读取） */
export interface FxState {
  speed: number;
  energy: number;
}
export const FX_IDLE: FxState = { speed: 1, energy: 0.3 };
const FX_BUSY: FxState = { speed: 2.2, energy: 0.85 };

/** 氛围层共享引用（setSessionState 时同步改写） */
export const fx: FxState = { ...FX_IDLE };

const LOG_MAX = 120;

interface FeedState {
  /** 回合表（id → Turn）；流式期间仅活动回合对象被替换 */
  turns: Record<string, Turn>;
  /** 回合渲染顺序（仅在新增回合时换引用） */
  order: string[];
  /** 活动（未闭环）agent 回合 id；null = 无 */
  activeTurnId: string | null;
  sessionState: SessionState;
  logs: LogLine[];
  tree: FileNode[];
  /** 工作区会话列表（左侧会话卡） */
  sessions: SessionInfoLike[];
  /** 当前会话 id（null=尚未就绪） */
  currentSessionId: string | null;
  /** 当前会话显示标题（消息头/芯片/神经核心标签） */
  sessionTitle: string;
  /** 当前项目工作目录（侧栏 Project 标题显示其目录名） */
  currentProject: string | null;
  tokenCount: number;
  sndOn: boolean;
  /** 注入解码开关（见 CONTEXT.md「注入解码」；localStorage.zion.dec，默认开） */
  decOn: boolean;
  /** 蠕虫命中完成（releaseWorm done 回调）后登记的 toolCallId 集合——diff 卡延迟到命中后渲染 */
  revealedEdits: Record<string, true>;
  /** 工具链块展开态（trace 行点击展开完整参数） */
  expandedTools: Record<string, true>;
  /** 当前扩展对话框（null=无；AskDialog 渲染） */
  uiAsk: UiAsk | null;
  /** 扩展通知队列（toast） */
  toasts: { id: number; message: string; type?: UiNotify['type'] }[];
  /** 项目选择面板开合（启动无最近项目时自动开） */
  projectOpen: boolean;
  /** 在爬蠕虫计数（releaseWorm 开始 +1、done -1）——Neo 头像张嘴 = wormActive > 0 */
  wormActive: number;

  pushUser(text: string): void;
  /** 流式增量进入渲染队列（rAF 合帧 flush；无活动回合则新建 agent 回合） */
  queueDelta(delta: string, kind?: 'text' | 'thinking'): void;
  /** agent_start：下一个内容开启新回合（队列化，保序） */
  armTurn(): void;
  /** agent_end / agent_settled / message_end(error)：闭环当前回合并写结算行（队列化，保序） */
  closeTurn(outcome?: 'ok' | 'error'): void;
  /** turn_end 携带的 usage.totalTokens 累积进活动回合（结算行 Σtokens + 状态栏真实计数） */
  addUsage(tokens: number): void;
  /** 中断时给活动回合打中断标记（队列化，保序） */
  markInterrupted(): void;
  toolStart(ev: Pick<ToolExecutionStartEvent, 'toolCallId' | 'toolName' | 'args'>, edit?: EditInfo): void;
  toolEnd(toolCallId: string, isError: boolean, result?: unknown): void;
  /** 内部：应用一帧的事件队列（勿直接调用；pushUser/applySession/reset 会先同步 flush） */
  _flush(ops: PendingOp[]): void;
  setSessionState(state: SessionState): void;
  log(level: LogLine['level'], text: string): void;
  revealEdit(toolCallId: string): void;
  /** 蠕虫生命周期计数（SignalCanvas.releaseWorm 同步路径调用） */
  wormStart(): void;
  wormDone(): void;
  toggleToolExpand(toolCallId: string): void;
  setUiAsk(ask: UiAsk | null): void;
  pushToast(n: UiNotify): void;
  dismissToast(id: number): void;
  setProjectOpen(open: boolean): void;
  setCurrentProject(path: string | null): void;
  setTree(tree: FileNode[]): void;
  setSessions(sessions: SessionInfoLike[]): void;
  /** 仅更新当前会话显示标题（不重置 feed；重命名当前会话时用） */
  setSessionTitle(title: string): void;
  /** 切换/新建会话：设置当前会话 + 以历史重建 feed（清 token/状态机回 READY） */
  applySession(id: string, title: string, items: SessionHistoryItem[]): void;
  setSndOn(on: boolean): void;
  setDecOn(on: boolean): void;
  reset(): void;
}

let id = 0;
const nid = () => `i${++id}`;
const fmtTime = (d: Date) => new Date(d).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
const msgTime = () => fmtTime(new Date());
const logTime = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

/* ---------------- 流式渲染队列（rAF 合帧，保序） ----------------
 * agent 事件逐条到达（每条 IPC 一个宏任务），若每条都 set() 则长会话下整树重渲染成为主瓶颈。
 * 这里把一帧内的事件攒成 op 队列，rAF 时一次性 flush：每帧至多一次 store 更新，
 * 且只有活动回合对象被替换（回合级 memo 的前提）。 */
type PendingOp =
  | { t: 'arm' }
  | { t: 'delta'; delta: string; kind: 'text' | 'thinking' }
  | { t: 'toolStart'; ev: Pick<ToolExecutionStartEvent, 'toolCallId' | 'toolName' | 'args'>; edit?: EditInfo }
  | { t: 'toolEnd'; toolCallId: string; isError: boolean; result?: unknown }
  | { t: 'usage'; tokens: number }
  | { t: 'interrupt' }
  | { t: 'close'; outcome?: 'ok' | 'error' };

const opQueue: PendingOp[] = [];
let flushScheduled = false;
/** 下一个内容开启新回合（agent_start 置位；消费后复位） */
let armed = false;
/** agent_start 时刻（flush 时记录；结算行耗时基准） */
let armAt = 0;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  requestAnimationFrame(() => {
    flushScheduled = false;
    flushNow();
  });
}

/** 同步 drain 队列（pushUser / applySession / reset 等非流式动作调用，保证全局顺序） */
function flushNow() {
  if (!opQueue.length) return;
  const ops = opQueue.splice(0);
  useFeed.getState()._flush(ops);
}

export const useFeed = create<FeedState>()((set) => ({
  turns: {},
  order: [],
  activeTurnId: null,
  sessionState: 'READY',
  logs: [],
  tree: [],
  sessions: [],
  currentSessionId: null,
  sessionTitle: '…',
  currentProject: null,
  tokenCount: 0,
  sndOn: localStorage.getItem('zion.snd') !== '0',
  decOn: localStorage.getItem('zion.dec') !== '0',
  revealedEdits: {},
  expandedTools: {},
  uiAsk: null,
  toasts: [],
  projectOpen: false,
  wormActive: 0,

  pushUser(text) {
    flushNow(); // 先 drain 流式队列，保证 OPERATOR 回合落在正确位置
    set((s) => {
      const t: Turn = { id: nid(), kind: 'operator', text, time: msgTime() };
      return { turns: { ...s.turns, [t.id]: t }, order: [...s.order, t.id] };
    });
  },
  queueDelta(delta, kind = 'text') {
    if (!delta) return;
    opQueue.push({ t: 'delta', delta, kind });
    scheduleFlush();
  },
  armTurn() {
    opQueue.push({ t: 'arm' });
    scheduleFlush();
  },
  closeTurn(outcome) {
    opQueue.push({ t: 'close', outcome });
    scheduleFlush();
  },
  addUsage(tokens) {
    if (!(tokens > 0)) return;
    opQueue.push({ t: 'usage', tokens });
    scheduleFlush();
  },
  markInterrupted() {
    opQueue.push({ t: 'interrupt' });
    scheduleFlush();
  },
  toolStart(ev, edit) {
    opQueue.push({ t: 'toolStart', ev, edit });
    scheduleFlush();
  },
  toolEnd(toolCallId, isError, result) {
    opQueue.push({ t: 'toolEnd', toolCallId, isError, result });
    scheduleFlush();
  },
  _flush(ops) {
    set((s) => {
      const turns = { ...s.turns };
      let order = s.order;
      let activeId = s.activeTurnId;
      let tokenCount = s.tokenCount;
      const cloned = new Set<string>();

      /** 取回合的可变工作副本（首次访问时克隆换引用——回合 memo 只认新对象） */
      const edit = (tid: string) => {
        let t = turns[tid] as Extract<Turn, { kind: 'agent' }>;
        if (!cloned.has(tid)) {
          t = { ...t, content: [...t.content] };
          turns[tid] = t;
          cloned.add(tid);
        }
        return t;
      };
      /** 取/建活动 agent 回合（armed 或无活动回合时新建） */
      const ensureTurn = () => {
        const cur = activeId ? turns[activeId] : undefined;
        if (!cur || cur.kind !== 'agent' || armed) {
          const t: Turn = {
            id: nid(),
            kind: 'agent',
            time: msgTime(),
            content: [],
            startedAt: armAt || performance.now(),
            tokens: 0,
            seenUsage: false,
          };
          turns[t.id] = t;
          order = [...order, t.id];
          activeId = t.id;
          armed = false;
          cloned.add(t.id);
        }
        return edit(activeId as string);
      };

      for (const op of ops) {
        switch (op.t) {
          case 'arm':
            armed = true;
            armAt = performance.now();
            break;
          case 'close': {
            // 回合闭环：写结算行（中断/错误照常结算，见 CONTEXT.md「结算行」）
            const cur = activeId ? turns[activeId] : undefined;
            if (cur?.kind === 'agent' && !cur.settle) {
              const t = edit(cur.id);
              t.settle = {
                tools: t.content.filter((e) => e.kind === 'tool').length,
                tokens: t.seenUsage ? t.tokens : null,
                dur: (performance.now() - t.startedAt) / 1000,
                outcome: op.outcome === 'error' ? 'error' : t.interrupted ? 'interrupted' : 'ok',
              };
            }
            activeId = null;
            armed = false;
            break;
          }
          case 'delta': {
            const t = ensureTurn();
            const last = t.content[t.content.length - 1];
            if (last && last.kind === op.kind) {
              t.content[t.content.length - 1] = { ...last, text: last.text + op.delta };
            } else {
              t.content.push({ id: nid(), kind: op.kind, text: op.delta, time: msgTime() });
            }
            break;
          }
          case 'usage': {
            const cur = activeId ? turns[activeId] : undefined;
            if (cur?.kind === 'agent') {
              const t = edit(cur.id);
              t.tokens += op.tokens;
              t.seenUsage = true;
            }
            tokenCount += op.tokens; // 状态栏真实 token 计数（替换原伪计数）
            break;
          }
          case 'toolStart': {
            const t = ensureTurn();
            t.content.push({
              id: nid(),
              kind: 'tool',
              toolCallId: op.ev.toolCallId,
              toolName: op.ev.toolName,
              args: op.ev.args,
              status: 'run',
              time: msgTime(),
              startAt: performance.now(),
              edit: op.edit,
            });
            break;
          }
          case 'toolEnd': {
            // 优先活动回合；找不到（回合闭环后的迟到事件）倒序扫全部回合
            const hasRun = (tid: string | null) => {
              const t = tid ? turns[tid] : undefined;
              return (
                t?.kind === 'agent' &&
                t.content.some((e) => e.kind === 'tool' && e.toolCallId === op.toolCallId && e.status === 'run')
              );
            };
            let target: string | null = hasRun(activeId) ? activeId : null;
            if (target === null) {
              for (let i = order.length - 1; i >= 0; i--) {
                if (hasRun(order[i])) {
                  target = order[i];
                  break;
                }
              }
            }
            if (target === null) break;
            const t = edit(target);
            for (let i = t.content.length - 1; i >= 0; i--) {
              const e = t.content[i];
              if (e.kind === 'tool' && e.toolCallId === op.toolCallId && e.status === 'run') {
                const upgrade = upgradeEditFromResult(e, op.result);
                t.content[i] = {
                  ...e,
                  status: op.isError ? 'err' : 'ok',
                  dur: (performance.now() - e.startAt) / 1000,
                  edit: upgrade ?? e.edit,
                };
                break;
              }
            }
            break;
          }
          case 'interrupt':
            if (activeId) edit(activeId).interrupted = true;
            break;
        }
      }
      return { turns, order, activeTurnId: activeId, tokenCount };
    });
  },
  setSessionState(sessionState) {
    Object.assign(fx, sessionState === 'READY' ? FX_IDLE : FX_BUSY);
    set({ sessionState });
  },
  log(level, text) {
    set((s) => ({
      logs: [...s.logs, { time: logTime(), level, text }].slice(-LOG_MAX),
    }));
  },
  revealEdit(toolCallId) {
    set((s) => ({ revealedEdits: { ...s.revealedEdits, [toolCallId]: true } }));
  },
  wormStart() {
    set((s) => ({ wormActive: s.wormActive + 1 }));
  },
  wormDone() {
    set((s) => ({ wormActive: Math.max(0, s.wormActive - 1) }));
  },
  toggleToolExpand(toolCallId) {
    set((s) => {
      const next = { ...s.expandedTools };
      if (next[toolCallId]) delete next[toolCallId];
      else next[toolCallId] = true;
      return { expandedTools: next };
    });
  },
  setUiAsk(ask) { set({ uiAsk: ask }); },
  pushToast(n) {
    set((s) => ({ toasts: [...s.toasts, { id: s.toasts.length ? s.toasts[s.toasts.length - 1].id + 1 : 1, message: n.message, type: n.type }] }));
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  setProjectOpen(open) { set({ projectOpen: open }); },
  setCurrentProject(path) { set({ currentProject: path }); },
  setSessions(sessions) { set({ sessions }); },
  setSessionTitle(title) { set({ sessionTitle: title }); },
  setTree(tree) { set({ tree }); },
  applySession(id, title, items) {
    // 历史重建：丢弃旧会话的流式队列（防跨会话污染），回合只重建文本（共识 Q12）
    opQueue.length = 0;
    armed = false;
    const turns: Record<string, Turn> = {};
    const order: string[] = [];
    for (const h of items) {
      const time = h.ts ? fmtTime(new Date(h.ts)) : msgTime();
      const t: Turn =
        h.role === 'user'
          ? { id: nid(), kind: 'operator', text: h.text, time }
          : {
              id: nid(),
              kind: 'agent',
              time,
              content: [{ id: nid(), kind: 'text', text: h.text, time }],
              startedAt: 0, // 历史回合不计时（共识 Q12：只重建文本，无结算行）
              tokens: 0,
              seenUsage: false,
            };
      turns[t.id] = t;
      order.push(t.id);
    }
    set({ currentSessionId: id, sessionTitle: title, turns, order, activeTurnId: null, sessionState: 'READY', tokenCount: 0, expandedTools: {} });
  },
  setSndOn(sndOn) {
    localStorage.setItem('zion.snd', sndOn ? '1' : '0');
    set({ sndOn });
  },
  setDecOn(decOn) {
    localStorage.setItem('zion.dec', decOn ? '1' : '0');
    set({ decOn });
  },
  reset() {
    opQueue.length = 0;
    armed = false;
    set({ turns: {}, order: [], activeTurnId: null, sessionState: 'READY', tokenCount: 0 });
  },
}));

/* ---------------- 蠕虫目标定位（事件层同步调用，不依赖 React 渲染时序） ---------------- */

/** 会话显示标题（纯函数，见 title.ts）：name → firstMessage 智能摘要 → 会话短码 */
export { deriveSessionTitle } from './title';

/** 归一化工具路径：反斜杠→正斜杠、去盘符、去前导斜杠 */
/** 树刷新时合并展开态：新树中同路径目录若旧树 open → 保持展开（实时推送不重置用户展开） */
export function mergeTreeOpen(prev: FileNode[], next: FileNode[]): FileNode[] {
  const prevMap = new Map(prev.map((n) => [n.path, n]));
  return next.map((n) => {
    if (!n.dir) return n;
    const p = prevMap.get(n.path);
    const merged: FileNode = { ...n, open: p?.open ?? n.open };
    if (n.children) merged.children = mergeTreeOpen(p?.children ?? [], n.children);
    return merged;
  });
}

export function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '').replace(/^\/+/, '');
}

/** 文件树行匹配：data-path 与归一化路径精确相等或互为后缀 */
export function matchTreeRow(fileNorm: string): HTMLElement | null {
  const rows = document.querySelectorAll<HTMLElement>('.ft-row[data-path]');
  for (const el of rows) {
    const dp = el.dataset.path ?? '';
    if (dp === fileNorm || dp.endsWith('/' + fileNorm) || fileNorm.endsWith('/' + dp)) return el;
  }
  return null;
}

/** 展开目标路径的全部祖先目录；有变化返回新树，否则 null */
export function openAncestors(tree: FileNode[], fileNorm: string): FileNode[] | null {
  let changed = false;
  const walk = (nodes: FileNode[], prefix: string): FileNode[] =>
    nodes.map((n) => {
      const p = prefix ? prefix + '/' + n.name : n.name;
      if (!n.dir) return n;
      const contains = fileNorm === p || fileNorm.startsWith(p + '/');
      if (contains && !n.open) changed = true;
      return { ...n, open: n.open || contains, children: walk(n.children ?? [], p) };
    });
  const next = walk(tree, '');
  return changed ? next : null;
}

/* ---------------- 编辑类工具调用 → diff 数据（事件层用） ---------------- */

const EDIT_TOOLS = new Set(['edit', 'apply_patch', 'write', 'multi_edit', 'patch', 'batch_execute']);

/** diff 卡行数上限（防大文件把 feed 撑爆；超出即截断） */
const MAX_DIFF_ROWS = 200;

/** 从工具调用事件解析 diff 卡数据；非编辑类/无可用数据时返回 undefined */
export function parseEditFromTool(toolName: string, args: unknown): EditInfo | undefined {
  const a = (args ?? {}) as Record<string, unknown>;
  if (toolName === 'bash') {
    // bash 写操作启发式：重定向 / echo / tee / sed -i / cp / mv / touch
    const command = typeof a.command === 'string' ? a.command : undefined;
    if (!command) return undefined;
    return parseBashEdit(command);
  }
  if (toolName === 'batch_execute') {
    const cmds = Array.isArray(a.commands) ? a.commands : null;
    if (cmds) {
      for (const raw of cmds) {
        const parsed = tryParseOne((raw ?? {}) as Record<string, unknown>);
        if (parsed) return parsed;
      }
    }
    return undefined;
  }
  if (!EDIT_TOOLS.has(toolName)) return undefined;
  return tryParseOne(a);
}

/** bash 写操作 → EditInfo：提取 echo/printf 文本作为新增行；无文本则仅头部（rows 空，不渲染 diff 卡） */
function parseBashEdit(command: string): EditInfo | undefined {
  const echoM = command.match(/echo\s+(["'])(.*?)\1/i);
  const printfM = command.match(/printf\s+(["'])(.*?)\1/i);
  const rawText = (echoM ?? printfM)?.[2];
  // printf 的 \n 是转义换行：渲染为实际换行（去首尾换行）
  const text = rawText === undefined ? undefined : rawText.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/^\n+|\n+$/g, '');
  // 写入目标：重定向（>> / >，排除 2>&1）→ sed -i → tee → cp → mv → touch
  let file: string | undefined;
  const redir = command.match(/>>?\s*(['"]?)([^'"\s;|&<>]+)\1/);
  if (redir) file = redir[2];
  else {
    const sedM = command.match(/sed\s+-i[^"']*?\s+([^\s;|&]+)\s*$/i);
    const teeM = command.match(/\btee\s+([^\s;|&]+)/i);
    const cpM = command.match(/\bcp\s+[^\s;|&]+\s+([^\s;|&]+)/i);
    const mvM = command.match(/\bmv\s+[^\s;|&]+\s+([^\s;|&]+)/i);
    const touchM = command.match(/\btouch\s+([^\s;|&]+)/i);
    file = sedM?.[1] ?? teeM?.[1] ?? cpM?.[1] ?? mvM?.[1] ?? touchM?.[1];
  }
  if (!file) return undefined;
  file = file.replace(/^['"]|['"]$/g, '');
  if (file === '/dev/null' || file.toLowerCase() === 'nul') return undefined;
  const rows: DiffRow[] = text ? [{ t: '+', n: null, c: text }] : [];
  return { file, rows };
}

function tryParseOne(a: Record<string, unknown>): EditInfo | undefined {
  const file =
    typeof a.file === 'string' ? a.file : typeof a.path === 'string' ? a.path : undefined;
  if (!file) return undefined;
  const patch = typeof a.patch === 'string' ? a.patch : undefined;
  if (patch && /^[+@ -]/m.test(patch)) return { file, rows: rowsFromPatch(patch).slice(0, MAX_DIFF_ROWS) };
  // edit 工具：edits[{ oldText, newText }] 逐对展开（old 行 - / new 行 +）
  if (Array.isArray(a.edits) && a.edits.length > 0) {
    const rows: DiffRow[] = [];
    for (const raw of a.edits) {
      const e = (raw ?? {}) as Record<string, unknown>;
      const o = typeof e.oldText === 'string' ? e.oldText.split('\n') : [];
      const n = typeof e.newText === 'string' ? e.newText.split('\n') : [];
      for (const l of o) rows.push({ t: '-', n: null, c: l });
      for (const l of n) rows.push({ t: '+', n: null, c: l });
    }
    return { file, rows: rows.slice(0, MAX_DIFF_ROWS) };
  }
  const oldT =
    typeof a.old === 'string' ? a.old : typeof a.oldText === 'string' ? a.oldText : undefined;
  const newT =
    typeof a.new === 'string'
      ? a.new
      : typeof a.newText === 'string'
        ? a.newText
        : typeof a.content === 'string'
          ? a.content
          : undefined;
  if (oldT !== undefined || newT !== undefined) {
    return { file, rows: rowsFromTexts(oldT, newT).slice(0, MAX_DIFF_ROWS) };
  }
  // 只有 file 没有内容数据：只显示头部
  return { file, rows: [] };
}

/** tool_execution_end 的 result（如 EditToolDetails { diff, patch }）→ 升级 diff 行；无则 undefined */
export function upgradeEditFromResult(
  item: TurnTool,
  result: unknown,
): EditInfo | undefined {
  if (!item.edit || result === undefined || result === null) return undefined;
  const r = result as Record<string, unknown>;
  const patch = typeof r.patch === 'string' ? r.patch : undefined;
  if (patch && /^[+@ -]/m.test(patch)) {
    return { file: item.edit.file, rows: rowsFromPatch(patch).slice(0, MAX_DIFF_ROWS) };
  }
  const diff = typeof r.diff === 'string' ? r.diff : undefined;
  if (diff && /^[+@ -]/m.test(diff)) {
    return { file: item.edit.file, rows: rowsFromPatch(diff).slice(0, MAX_DIFF_ROWS) };
  }
  return undefined;
}

/** 解析 unified diff patch 文本 → 行（@@ 头追踪行号） */
function rowsFromPatch(patch: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldN = 0;
  let newN = 0;
  for (const line of patch.split('\n')) {
    const m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (m) {
      oldN = Number(m[1]) - 1;
      newN = Number(m[2]) - 1;
      continue;
    }
    const c = line.length > 1 ? line.slice(1) : '';
    if (line.startsWith('+')) {
      newN++;
      rows.push({ t: '+', n: String(newN), c });
    } else if (line.startsWith('-')) {
      oldN++;
      rows.push({ t: '-', n: String(oldN), c });
    } else if (line.startsWith(' ')) {
      oldN++;
      newN++;
      rows.push({ t: ' ', n: String(newN), c });
    }
  }
  return rows;
}

/** 无 patch 时对 old/new 全文做公共前缀/后缀朴素 diff（中间整段删+增） */
function rowsFromTexts(oldT: string | undefined, newT: string | undefined): DiffRow[] {
  const oldLines = oldT === undefined ? [] : oldT.split('\n');
  const newLines = newT === undefined ? [] : newT.split('\n');
  let pre = 0;
  while (pre < oldLines.length && pre < newLines.length && oldLines[pre] === newLines[pre]) pre++;
  let suf = 0;
  while (
    suf < oldLines.length - pre &&
    suf < newLines.length - pre &&
    oldLines[oldLines.length - 1 - suf] === newLines[newLines.length - 1 - suf]
  ) {
    suf++;
  }
  const rows: DiffRow[] = [];
  for (let i = 0; i < pre; i++) rows.push({ t: ' ', n: String(i + 1), c: oldLines[i] });
  for (let i = pre; i < oldLines.length - suf; i++) rows.push({ t: '-', n: String(i + 1), c: oldLines[i] });
  for (let i = pre; i < newLines.length - suf; i++) rows.push({ t: '+', n: String(i + 1), c: newLines[i] });
  for (let i = newLines.length - suf; i < newLines.length; i++) {
    rows.push({ t: ' ', n: String(i + 1), c: newLines[i] });
  }
  return rows;
}
