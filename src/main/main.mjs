// ZION 主进程 —— pi SDK 进程内接入
// 模式：多会话并存（Map<sessionId, AgentSession>，懒创建）+ 当前指针切换
// 事件转发只发当前会话；createAgentSession（复用 ~/.pi/agent 配置）→ session.subscribe → IPC → renderer
// 参考：tbrandenburg/pi-desktop；docs/sdk.md
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');
const RENDERER_DEV_URL = 'http://127.0.0.1:5173';

// 初始会话工作目录（项目选择 UI 落地前先用独立工作区，避免 agent 直接操作主目录）
const WORKSPACE_DIR = path.join('D:', 'zion-workspace');

/** @type {import('electron').BrowserWindow | null} */
let win = null;
/** @type {Map<string, import('@earendil-works/pi-coding-agent').AgentSession>} */
const sessions = new Map();
/** @type {import('@earendil-works/pi-coding-agent').AgentSession | null} */
let currentSession = null;

function createWindow() {
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

ipcMain.handle('zion:list-sessions', () => listSessionInfos());

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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
