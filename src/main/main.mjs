// ZION 主进程 —— pi SDK 进程内接入
// 模式：多会话并存（Map<sessionId, AgentSession>，懒创建）+ 当前指针切换
// 事件转发只发当前会话；createAgentSession（复用 ~/.pi/agent 配置）→ session.subscribe → IPC → renderer
// 参考：tbrandenburg/pi-desktop；docs/sdk.md
import { app, BrowserWindow, ipcMain, dialog, clipboard } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createAgentSession, SessionManager, hasTrustRequiringProjectResources, ProjectTrustStore, resolveModelScopeWithDiagnostics } from '@earendil-works/pi-coding-agent';
import { collectCommands } from './skillscan.mjs';
import { createUiBridge } from './uibridge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');
const RENDERER_DEV_URL = 'http://127.0.0.1:5173';

// 当前工作目录（项目选择 UI 落地后可变：切换项目 = 更新此值 + 重建会话上下文）
let WORKSPACE_DIR = path.join('D:', 'zion-test');

// 最近项目文件（上移供启动恢复；项目选择 IPC 见下）
const PROJECTS_FILE = path.join(os.homedir(), '.pi', 'agent', 'zion-projects.json');
const PROJECTS_MAX = 8;

// 启动恢复最近项目：切换过项目后重启应回到上次项目（而非默认工作区）
try {
  const recent = listProjects();
  if (recent.length > 0 && recent[0].path) {
    WORKSPACE_DIR = recent[0].path;
    console.log('[zion] startup restore project →', WORKSPACE_DIR);
  } else {
    console.log('[zion] startup no recent project, default →', WORKSPACE_DIR);
  }
} catch (e) {
  console.warn('[zion] startup project restore failed:', String(e));
}


// 扩展 UI 桥：dialog 请求 → renderer 弹层（AskDialog）；经 session.bindExtensions({ uiContext }) 注入
// （headless 默认无 UI——扩展 ask 与项目信任询问此前全部静默落空）
const uiBridge = createUiBridge();

/** 向渲染窗口派发 UI 事件（无窗口时 ask 已在桥层保持挂起，由 timeout 兜底） */
function dispatchUi() {
  uiBridge.setDispatch({
    ask: (/** @type {import('../shared/protocol.ts').UiAsk} */ ask) => win?.webContents.send('zion:ui-ask', ask),
    notify: (/** @type {import('../shared/protocol.ts').UiNotify} */ n) => win?.webContents.send('zion:ui-notify', n),
  });
}

/** @type {import('electron').BrowserWindow | null} */
let win = null;
/** @type {Map<string, import('@earendil-works/pi-coding-agent').AgentSession>} */
const sessions = new Map();
/** @type {import('@earendil-works/pi-coding-agent').AgentSession | null} */
let currentSession = null;

function createWindow() {
  dispatchUi();
  const w = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true, // 安全基线：渲染进程不碰 Node/凭据
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win = w;
  if (isDev) w.loadURL(RENDERER_DEV_URL);
  else w.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));

  // 渲染层加载完成后自检（便于 CDP/日志确认桥已注入）
  w.webContents.on('did-finish-load', () => {
    w.webContents.executeJavaScript('Boolean(window.zion)').then((ok) => {
      console.log('[zion] preload bridge injected:', ok);
    }).catch(() => {});
  });
}

// 事件转发：仅当前会话的事件发给渲染层
function wireSession(/** @type {import('@earendil-works/pi-coding-agent').AgentSession} */ s) {
  s.subscribe(/** @param {import('@earendil-works/pi-coding-agent').AgentSessionEvent} event */ (event) => {
    if (win && !win.isDestroyed() && s === currentSession) {
      win.webContents.send('agent:event', event);
    }
  });
}

/** 从 state.messages 提取 user/assistant 文本历史（工具消息跳过） */
function historyFromSession(/** @type {import('@earendil-works/pi-coding-agent').AgentSession} */ s) {
  /** @type {import('../shared/protocol.ts').SessionHistoryItem[]} */
  const out = [];
  for (const m of s.state.messages) {
    if (m.role === 'user') {
      const text =
        typeof m.content === 'string'
          ? m.content
          : m.content
              .filter((/** @type {any} */ c) => c.type === 'text')
              .map((/** @type {any} */ c) => c.text)
              .join('\n');
      if (text) out.push({ role: 'user', text, ts: m.timestamp });
    } else if (m.role === 'assistant') {
      const text = m.content
        .filter((/** @type {any} */ c) => c.type === 'text')
        .map((/** @type {any} */ c) => c.text)
        .join('\n');
      if (text) out.push({ role: 'assistant', text, ts: m.timestamp });
    }
  }
  return out;
}

