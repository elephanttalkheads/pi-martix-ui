// mockBridge —— 纯浏览器调试桥（dev-only）
// 浏览器直开 vite dev（无 Electron preload，window.zion 缺失）时注入 mock 实现：
// UI 全功能可演示（通话/切换会话/切换项目/文件树/命令面板），事件走真实派发路径
// （prompt → onAgentEvent 派发 message_update/工具事件/agent_end），feed 流式渲染零改动。
// 生产（Electron 打包）必有 preload 桥，installMockBridge 检测到 window.zion 后直接跳过。
import type { ZionAPI } from '../../shared/protocol';
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import { useFeed } from './store';
import type {
  SessionHistoryItem,
  SessionInfoLike,
  FileNode,
  CommandItem,
  ProjectInfo,
  SessionPayload,
  SwitchProjectResult,
} from '../../shared/protocol';

const t = () => Date.now();
/** 假会话集（项目维度：每个项目一套会话） */
const MOCK_SESSIONS: Record<string, SessionInfoLike[]> = {
  'D:/zion-workspace': [
    { id: 'mock-1', path: 'D:/zion-workspace', name: '调色板验证', firstMessage: '读取 palette-verify.txt 并核对色值', messageCount: 12, modified: '2026-08-13T14:30:00.000Z' },
    { id: 'mock-2', path: 'D:/zion-workspace', name: '会话标题摘要', firstMessage: '给会话自动生成标题', messageCount: 8, modified: '2026-08-13T12:05:00.000Z' },
    { id: 'mock-3', path: 'D:/zion-workspace', name: undefined, firstMessage: '检查文件树实时更新是否生效', messageCount: 5, modified: '2026-08-13T10:12:00.000Z' },
    { id: 'mock-7', path: 'D:/zion-workspace', name: '神经链路校准', firstMessage: '核对第四槽培育仓接线锚点', messageCount: 7, modified: '2026-08-13T09:45:00.000Z' },
    { id: 'mock-8', path: 'D:/zion-workspace', name: '休眠信号检查', firstMessage: '确认非当前会话保持完全静止', messageCount: 4, modified: '2026-08-13T09:15:00.000Z' },
    { id: 'mock-9', path: 'D:/zion-workspace', name: '滚动换线验证', firstMessage: '滚动到第六槽并检查三线替换', messageCount: 6, modified: '2026-08-13T08:40:00.000Z' },
  ],
  'D:/pi-martix-ui-dev': [
    { id: 'mock-4', path: 'D:/pi-martix-ui-dev', name: 'Sidebar 拖拽调宽', firstMessage: '侧栏边界拖拽调整宽度', messageCount: 23, modified: '2026-08-13T15:00:00.000Z' },
    { id: 'mock-5', path: 'D:/pi-martix-ui-dev', name: '文件树实时监听', firstMessage: '项目内新建删除文件时实时刷新', messageCount: 9, modified: '2026-08-13T13:40:00.000Z' },
  ],
  'D:/github-Clone/rate-your-movie': [
    { id: 'mock-6', path: 'D:/github-Clone/rate-your-movie', name: '评分页重构', firstMessage: '重构电影评分表单', messageCount: 17, modified: '2026-08-12T20:00:00.000Z' },
  ],
};

/** 假历史（按会话 id；mock-1 含思考段 + read/edit 工具块，验证历史全量恢复含 diff 卡） */
const MOCK_ITEMS: Record<string, SessionHistoryItem[]> = {
  'mock-1': [
    { role: 'user', text: '读取 palette-verify.txt 并核对色值', ts: 1786613401000 },
    {
      role: 'agent',
      ts: 1786613402000,
      blocks: [
        { kind: 'thinking', text: '先读文件核对色值，再把偏差的第二行修正。' },
        { kind: 'tool', toolCallId: 'mock-call-read', toolName: 'read', args: { path: 'palette-verify.txt' }, isError: false, dur: 0.4 },
        { kind: 'text', text: '已读取 palette-verify.txt（6 行）：line-one / PALETTE-VERIFY-2 / NEW-LINE-3 / 绕口令段。第二行色值偏差，已修正。' },
        {
          kind: 'tool',
          toolCallId: 'mock-call-edit',
          toolName: 'edit',
          args: { path: 'palette-verify.txt', edits: [{ oldText: 'PALETTE-VERIFY-2', newText: 'PALETTE-VERIFY-2-FIXED' }] },
          isError: false,
          dur: 0.9,
          result: { patch: '@@ -1,3 +1,3 @@\n line-one\n-PALETTE-VERIFY-2\n+PALETTE-VERIFY-2-FIXED\n NEW-LINE-3' },
        },
      ],
    },
  ],
  'mock-2': [
    { role: 'user', text: '给会话自动生成标题', ts: 1786593900000 },
    { role: 'agent', ts: 1786593902000, blocks: [{ kind: 'text', text: '已按首条消息摘要生成显示名，持久化于会话信息。' }] },
  ],
};

