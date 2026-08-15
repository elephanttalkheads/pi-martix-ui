// ZION preload —— 安全桥（contextIsolation on, sandbox on）
// 注意：sandbox 下必须 CJS（.cjs）；ESM preload 需 sandbox:false，此处不取
// 渲染进程只能通过 window.zion.* 与主进程交互，拿不到 Node/凭据
// 桥面契约：src/shared/protocol.ts（ZionAPI），类型检查见 tsconfig.node.json
// 注：CJS 的 require() 返回 any，需用 typeof import() 显式取 electron 模块类型
/** @type {typeof import('electron')} */
const { contextBridge, ipcRenderer } = require('electron');

/** @typedef {import('../shared/protocol.ts').ZionAPI} ZionAPI */

/** @type {ZionAPI} */
const api = {
  ping: () => ipcRenderer.invoke('zion:ping'),
  prompt: (text) => ipcRenderer.invoke('agent:prompt', text),
  abort: () => ipcRenderer.invoke('agent:abort'),
  steer: (text) => ipcRenderer.invoke('agent:steer', text),
  followUp: (text) => ipcRenderer.invoke('agent:followUp', text),
  scanTree: () => ipcRenderer.invoke('zion:scan-tree'),
  listCommands: () => ipcRenderer.invoke('zion:list-commands'),
  runCommand: (name, args) => ipcRenderer.invoke('zion:run-command', name, args),
  listSessions: () => ipcRenderer.invoke('zion:list-sessions'),
  listProjects: () => ipcRenderer.invoke('zion:list-projects'),
  getSessionMeta: () => ipcRenderer.invoke('zion:session-meta'),
  getProject: () => ipcRenderer.invoke('zion:get-project'),
  browseProject: () => ipcRenderer.invoke('zion:browse-project'),
  switchProject: (dir) => ipcRenderer.invoke('zion:switch-project', dir),
  getCurrentSession: () => ipcRenderer.invoke('zion:get-current'),
  switchSession: (id) => ipcRenderer.invoke('zion:switch-session', id),
  newSession: () => ipcRenderer.invoke('zion:new-session'),
  renameSession: (id, name) => ipcRenderer.invoke('zion:rename-session', id, name),
  deleteSession: (id) => ipcRenderer.invoke('zion:delete-session', id),
  onAgentEvent: (cb) => subscribe('agent:event', cb),
  onTreeChanged: (cb) => subscribe('zion:tree-changed', cb),
  uiAnswer: (id, result) => ipcRenderer.invoke('zion:ui-answer', id, result),
  onUiAsk: (cb) => subscribe('zion:ui-ask', cb),
  onUiNotify: (cb) => subscribe('zion:ui-notify', cb),
};

/** 订阅样板：注册 ipcRenderer.on + 返回退订（通道名与回调载荷类型在调用点注入）
 * @template T
 * @param {string} channel
 * @param {(payload: T) => void} cb
 * @returns {() => void}
 */
function subscribe(channel, cb) {
  const listener = (
    /** @type {import('electron').IpcRendererEvent} */ _e,
    /** @type {T} */ payload,
  ) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('zion', api);