/**
 * @param {import('@earendil-works/pi-coding-agent').SessionManager} sessionManager
 * @param {string} id
 */
async function ensureSessionFor(sessionManager, id) {
  const cached = sessions.get(id);
  if (cached) {
    currentSession = cached;
    return cached;
  }
  // 超时胜负判定：race 败（超时）后，迟到的 init 不得再 set/覆盖指针（防事件串台）
  let settled = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => {
      settled = true;
      rej(new Error('agent init timeout'));
    }, 45000);
  });
  const init = (async () => {
    const { session } = await createAgentSession({
      cwd: WORKSPACE_DIR,
      sessionManager,
    });
    if (settled) {
      // race 已超时败北：迟到的初始化不接管（释放实例，调用方已收到超时错误）
      try {
        session.dispose();
      } catch { /* 释放异常忽略 */ }
      throw new Error('agent init timeout');
    }
    if (timer) clearTimeout(timer);
    // 扩展 UI 桥注入：bindExtensions 是官方路径（CreateAgentSessionOptions 无 uiContext 字段）——
    // 注入后扩展的 ctx.ui.confirm/select/input/notify 真实弹窗，不再 headless 静默落空
    await session.bindExtensions({ uiContext: uiBridge });
    sessions.set(id, session);
    currentSession = session;
    wireSession(session);
    return session;
  })();
  return Promise.race([init, timeout]);
}

/** 当前会话（无则 continueRecent，无历史则新建） */
async function ensureCurrentSession() {
  if (currentSession) return currentSession;
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  const sm = SessionManager.continueRecent(WORKSPACE_DIR);
  const id = sm.getSessionId();
  return ensureSessionFor(sm, id);
}

/** 会话列表（工作区） */
async function listSessionInfos() {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  const infos = await SessionManager.list(WORKSPACE_DIR);
  const diskIds = new Set(infos.map((i) => i.id));
  // 合并内存中未落盘的活跃会话：SDK 的 SessionManager.create 不写盘（无 assistant 消息时
  // _persist 只置 flushed 标记），磁盘 list 扫不到 → /new 后新仓在侧栏不可见，
  // 必须等切换会话触发列表刷新才出现。此处把 sessions Map 里有实例但磁盘无文件的会话补进列表。
  /** @type {import('@earendil-works/pi-coding-agent').SessionInfo[]} */
  const merged = [...infos];
  for (const s of sessions.values()) {
    const id = s.sessionManager.getSessionId();
    if (!id || diskIds.has(id)) continue;
    const file = s.sessionManager.getSessionFile();
    if (file && fs.existsSync(file)) continue; // 已落盘（双保险）
    const name = s.sessionManager.getSessionName();
    const now = new Date();
    merged.push({
      id,
      path: file ?? '',
      name,
      firstMessage: '',
      messageCount: s.state.messages.length,
      modified: now,
      cwd: WORKSPACE_DIR,
      created: now,
      allMessagesText: '',
    });
  }
  return merged
    .map((i) => ({
      id: i.id,
      path: i.path,
      name: i.name,
      firstMessage: (i.firstMessage ?? '').slice(0, 80),
      messageCount: i.messageCount,
      modified: i.modified.toISOString(),
    }))
    .sort((a, b) => (a.modified < b.modified ? 1 : -1));
}

// ---- IPC ----
ipcMain.handle('zion:ping', () => ({ ok: true, pid: process.pid }));

// 文件树扫描：工作目录递归（深度 ≤3，跳过产物/依赖目录）
const SCAN_MAX_DEPTH = 3;
const SCAN_SKIP = new Set(['node_modules', '.git', 'dist', 'dist-renderer', 'graphify-out', '.vite']);
/** @param {number} bytes */
function humanSize(bytes) {
  if (bytes < 1024) return bytes + 'b';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'k';
  return (bytes / 1024 / 1024).toFixed(1) + 'M';
}
/**
 * @param {string} dir
 * @param {string} base
 * @param {number} depth
 */