/** 假文件树 */
const MOCK_TREE: FileNode[] = [
  { name: '01.html', path: '01.html', dir: false, size: '1.2k' },
  { name: 'palette-verify.txt', path: 'palette-verify.txt', dir: false, size: '124b' },
  {
    name: 'src', path: 'src', dir: true, open: true,
    children: [
      { name: 'main.ts', path: 'src/main.ts', dir: false, size: '3.1k' },
      {
        name: 'components', path: 'src/components', dir: true, open: true,
        children: [
          { name: 'Feed.tsx', path: 'src/components/Feed.tsx', dir: false, size: '18k' },
          { name: 'Sidebar.tsx', path: 'src/components/Sidebar.tsx', dir: false, size: '12k' },
          { name: 'DiffCard.tsx', path: 'src/components/DiffCard.tsx', dir: false, size: '4.4k' },
        ],
      },
      { name: 'styles.css', path: 'src/styles.css', dir: false, size: '26k' },
    ],
  },
  {
    name: 'docs', path: 'docs', dir: true, open: false,
    children: [
      { name: 'adr', path: 'docs/adr', dir: true, open: false, children: [] },
      { name: 'AGENTS.md', path: 'docs/AGENTS.md', dir: false, size: '2.8k' },
    ],
  },
];

const MOCK_PROJECTS: ProjectInfo[] = [
  { path: 'D:/zion-workspace', lastUsed: '2026-08-13T15:20:00.000Z' },
  { path: 'D:/pi-martix-ui-dev', lastUsed: '2026-08-13T14:00:00.000Z' },
  { path: 'D:/github-Clone/rate-your-movie', lastUsed: '2026-08-12T20:00:00.000Z' },
];

const MOCK_COMMANDS: CommandItem[] = [
  { name: 'session', description: 'Show session info and stats', kind: 'command', source: '内置' },
  { name: 'copy', description: 'Copy last agent message to clipboard', kind: 'command', source: '内置' },
  { name: 'name', description: 'Set session display name', kind: 'command', source: '内置', argumentHint: '<name>' },
  { name: 'new', description: 'Start a new session', kind: 'command', source: '内置' },
  { name: 'export', description: 'Export session（HTML 默认）', kind: 'command', source: '内置', argumentHint: '[path]' },
  { name: 'compact', description: 'Manually compact the session context', kind: 'command', source: '内置' },
  { name: 'goal', description: 'Goal 自主模式：启动/状态/暂停/恢复/清除/队列（pi-goal 扩展）', kind: 'command', source: '扩展' },
  { name: 'code-review', description: 'Review changes since a fixed point', kind: 'skill', source: '用户级' },
  { name: 'tdd', description: 'Test-driven development workflow', kind: 'skill', source: '用户级' },
];

