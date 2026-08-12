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

/** feed 消息项 —— 渲染层数据模型（与 SDK 事件解耦，只保留 UI 所需字段） */
export type FeedItem =
  | { id: string; kind: 'user'; text: string; time: string }
  | { id: string; kind: 'assistant'; text: string; time: string; interrupted?: boolean }
  | {
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
  items: FeedItem[];
  sessionState: SessionState;
  logs: LogLine[];
  tree: FileNode[];
  /** 工作区会话列表（左侧会话卡） */
  sessions: SessionInfoLike[];
  /** 当前会话 id（null=尚未就绪） */
  currentSessionId: string | null;
  /** 当前会话显示标题（消息头/芯片/神经核心标签） */
  sessionTitle: string;
  tokenCount: number;
  sndOn: boolean;
  /** 蠕虫命中完成（releaseWorm done 回调）后登记的 toolCallId 集合——diff 卡延迟到命中后渲染 */
  revealedEdits: Record<string, true>;
  /** 工具链块展开态（trace 行点击展开完整参数） */
  expandedTools: Record<string, true>;
  /** 当前扩展对话框（null=无；AskDialog 渲染） */
  uiAsk: UiAsk | null;
  /** 扩展通知队列（toast） */
  toasts: { id: number; message: string; type?: UiNotify['type'] }[];
  /** 在爬蠕虫计数（releaseWorm 开始 +1、done -1）——Neo 头像张嘴 = wormActive > 0 */
  wormActive: number;

  pushUser(text: string): void;
  /** 流式增量追加到末条 assistant 消息（无则新建）；每字符 token +2 */
  appendDelta(delta: string): void;
  /** 中断时给末条 assistant 消息追加红色中断标记 */
  markInterrupted(): void;
  toolStart(ev: Pick<ToolExecutionStartEvent, 'toolCallId' | 'toolName' | 'args'>, edit?: EditInfo): void;
  toolEnd(toolCallId: string, isError: boolean, result?: unknown): void;
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
  setTree(tree: FileNode[]): void;
  setSessions(sessions: SessionInfoLike[]): void;
  /** 仅更新当前会话显示标题（不重置 feed；重命名当前会话时用） */
  setSessionTitle(title: string): void;
  /** 切换/新建会话：设置当前会话 + 以历史重建 feed（清 token/状态机回 READY） */
  applySession(id: string, title: string, items: SessionHistoryItem[]): void;
  setSndOn(on: boolean): void;
  reset(): void;
}

let id = 0;
const nid = () => `i${++id}`;
const msgTime = () => new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
const logTime = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

export const useFeed = create<FeedState>()((set) => ({
  items: [],
  sessionState: 'READY',
  logs: [],
  tree: [],
  sessions: [],
  currentSessionId: null,
  sessionTitle: '…',
  tokenCount: 0,
  sndOn: localStorage.getItem('zion.snd') !== '0',
  revealedEdits: {},
  expandedTools: {},
  uiAsk: null,
  toasts: [],
  wormActive: 0,

  pushUser(text) {
    set((s) => ({ items: [...s.items, { id: nid(), kind: 'user', text, time: msgTime() }] }));
  },
  appendDelta(delta) {
    if (!delta) return;
    set((s) => {
      const items = [...s.items];
      const last = items[items.length - 1];
      if (last && last.kind === 'assistant') {
        items[items.length - 1] = { ...last, text: last.text + delta };
      } else {
        items.push({ id: nid(), kind: 'assistant', text: delta, time: msgTime() });
      }
      return { items, tokenCount: s.tokenCount + delta.length * 2 };
    });
  },
  markInterrupted() {
    set((s) => {
      const items = [...s.items];
      const last = items[items.length - 1];
      if (last && last.kind === 'assistant') {
        items[items.length - 1] = { ...last, interrupted: true };
      }
      return { items };
    });
  },
  toolStart(ev, edit) {
    set((s) => ({
      items: [
        ...s.items,
        {
          id: nid(),
          kind: 'tool',
          toolCallId: ev.toolCallId,
          toolName: ev.toolName,
          args: ev.args,
          status: 'run',
          time: msgTime(),
          startAt: performance.now(),
          edit,
        },
      ],
    }));
  },
  toolEnd(toolCallId, isError, result) {
    set((s) => {
      const items = [...s.items];
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.kind === 'tool' && it.toolCallId === toolCallId && it.status === 'run') {
          const upgrade = upgradeEditFromResult(it, result);
          items[i] = {
            ...it,
            status: isError ? 'err' : 'ok',
            dur: (performance.now() - it.startAt) / 1000,
            edit: upgrade ?? it.edit,
          };
          break;
        }
      }
      return { items };
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
  setSessions(sessions) { set({ sessions }); },
  setSessionTitle(title) { set({ sessionTitle: title }); },
  setTree(tree) { set({ tree }); },
  applySession(id, title, items) {
    const feedItems: FeedItem[] = items.map((h) => ({
      id: nid(),
      kind: h.role,
      text: h.text,
      time: h.ts ? new Date(h.ts).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : msgTime(),
    }));
    set({ currentSessionId: id, sessionTitle: title, items: feedItems, sessionState: 'READY', tokenCount: 0, expandedTools: {} });
  },
  setSndOn(sndOn) {
    localStorage.setItem('zion.snd', sndOn ? '1' : '0');
    set({ sndOn });
  },
  reset() { set({ items: [], sessionState: 'READY', tokenCount: 0 }); },
}));

/* ---------------- 蠕虫目标定位（事件层同步调用，不依赖 React 渲染时序） ---------------- */

/** 会话显示标题（纯函数，见 title.ts）：name → firstMessage 智能摘要 → 会话短码 */
export { deriveSessionTitle } from './title';

/** 归一化工具路径：反斜杠→正斜杠、去盘符、去前导斜杠 */
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
  item: Extract<FeedItem, { kind: 'tool' }>,
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