function scanDir(dir, base, depth) {
  /** @type {import('../shared/protocol.ts').FileNode[]} */
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SCAN_SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (e.isDirectory()) {
      out.push({
        name: e.name,
        path: rel,
        dir: true,
        open: depth < 2,
        children: depth < SCAN_MAX_DEPTH ? scanDir(full, base, depth + 1) : [],
      });
    } else if (e.isFile()) {
      try {
        out.push({ name: e.name, path: rel, dir: false, size: humanSize(fs.statSync(full).size) });
      } catch {
        /* 忽略无法 stat 的文件 */
      }
    }
  }
  out.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  return out;
}
ipcMain.handle('zion:scan-tree', () => scanDir(WORKSPACE_DIR, WORKSPACE_DIR, 0));

// ---- 文件树实时监听：项目内新建/删除/改名（含 agent 非编辑工具、外部编辑器）→ 防抖重扫 → 变化推 renderer ----
let /** @type {import('node:fs').FSWatcher | null} */ treeWatcher = null;
let /** @type {ReturnType<typeof setTimeout> | null} */ treeDebounce = null;
let /** @type {string | null} */ lastTreeJson = null;

function watchWorkspaceTree() {
  unwatchWorkspaceTree();
  lastTreeJson = null;
  try {
    treeWatcher = fs.watch(WORKSPACE_DIR, { recursive: true }, onTreeChange);
    console.log('[zion] tree watcher on →', WORKSPACE_DIR);
  } catch (e) {
    console.warn('[zion] 文件树监听失败（watch 不可用，退化为手动刷新）:', String(e));
  }
}

/** @param {string | null} _ev @param {string | null} filename */
function onTreeChange(_ev, filename) {
  // 跳过忽略目录内的变化（node_modules/.git/dist 等）：重扫结果不变，无需浪费
  if (filename) {
    const top = filename.split(/[\\/]/)[0];
    if (SCAN_SKIP.has(top) || top.startsWith('.')) return;
  }
  if (treeDebounce) clearTimeout(treeDebounce);
  treeDebounce = setTimeout(() => {
    treeDebounce = null;
    const fresh = scanDir(WORKSPACE_DIR, WORKSPACE_DIR, 0);
    const json = JSON.stringify(fresh);
    if (json !== lastTreeJson) {
      lastTreeJson = json;
      win?.webContents.send('zion:tree-changed', fresh);
    }
  }, 400);
}

function unwatchWorkspaceTree() {
  if (treeDebounce) {
    clearTimeout(treeDebounce);
    treeDebounce = null;
  }
  if (treeWatcher) {
    try {
      treeWatcher.close();
    } catch { /* 忽略关闭异常 */ }
    treeWatcher = null;
  }
}

// 文件树实时监听（启动恢复 WORKSPACE_DIR 后；切换项目时经 switchProject 重建）
watchWorkspaceTree();

// 命令面板：聚合本机全部 skills + 命令（用户级/共享/项目/扩展包/settings.skills + 内置/扩展命令）
ipcMain.handle('zion:list-commands', () => {
  const home = os.homedir();
  const npmRoot = path.join(home, '.pi', 'agent', 'npm', 'node_modules');
  let settingsSkills = [];
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(home, '.pi', 'agent', 'settings.json'), 'utf8'));
    if (Array.isArray(settings.skills)) settingsSkills = settings.skills.map((/** @type {string} */ p) => p.replace(/^~/, home));
  } catch { /* 无 settings 或解析失败 → 空 */ }
  return collectCommands({
    userSkillsDir: path.join(home, '.pi', 'agent', 'skills'),
    sharedSkillsDir: path.join(home, '.agents', 'skills'),
    projectSkillsDirs: [path.join(WORKSPACE_DIR, '.pi', 'skills'), path.join(WORKSPACE_DIR, '.agents', 'skills')],
    packagesRoot: npmRoot,
    settingsSkillPaths: settingsSkills,
  });
});

