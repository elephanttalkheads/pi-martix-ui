// ZION 主进程 —— pi SDK 进程内接入
// 模式：createAgentSession（复用 ~/.pi/agent 配置）→ session.subscribe(事件流) → IPC → renderer
// 参考：tbrandenburg/pi-desktop；docs/sdk.md
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');
const RENDERER_DEV_URL = 'http://localhost:5173';

// 初始会话工作目录（项目选择 UI 落地前先用独立工作区，避免 agent 直接操作主目录）
const WORKSPACE_DIR = path.join('D:', 'zion-workspace');

let win = null;
let session = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true, // 安全基线：渲染进程不碰 Node/凭据
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (isDev) win.loadURL(RENDERER_DEV_URL);
  else win.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
}

// 惰性初始化 agent 会话：首次 prompt 时建，带超时保护（ModelRuntime 目录刷新可能慢）
async function ensureSession() {
  if (session) return session;
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('agent init timeout')), 45000));
  const init = (async () => {
    const { session: s } = await createAgentSession({
      cwd: WORKSPACE_DIR,
      sessionManager: SessionManager.create(WORKSPACE_DIR),
    });
    session = s;
    // 事件流推给渲染进程
    s.subscribe((event) => {
      if (win && !win.isDestroyed()) win.webContents.send('agent:event', event);
    });
    return s;
  })();
  return Promise.race([init, timeout]);
}

function sendEvent(event) {
  if (win && !win.isDestroyed()) win.webContents.send('agent:event', event);
}

// ---- IPC ----
ipcMain.handle('zion:ping', () => ({ ok: true, pid: process.pid }));

ipcMain.handle('agent:prompt', async (_e, text) => {
  const s = await ensureSession();
  await s.prompt(text);
  // prompt() 从不因模型/请求失败抛错 —— 查末条消息 stopReason
  const last = s.state.messages.at(-1);
  return last?.stopReason ?? 'ok';
});

ipcMain.handle('agent:abort', async () => {
  if (session) session.abort();
  return true;
});

ipcMain.handle('agent:steer', async (_e, text) => {
  if (session) session.steer(text);
  return true;
});

ipcMain.handle('agent:followUp', async (_e, text) => {
  if (session) session.followUp(text);
  return true;
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
