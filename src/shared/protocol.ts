// ZION 渲染进程 ↔ 主进程 IPC 契约（单一事实源）
//
// 用法：
// - 渲染进程：`import type { ... } from '../../shared/protocol'` —— 纯类型 import，构建时被
//   vite/esbuild 整体擦除，不产生运行时依赖。
// - 主进程（main.mjs）/ preload（preload.cjs）：`.mjs`/`.cjs` 保持 JS（preload 受 sandbox
//   约束必须是 CJS；main 的 TS 构建管线是后续步骤），通过 JSDoc 引用本文件类型：
//   `@typedef {import('../shared/protocol.ts').ZionAPI} ZionAPI`，并由
//   `tsc -p tsconfig.node.json`（checkJs）校验。
//
// ⚠️ IPC 通道名字符串（'zion:ping' / 'agent:prompt' / 'agent:abort' / 'agent:steer' /
// 'agent:followUp' / 'agent:event' 等，完整清单见 src/main/DESIGN.md「接口」节）
// 散落在 main.mjs 与 preload.cjs 两处字面量中，改动须同步两处。
// 改动时需同步 —— 主进程/preload 均为 JS 无法共享运行时常量，勿试图在此导出后被 .mjs/.cjs import。

// 主进程 → 渲染进程：agent 事件流。
// 原样透传 pi SDK 会话事件（session.subscribe 的 payload），渲染层按 type 判别收窄。
// 类型源头：@earendil-works/pi-coding-agent（dist/core/agent-session.d.ts）
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
export type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';

/** 会话列表项（主进程 SessionManager.list 精简映射） */
export interface SessionInfoLike {
  id: string;
  path: string;
  name?: string;
  /** 首条消息摘要（标题） */
  firstMessage: string;
  messageCount: number;
  modified: string;
}