// ---- 命令执行 dispatch（#24）—— zion:run-command 主进程路由 ----
// handler 注册表：name → (args?) => Promise<RunCommandResult>。
// 未实现命令（UI 弹层类）返回明确占位错误，不静默吞掉。

/**
 * 统一命令结果工厂（kind: ok=成功 toast / info=仅日志 / error=失败 toast）
 * @param {'ok' | 'info' | 'error'} kind
 * @param {string} message
 * @param {Record<string, unknown> | null} [data]
 * @returns {import('../shared/protocol.ts').RunCommandResult}
 */
function cmd(kind, message, data) {
  /** @type {import('../shared/protocol.ts').RunCommandResult} */
  const r = { ok: kind !== 'error', message, kind };
  if (data != null) r.data = data;
  return r;
}

/** dialog 调用统一挂父窗口（三处同形，提取防重复）
 * @template T
 * @param {(w: import('electron').BrowserWindow) => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withWin(fn) {
  return win ? fn(win) : fn(/** @type {never} */ (null));
}

/** @type {Record<string, (args?: string) => Promise<import('../shared/protocol.ts').RunCommandResult>>} */
const commandHandlers = {
  // ---- 会话管理类 ----
  new: async () => {
    const ok = await uiBridge.confirm('新建会话', '创建新会话并切换过去？（当前上下文保留可恢复）', { timeout: 30000 });
    if (!ok) return cmd('info', '已取消新建会话');
    const sm = SessionManager.create(WORKSPACE_DIR);
    const id = sm.getSessionId();
    const s = await ensureSessionFor(sm, id);
    return cmd('ok', `已新建会话 ${id.slice(0, 8)}`, { id, items: historyFromSession(s) });
  },
  session: async () => {
    const s = await ensureCurrentSession();
    const id = s.sessionManager.getSessionId();
    const msgs = s.state.messages.length;
    const infos = await listSessionInfos();
    const cur = infos.find((i) => i.id === id);
    return cmd('ok', `会话 ${id.slice(0, 8)} · ${msgs} 条消息 · ${cur?.name ?? '未命名'}`, { id, msgs });
  },
  copy: async () => {
    const s = await ensureCurrentSession();
    const text = s.getLastAssistantText();
    if (!text) return cmd('error', '当前会话还没有 assistant 消息可复制');
    clipboard.writeText(text);
    return cmd('ok', `已复制末条回复（${text.length} 字符）到剪贴板`);
  },
  name: async (args) => {
    const s = await ensureCurrentSession();
    const name = (args ?? '').trim();
    if (!name) return cmd('error', '用法：/name <会话名>');
    s.sessionManager.appendSessionInfo(name);
    return cmd('ok', `会话已命名为「${name}」`);
  },
  compact: async () => {
    const s = await ensureCurrentSession();
    const r = await s.compact();
    return cmd('ok', '上下文压缩完成', r);
  },
  export: async (args) => {
    const s = await ensureCurrentSession();
    const spec = (args ?? '').trim();
    const isJsonl = spec.toLowerCase().endsWith('.jsonl');
    // 带路径参数：直接导出到指定路径（官方语义 or specify path）
    if (spec) {
      const target = path.resolve(WORKSPACE_DIR, spec);
      const out = isJsonl ? s.exportToJsonl(target) : await s.exportToHtml(target);
      return cmd('ok', `已导出 → ${out}`, { path: out });
    }
    /** @type {Electron.SaveDialogOptions} */
    const opts = {
      title: '导出会话',
      defaultPath: path.join(os.homedir(), `zion-session.${isJsonl ? 'jsonl' : 'html'}`),
      filters: isJsonl
        ? [{ name: 'JSONL 会话', extensions: ['jsonl'] }]
        : [{ name: 'HTML 会话', extensions: ['html'] }],
    };
    const r = await withWin((w) => dialog.showSaveDialog(w, opts));
    if (r.canceled || !r.filePath) return cmd('info', '已取消导出');
    const out = isJsonl ? s.exportToJsonl(r.filePath) : await s.exportToHtml(r.filePath);
    return cmd('ok', `已导出 → ${out}`, { path: out });
  },
  import: async (args) => {
    const preset = (args ?? '').trim();
    /** @type {Electron.OpenDialogOptions} */
    const opts = {
      title: '导入会话',
      filters: [{ name: 'JSONL 会话', extensions: ['jsonl'] }],
      properties: ['openFile'],
    };
    const r = preset
      ? { canceled: false, filePaths: [preset] }
      : await withWin((w) => dialog.showOpenDialog(w, opts));
    if (r.canceled || r.filePaths.length === 0) return cmd('info', '已取消导入');
    const sm = SessionManager.open(r.filePaths[0], undefined, WORKSPACE_DIR);
    const id = sm.getSessionId();
    const s = await ensureSessionFor(sm, id);
    return cmd('ok', `已导入会话 ${id.slice(0, 8)}（${r.filePaths[0]}）`, { id, items: historyFromSession(s) });
  },
  resume: async () => {
    const infos = await listSessionInfos();
    if (infos.length === 0) return cmd('error', '没有可恢复的会话');
    const cur = currentSession?.sessionManager.getSessionId();
    const candidates = infos.filter((i) => i.id !== cur);
    if (candidates.length === 0) return cmd('info', '已在最新会话');
    // 选项带短 id 前缀，反查用短码匹配——会话名/首条消息含分隔符也不会错选
    const label = (/** @type {import('../shared/protocol.ts').SessionInfoLike} */ i) => `[${i.id.slice(0, 8)}] ${(i.name ?? i.firstMessage) || '未命名'} · ${i.modified.slice(0, 10)}`;
    const pick = await uiBridge.select('恢复会话', candidates.map(label), { timeout: 30000 });
    if (pick === undefined) return cmd('info', '已取消恢复');
    const short = /^\[([0-9a-f]{8})\]/.exec(pick)?.[1];
    const info = short ? candidates.find((i) => i.id.startsWith(short)) : undefined;
    if (!info) return cmd('error', '选择未匹配到会话');
    const sm = SessionManager.open(info.path, undefined, WORKSPACE_DIR);
    const id = sm.getSessionId();
    const s = await ensureSessionFor(sm, id);
    return cmd('ok', `已切换到会话 ${id.slice(0, 8)}`, { id, items: historyFromSession(s) });
  },

  // ---- 系统类 ----
  reload: async () => {
    const s = await ensureCurrentSession();
    await s.reload();
    return cmd('ok', '已重载 keybindings / extensions / skills / prompts / themes / context');
  },
  quit: async () => {
    /** @type {Electron.MessageBoxOptions} */
    const opts = {
      type: 'question',
      title: '退出 ZION',
      message: '确定退出 ZION？',
      buttons: ['退出', '取消'],
      defaultId: 1,
      cancelId: 1,
    };
    const r = await withWin((w) => dialog.showMessageBox(w, opts));
    if (r.response !== 0) return cmd('info', '已取消退出');
    app.quit();
    return cmd('ok', '正在退出 ZION');
  },

  // ---- 扩展命令 ----
  // goal：pi-goal 扩展运行时注册的命令，ZION 未实现扩展命令运行时 → 转交 LLM（自然语言语义）
  goal: async (args) => {
    const s = await ensureCurrentSession();
    const text = (args ?? '').trim();
    await s.prompt(text || '/goal 自主模式：启动/状态/暂停/恢复/清除/队列');
    return cmd('info', `/goal 已转交 agent 执行（扩展命令，ZION 未实现原生运行时）`);
  },

  // ---- 待实现（后续 issue）——返回占位错误，避免假执行 ----
  trust: async () => {
    if (!hasTrustRequiringProjectResources(WORKSPACE_DIR)) {
      return cmd('info', '当前项目没有需要信任的资源（项目内 .pi 条目或 .agents/skills）');
    }
    const store = new ProjectTrustStore(path.join(os.homedir(), '.pi', 'agent'));
    const cur = store.get(WORKSPACE_DIR);
    if (cur === true) return cmd('info', '当前项目已信任');
    if (cur === false) return cmd('info', '当前项目已被拒绝信任');
    /** @type {Electron.MessageBoxOptions} */
    const opts = {
      type: 'question',
      title: '信任项目',
      message: `信任项目 ${WORKSPACE_DIR}？\n信任后 pi 可访问项目内的 .pi 资源与 .agents/skills。`,
      buttons: ['信任', '拒绝', '取消'],
      defaultId: 0,
      cancelId: 2,
    };
    const r = await withWin((w) => dialog.showMessageBox(w, opts));
    if (r.response === 2) return cmd('info', '已取消信任确认');
    store.set(WORKSPACE_DIR, r.response === 0);
    return r.response === 0
      ? cmd('ok', `已信任项目 ${WORKSPACE_DIR}`)
      : cmd('info', `已拒绝信任 ${WORKSPACE_DIR}（ask 将继续忽略项目资源）`);
  },
  hotkeys: async () => cmd('ok', 'ZION 快捷键速查', { open: 'hotkeys' }),
  model: async (args) => {
    const s = await ensureCurrentSession();
    const spec = (args ?? '').trim();
    // 可见模型集合 = scoped（settings.enabledModels → resolveModelScope，内部 getAvailable 只含已认证）
    // 优先，与 pi /scoped-models 同源同数量；无配置 → 回退全量已认证（getAvailable）
    /** @type {string[]} */
    let patterns = [];
    try {
      const settings = JSON.parse(
        fs.readFileSync(path.join(os.homedir(), '.pi', 'agent', 'settings.json'), 'utf8'),
      );
      /** @type {unknown[]} */
      const em = settings.enabledModels;
      if (Array.isArray(em)) {
        patterns = em.filter((p) => typeof p === 'string');
      }
    } catch { /* 无 settings 文件 → 回退路径 */ }
    /** @type {import('@earendil-works/pi-coding-agent').ScopedModel[]} */
    let scoped = [];
    if (patterns.length > 0) {
      const r = await resolveModelScopeWithDiagnostics(patterns, s.modelRuntime);
      scoped = r.scopedModels;
    }
    // 归一化为 label + model（scoped 保序；回退按目录序）；Model.provider 即 provider id 字符串
    /** @type {Array<{ label: string, model: { provider: string, id: string } }>} */
    const visible =
      scoped.length > 0
        ? scoped.map((sm) => ({ label: `${sm.model.provider}/${sm.model.id}`, model: sm.model }))
        : (await s.modelRuntime.getAvailable()).map((/** @type {{provider: string, id: string}} */ m) => ({
            label: `${m.provider}/${m.id}`,
            model: m,
          }));
    if (!spec) {
      // 无参 → 弹模型选择器（数据驱动触发，清单随 data 附带，一次往返）
      const current = s.model;
      const list = visible.map((v) => ({
        providerId: v.model.provider,
        modelId: v.model.id,
        label: v.label,
        current: !!current && current.provider === v.model.provider && current.id === v.model.id,
      }));
      return cmd('ok', `共 ${list.length} 个可用模型（scoped ${patterns.length > 0 ? `：${patterns.length} 配置 / ${scoped.length} 已认证` : '未配置，回退已认证'}）`, {
        open: 'model-picker',
        models: list,
      });
    }
    // 带参 → 校验在可见集合内再切换（无 auth 时 setModel 抛错，错误进日志+toast）
    const target = visible.find((v) => v.label === spec);
    if (!target) {
      const avail = visible.slice(0, 6).map((v) => v.label).join(', ');
      return cmd('error', `模型 ${spec} 不在可用集合（scoped/已认证）。可选：${avail}${visible.length > 6 ? ' …' : ''}`);
    }
    try {
      await s.setModel(target.model);
      return cmd('ok', `已切换模型 → ${spec}（落盘会话与 settings，恢复时沿用）`);
    } catch (e) {
      return cmd('error', `切换模型失败：${e instanceof Error ? e.message : String(e)}`);
    }
  },
  settings: async () => {
    // 收纳式设置面板：SND/DEC 开关在 renderer 侧（localStorage），主进程附当前模型与认证 provider
    const s = await ensureCurrentSession();
    let currentModel;
    try {
      currentModel = s.model ? `${s.model.provider}/${s.model.id}` : undefined;
    } catch { /* 会话未就绪 */ }
    /** @type {string[]} */
    let providers = [];
    try {
      const authFile = path.join(os.homedir(), '.pi', 'agent', 'auth.json');
      const auth = JSON.parse(fs.readFileSync(authFile, 'utf8'));
      providers = Object.keys(auth ?? {}).filter((k) => auth[k] && typeof auth[k] === 'object' && Object.keys(auth[k]).length > 0);
    } catch { /* 无 auth 文件/损坏 → 空 */ }
    return cmd('ok', '设置面板', { open: 'settings', currentModel, providers });
  },
};

