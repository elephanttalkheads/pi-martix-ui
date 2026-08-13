// ZION 主进程 —— pi SDK 进程内接入
// 模式：多会话并存（Map<sessionId, AgentSession>，懒创建）+ 当前指针切换
// 事件转发只发当前会话；createAgentSession（复用 ~/.pi/agent 配置）→ session.subscribe → IPC → renderer
// 参考：tbrandenburg/pi-desktop；docs/sdk.md
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';
import { collectCommands } from './skillscan.mjs';
import { createUiBridge } from './uibridge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');
const RENDERER_DEV_URL = 'http://127.0.0.1:5173';

// 当前工作目录（项目选择 UI 落地后可变：切换项目 = 更新此值 + 重建会话上下文）
let WORKSPACE_DIR = path.join('D:', 'zion-workspace');

// 扩展 UI 桥：dialog 请求 → renderer 弹层（AskDialog）；uiContext + projectTrustContextFactory 双注入
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
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('agent init timeout')), 45000));
  const init = (async () => {
    const { session } = await createAgentSession({
      cwd: WORKSPACE_DIR,
      sessionManager,
    });
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
  return infos
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
const PROJECTS_FILE = path.join(os.homedir(), '.pi', 'agent', 'zion-projects.json');
const PROJECTS_MAX = 8;

/** @returns {import('../shared/protocol.ts').ProjectInfo[]} */
function listProjects() {
  try {
    const arr = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    if (Array.isArray(arr)) return arr.filter((p) => p && typeof p.path === 'string').slice(0, PROJECTS_MAX);
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
  console.log('[zion] switch project →', resolved);
  const s = await ensureCurrentSession();
  return { path: WORKSPACE_DIR, id: s.sessionManager.getSessionId(), items: historyFromSession(s) };
}

/** 项目选择 IPC */
ipcMain.handle('zion:list-sessions', () => listSessionInfos());
ipcMain.handle('zion:list-projects', () => listProjects());
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
  if (process.platform !== 'darwin') app.quit();
});