/** mock 回复：按输入生成一句话 + 一个工具动作 */
function mockReply(text: string): {
  text: string;
  think?: string;
  tool: { name: string; args: Record<string, unknown>; result: unknown };
} {
  const t0 = text.trim();
  if (t0.startsWith('改') || t0.includes('edit') || t0.includes('修改')) {
    // 编辑场景：edit 工具 + edits[]（触发蠕虫 → 命中 → 烧录显影 diff 卡全链验证）
    return {
      think: '用户要给 main.ts 补校验——先确认字段边界\nheight/weight 都是 int，业务合理域 50–280 / 10–500\n用现成的 clamp 组合即可，不引入新依赖\n保持与现有代码风格一致\n给出补丁，不改核心逻辑本身',
      text: '已读取 `src/main.ts`（68 行）。结构完整，但【字段校验缺失】：`height` 与 `weight` 没有下限约束。补丁已写入：\n\n```ts\nconst height = clamp(raw.height, 50, 280);\nconst weight = clamp(raw.weight, 10, 500);\n```\n\n共 +5 −4。',
      tool: {
        name: 'edit',
        args: {
          file: 'src/main.ts',
          edits: [
            {
              oldText: 'height: number;\n\nweight: number;',
              newText: '@IsInt() @Min(50) @Max(280)\nheight: number;\n\n@IsInt() @Min(10) @Max(500)\nweight: number;',
            },
          ],
        },
        result: {
          patch: '@@ -41,4 +41,6 @@\n height: number;\n-\n-weight: number;\n+@IsInt() @Min(50) @Max(280)\n+height: number;\n+\n+@IsInt() @Min(10) @Max(500)\n+weight: number;',
        },
      },
    };
  }
  if (t0.startsWith('读取') || t0.includes('.txt') || t0.includes('.html') || t0.startsWith('read')) {
    return {
      think: '先定位文件再读全文\n核对色值逐行比对',
      text: '已读取文件内容（mock 演示数据）：\n\n```html\n<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <title>01.html</title>\n</head>\n<body>\n  <h1>Hello Matrix</h1>\n</body>\n</html>\n```\n\n共 11 行。',
      tool: { name: 'read', args: { file: 'D:/zion-workspace/palette-verify.txt' }, result: 'line-one\nPALETTE-VERIFY-2\nNEW-LINE-3\n绕口令：四是四，十是十，十四是十四，四十是四十。\n吃葡萄不吐葡萄皮，不吃葡萄倒吐葡萄皮。' },
    };
  }
  return {
    text: `（mock 回复）已收到指令「${t0.slice(0, 40)}」。纯浏览器调试环境：此回复由 mockBridge 生成，接入 Electron 后为真实 agent 回复。`,
    tool: { name: 'bash', args: { command: `echo "${t0.slice(0, 24)}"` }, result: 'ok' },
  };
}

/** 构造 SDK 事件（字段按 feed 消费面近似，类型断言以通过 strict） */
function ev(type: string, extra: Record<string, unknown> = {}): AgentSessionEvent {
  return { type, ...extra } as unknown as AgentSessionEvent;
}