ipcMain.handle('zion:run-command', async (_e, name, args) => {
  const h = commandHandlers[/** @type {string} */ (name)];
  if (!h) return cmd('error', `未知命令 /${String(name)}`);
  try {
    return await h(typeof args === 'string' ? args : undefined);
  } catch (e) {
    console.error('[zion] run-command failed:', name, String(e));
    return cmd('error', `/${String(name)} 执行失败：${e instanceof Error ? e.message : String(e)}`);
  }
});

ipcMain.handle('agent:prompt', async (_e, text) => {
  console.log('[zion] prompt received: len=' + (text ? text.length : -1) + ' head=' + JSON.stringify(String(text)).slice(0, 80));
  const s = await ensureCurrentSession();
  await s.prompt(text);
  // prompt() 从不因模型/请求失败抛错 —— 查末条消息 stopReason
  // 注意：stopReason 只存在于 LLM 助手消息分支，其他消息类型用 in 守卫跳过
  const last = s.state.messages.at(-1);
  const stop = last && 'stopReason' in last ? last.stopReason : undefined;
  return stop ?? 'ok';
});

ipcMain.handle('agent:abort', async () => {
  if (currentSession) currentSession.abort();
  return true;
});

ipcMain.handle('agent:steer', async (_e, text) => {
  if (currentSession) currentSession.steer(text);
  return true;
});

