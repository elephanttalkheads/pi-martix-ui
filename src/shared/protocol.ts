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
// 'agent:followUp' / 'agent:event'）散落在 main.mjs 与 preload.cjs 三处字面量中，
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
  /** 工作区会话列表（SessionManager.list 精简） */
  listSessions(): Promise<SessionInfoLike[]>;
  /** 当前会话（惰性确保：continueRecent 或新建）+ 其历史；返回会话信息与历史 */
  getCurrentSession(): Promise<{ id: string; items: SessionHistoryItem[] }>;
  /** 切换到指定会话（首次进入懒创建实例，慢则秒级）；返回历史 */
  switchSession(id: string): Promise<{ id: string; items: SessionHistoryItem[] }>;
  /** 新建会话并切换 */
  newSession(): Promise<{ id: string; items: SessionHistoryItem[] }>;
  /** 订阅主进程转发的 agent 事件流；返回取消订阅函数（App 卸载时调用） */
  onAgentEvent(cb: (event: AgentSessionEvent) => void): () => void;
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
  /** 来源标注（用户级/共享/扩展包/项目/内置/扩展） */
  source: string;
}