/** 会话历史消息（切换会话时恢复 feed 用，仅 user/assistant 文本） */
export interface SessionHistoryItem {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

/**
 * window.zion —— preload（preload.cjs）暴露给渲染进程的安全桥。
 * 渲染进程零 Node 访问，仅此白名单 API（contextIsolation + sandbox）。
 */
export interface ZionAPI {
  /** 桥连通性自检：{ ok: true, pid } */
  ping(): Promise<{ ok: boolean; pid: number }>;
  /** 发送指令到当前 agent 会话；resolve 为末条消息 stopReason（'ok'/'error'/'aborted'…，prompt 从不抛错） */
  prompt(text: string): Promise<string>;
  /** 中止当前回合 */
  abort(): Promise<boolean>;
  /** 运行中 steer（更新当前意图） */
  steer(text: string): Promise<boolean>;
  /** 追加 follow-up 指令 */
  followUp(text: string): Promise<boolean>;
  /** 扫描工作目录 → 文件树（目录递归，跳过 node_modules/.git 等） */
  scanTree(): Promise<FileNode[]>;
  /** 命令面板：本机全部 skills + 命令清单（主进程聚合扫描） */
  listCommands(): Promise<CommandItem[]>;
  /** 执行 slash 命令（主进程 dispatch）；返回结构化结果（ok/message + 可选 data） */
  runCommand(name: string, args?: string): Promise<RunCommandResult>;
  /** 工作区会话列表（SessionManager.list 精简） */
  listSessions(): Promise<SessionInfoLike[]>;
  /** 当前会话（惰性确保：continueRecent 或新建）+ 其历史；返回会话信息与历史 */
  getCurrentSession(): Promise<SessionPayload>;
  /** 切换到指定会话（首次进入懒创建实例，慢则秒级）；返回历史 */
  switchSession(id: string): Promise<SessionPayload>;
  /** 新建会话并切换 */
  newSession(): Promise<SessionPayload>;
  /** 应答扩展对话框（结果回传 uiBridge；取消传 undefined）返回处理结果 */
  uiAnswer(id: string, result: string | boolean | undefined): Promise<{ ok: boolean }>;
  /** 最近项目列表（~/.pi/agent/zion-projects.json） */
  listProjects(): Promise<ProjectInfo[]>;
  /** 当前项目工作目录 */
  getProject(): Promise<{ path: string }>;
  /** 原生目录选择器：选择后直接切换项目；取消返回 null */
  browseProject(): Promise<SwitchProjectResult | null>;
  /** 切换项目（工作目录 + 会话上下文重建）；返回新会话历史 */
  switchProject(dir: string): Promise<SwitchProjectResult>;
  /** 订阅扩展对话框请求（AskDialog 渲染）；返回取消订阅函数 */
  onUiAsk(cb: (ask: UiAsk) => void): () => void;
  /** 订阅扩展通知（toast 渲染）；返回取消订阅函数 */
  onUiNotify(cb: (n: UiNotify) => void): () => void;
  /** 重命名会话（持久化显示名）；返回刷新后的会话列表 */
  renameSession(id: string, name: string): Promise<SessionInfoLike[]>;
  /** 删除会话（文件移入 .trash/ 回收目录）；返回刷新后的会话列表 */
  deleteSession(id: string): Promise<SessionInfoLike[]>;
  /** 订阅主进程转发的 agent 事件流；返回取消订阅函数（App 卸载时调用） */
  onAgentEvent(cb: (event: AgentSessionEvent) => void): () => void;
  /** 订阅工作区文件树变化（主进程 fs.watch 防抖重扫后推送，覆盖新建/删除/改名） */
  onTreeChanged(cb: (tree: FileNode[]) => void): () => void;
}

/** 文件树节点（主进程扫描工作目录返回） */
export interface FileNode {
  name: string;
  /** 相对工作目录的斜杠路径（如 src/core/neural-core.js） */
  path: string;
  dir: boolean;
  /** 人类可读大小（目录无此字段） */
  size?: string;
  /** 目录默认展开 */
  open?: boolean;
  children?: FileNode[];
}

/** 命令面板条目：skill 或 slash 命令 */
export interface CommandItem {
  /** 展示名（skill 名或命令名，不含斜杠） */
  name: string;
  description: string;
  kind: 'skill' | 'command';
  /** 来源标注（skill：用户/共享/项目/settings/扩展·包名；command：内置/扩展） */
  source: string;
  /** 命令参数提示（官方 BUILTIN_SLASH_COMMANDS.argumentHint，如 '<provider/model>'）；缺省=无参数命令 */
  argumentHint?: string;
}

/** 命令执行结果（zion:run-command 返回；renderer 渲染日志/toast） */
export interface RunCommandResult {
  ok: boolean;
  /** 展示消息（写日志 / toast 文案） */
  message: string;
  /** 结果性质：info=日志即可，ok=成功（绿色 toast），error=失败（红色） */
  kind?: 'info' | 'ok' | 'error';
  /** 命令专属载荷（如 session 统计、导出路径） */
  data?: unknown;
}

/** 扩展对话框请求（main → renderer，经 uiBridge） */
export interface UiAsk {
  id: string;
  kind: 'confirm' | 'input' | 'select';
  title: string;
  /** confirm 的消息 / input 的 placeholder */
  message?: string;
  /** select 的选项列表 */
  options?: string[];
  timeoutMs?: number;
}

/** 扩展通知（main → renderer 单向，toast） */
export interface UiNotify {
  message: string;
  type?: 'info' | 'warning' | 'error';
}

/** 最近项目条目 */
export interface ProjectInfo {
  path: string;
  lastUsed: string;
}

/** 切换项目结果（新工作目录 + 新当前会话历史） */
export interface SwitchProjectResult {
  path: string;
  id: string;
  items: SessionHistoryItem[];
}

/** 会话操作载荷：会话 id + 历史（getCurrent/switch/new/项目切换共用） */
export interface SessionPayload {
  id: string;
  items: SessionHistoryItem[];
}