ipcMain.handle('agent:followUp', async (_e, text) => {
  if (currentSession) currentSession.followUp(text);
  return true;
});

/** 项目选择：最近项目存储（~/.pi/agent/zion-projects.json，path + lastUsed，上限 8） */

/** @returns {import('../shared/protocol.ts').ProjectInfo[]} */
function listProjects() {
  try {
    const arr = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    if (Array.isArray(arr)) {
      return (
        arr
          .filter((p) => p && typeof p.path === 'string')
          // 清洗：丢弃控制字符路径（曾出现 \r 被解析进路径导致 mkdir ENOENT）与失效目录
          .map((p) => ({ ...p, path: p.path.replace(/[\u0000-\u001f\u007f]/g, '').trim() }))
          .filter((p) => p.path && fs.existsSync(p.path))
          .slice(0, PROJECTS_MAX)
      );
    }
  } catch { /* 无文件/损坏 → 空 */ }
  return [];
}

function saveProject(/** @type {string} */ pathUsed) {
  const list = listProjects().filter((p) => p.path !== pathUsed);
  list.unshift({ path: pathUsed, lastUsed: new Date().toISOString() });
  try {
    fs.mkdirSync(path.dirname(PROJECTS_FILE), { recursive: true });
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(list.slice(0, PROJECTS_MAX), null, 2));
  } catch (e) {
    console.warn('[zion] 保存最近项目失败:', String(e));
  }
}