function createMock(): ZionAPI {
  let project = 'D:/zion-workspace';
  let currentId = 'mock-1';
  let aborted = false;
  const listeners = new Set<(e: AgentSessionEvent) => void>();
  const timers: ReturnType<typeof setTimeout>[] = [];
  const push = (e: AgentSessionEvent) => listeners.forEach((cb) => cb(e));
  const after = (ms: number, fn: () => void) => {
    const h = setTimeout(() => { if (!aborted) fn(); }, ms);
    timers.push(h);
  };

  const firePrompt = (text: string) => {
    aborted = false;
    const reply = mockReply(text);
    const toolId = `mock-tool-${t()}`;
    let at = 0;
    push(ev('agent_start'));
    // 思考段（脑波褶验证）：thinking_delta 先行
    if (reply.think) {
      at += 100;
      after(at, () => push(ev('message_update', { message: { id: `mock-msg-${t()}` }, assistantMessageEvent: { type: 'thinking_delta', delta: reply.think } })));
    }
    at += 120;
    after(at, () => push(ev('tool_execution_start', { toolCallId: toolId, toolName: reply.tool.name, args: reply.tool.args })));
    at += 140;
    after(at, () => push(ev('message_update', { message: { id: `mock-msg-${t()}` }, assistantMessageEvent: { type: 'text_delta', delta: reply.text } })));
    at += 500;
    after(at, () => push(ev('tool_execution_end', { toolCallId: toolId, toolName: reply.tool.name, isError: false, result: reply.tool.result })));
    at += 120;
    // usage（结算行 tok + 微簇 ctx 条）
    after(at, () => push(ev('turn_end', { message: { usage: { totalTokens: 1832, input: 12400 } } })));
    at += 40;
    after(at, () => push(ev('message_end', { message: { id: `mock-msg-${t()}`, role: 'assistant', stopReason: 'ok' } })));
    at += 40;
    after(at, () => push(ev('agent_end')));
    at += 40;
    after(at, () => push(ev('agent_settled')));
  };

  const itemsFor = (id: string): SessionHistoryItem[] => MOCK_ITEMS[id] ?? [];
  const payload = (id: string): SessionPayload => ({ id, items: itemsFor(id) });

  return {
    ping: async () => ({ ok: true, pid: 4242 }),
    prompt: async (text) => { firePrompt(text); return 'ok'; },
    abort: async () => { aborted = true; return true; },
    steer: async () => true,
    followUp: async () => true,
    scanTree: async () => MOCK_TREE,
    listCommands: async () => MOCK_COMMANDS,
    runCommand: async (name, args) => {
      const { log, pushToast, openModal } = useFeed.getState();
      const msg = `/mock:${name}${args ? ' ' + args : ''}（mock 模式，不真正执行）`;
      log('dim', `[CMD] ${msg}`);
      pushToast({ message: msg, type: 'info' });
      // 弹层类命令：mock 也打开对应弹层（无载荷），保证浏览器调试可验证交互流
      const openMap: Record<string, 'model-picker' | 'settings' | 'hotkeys'> = {
        model: 'model-picker',
        settings: 'settings',
        hotkeys: 'hotkeys',
      };
      const open = openMap[name];
      if (open) openModal(open);
      return { ok: true, message: msg, kind: 'info' };
    },
    listSessions: async () => MOCK_SESSIONS[project] ?? [],
    getCurrentSession: async () => payload(currentId),
    switchSession: async (id) => { currentId = id; return payload(id); },
    newSession: async () => {
      const id = `mock-new-${t()}`;
      currentId = id;
      return { id, items: [] };
    },
    uiAnswer: async () => ({ ok: true }),
    listProjects: async () => MOCK_PROJECTS,
    getSessionMeta: async () => ({ model: 'deepseek-chat', contextWindow: 128000, thinkingLevel: 'high' }),
    getProject: async () => ({ path: project }),
    browseProject: async (): Promise<SwitchProjectResult | null> => {
      // 浏览器无原生对话框：轮换到下一个 mock 项目模拟选择
      const i = MOCK_PROJECTS.findIndex((p) => p.path === project);
      const next = MOCK_PROJECTS[(i + 1) % MOCK_PROJECTS.length];
      project = next.path;
      const sid = MOCK_SESSIONS[project]?.[0]?.id ?? `mock-new-${t()}`;
      currentId = sid;
      return { path: project, id: sid, items: itemsFor(sid) };
    },
    switchProject: async (dir) => {
      project = dir;
      const sid = MOCK_SESSIONS[dir]?.[0]?.id ?? `mock-new-${t()}`;
      currentId = sid;
      return { path: dir, id: sid, items: itemsFor(sid) };
    },
    onUiAsk: () => () => {},
    onUiNotify: () => () => {},
    renameSession: async (id, name) => {
      const list = MOCK_SESSIONS[project] ?? [];
      const s = list.find((x) => x.id === id);
      if (s) s.name = name;
      return list;
    },
    deleteSession: async (id) => {
      const list = MOCK_SESSIONS[project] ?? [];
      MOCK_SESSIONS[project] = list.filter((x) => x.id !== id);
      if (id === currentId) currentId = MOCK_SESSIONS[project]?.[0]?.id ?? `mock-new-${t()}`;
      return MOCK_SESSIONS[project] ?? [];
    },
    onAgentEvent: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    onTreeChanged: () => () => {},
  };
}

/** 入口注入：无桥（纯浏览器调试）时安装 mock；有桥（Electron）原样保留 */
export function installMockBridge(): void {
  if (window.zion) return;
  window.zion = createMock();
  console.info('[mockBridge] 纯浏览器调试桥已注入（window.zion = mock 实现）');
}
