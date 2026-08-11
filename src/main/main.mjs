// ZION 主进程（骨架）
// 待 UI 框架选型（Issue #9）后，在此接入 pi SDK：
//   createAgentSession({ sessionManager, modelRuntime }) + session.subscribe(事件流) → IPC → renderer
// 参考实现：https://github.com/tbrandenburg/pi-desktop （Electron 43 + pi-coding-agent ^0.83）
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true, // 安全基线：渲染进程不碰 Node
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('zion:ping', () => ({ ok: true, pid: process.pid }));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