/** 切换项目：更新工作目录 + 废弃旧会话实例（dispose）+ 重建当前会话；返回新会话历史
 * @param {string} dir */
async function switchProject(dir) {
  const resolved = path.resolve(dir);
  if (resolved === WORKSPACE_DIR) {
    // 同目录：仅刷新会话指针即可
    const s = await ensureCurrentSession();
    return { path: WORKSPACE_DIR, id: s.sessionManager.getSessionId(), items: historyFromSession(s) };
  }
  // 旧会话全部 dispose（wireSession 订阅随实例销毁）
  for (const s of sessions.values()) {
    try {
      s.dispose();
    } catch { /* 忽略释放异常 */ }
  }
  sessions.clear();
  currentSession = null;
  WORKSPACE_DIR = resolved;
  saveProject(resolved);
  watchWorkspaceTree();
  console.log('[zion] switch project →', resolved);
  const s = await ensureCurrentSession();
  return { path: WORKSPACE_DIR, id: s.sessionManager.getSessionId(), items: historyFromSession(s) };
}

/** 项目选择 IPC */
ipcMain.handle('zion:list-sessions', () => listSessionInfos());
ipcMain.handle('zion:get-project', () => ({ path: WORKSPACE_DIR }));
ipcMain.handle('zion:list-projects', () => listProjects());
/** 会话元信息：微簇状态条数据源（模型/上下文窗口/思考强度）；会话未就绪时字段为 null */
ipcMain.handle('zion:session-meta', async () => {
  /** @type {import('../shared/protocol.ts').SessionMeta} */
  const meta = { model: null, contextWindow: null, thinkingLevel: null };
  try {
    const s = await ensureCurrentSession();
    if (s.model) {
      meta.model = s.model.name || `${s.model.provider}/${s.model.id}`;
      meta.contextWindow = typeof s.model.contextWindow === 'number' ? s.model.contextWindow : null;
    }
    meta.thinkingLevel = s.thinkingLevel ?? null;
  } catch { /* 会话未就绪 → 全 null，渲染层显示 -- */ }
  return meta;
});
ipcMain.handle('zion:browse-project', async () => {
  /** @type {Electron.OpenDialogOptions} */
  const opts = {
    title: '选择项目工作目录',
    properties: ['openDirectory'],
  };
  const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
  if (r.canceled || r.filePaths.length === 0) return null;
  return switchProject(r.filePaths[0]);
});
ipcMain.handle('zion:switch-project', async (_e, dir) => {
  if (typeof dir !== 'string' || !dir.trim()) throw new Error('invalid project path');
  return switchProject(dir);
});

ipcMain.handle('zion:get-current', async () => {
  const s = await ensureCurrentSession();
  return { id: s.sessionManager.getSessionId(), items: historyFromSession(s) };
});

ipcMain.handle('zion:switch-session', async (_e, id) => {
  const infos = await listSessionInfos();
  const info = infos.find((i) => i.id === id);
  if (!info) throw new Error('session not found: ' + id);
  const sm = SessionManager.open(info.path, undefined, WORKSPACE_DIR);
  const s = await ensureSessionFor(sm, id);
  console.log('[zion] switched session:', id);
  return { id: sm.getSessionId(), items: historyFromSession(s) };
});

ipcMain.handle('zion:new-session', async () => {
  const sm = SessionManager.create(WORKSPACE_DIR);
  const id = sm.getSessionId();
  const s = await ensureSessionFor(sm, id);
  console.log('[zion] new session:', id);
  return { id: sm.getSessionId(), items: historyFromSession(s) };
});

// 扩展对话框应答（renderer → uiBridge → 扩展 Promise）
ipcMain.handle('zion:ui-answer', (_e, id, result) => {
  const handled = uiBridge.handleAnswer(id, result);
  if (!handled) console.warn('[zion] ui-answer 未匹配 dialog:', id);
  return { ok: handled };
});

// 会话重命名：appendSessionInfo 持久化显示名（session_info 条目，重启不丢）
ipcMain.handle('zion:rename-session', async (_e, id, name) => {
  const info = (await listSessionInfos()).find((i) => i.id === id);
  if (!info) throw new Error('session not found: ' + id);
  const sm = SessionManager.open(info.path, undefined, WORKSPACE_DIR);
  sm.appendSessionInfo(name);
  console.log('[zion] renamed session:', id, '→', name);
  return listSessionInfos();
});

// 会话删除：释放实例 + 会话文件移入 .trash/ 回收目录（可恢复，非硬删）；
// 当前会话被删时清指针，下次 ensureCurrentSession 自动落到最近会话
ipcMain.handle('zion:delete-session', async (_e, id) => {
  const info = (await listSessionInfos()).find((i) => i.id === id);
  if (!info) throw new Error('session not found: ' + id);
  if (sessions.has(id)) sessions.delete(id);
  if (currentSession && currentSession.sessionManager.getSessionId() === id) currentSession = null;
  const trashDir = path.join(path.dirname(info.path), '.trash');
  fs.mkdirSync(trashDir, { recursive: true });
  const target = path.join(trashDir, path.basename(info.path) + '.' + Date.now() + '.jsonl');
  fs.renameSync(info.path, target);
  console.log('[zion] deleted session:', id, '→', target);
  return listSessionInfos();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  unwatchWorkspaceTree();
  if (process.platform !== 'darwin') app.quit();
});
