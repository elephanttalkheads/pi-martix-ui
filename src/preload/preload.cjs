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
  onAgentEvent: (cb) => {
    const listener = (
      /** @type {import('electron').IpcRendererEvent} */ _e,
      /** @type {import('../shared/protocol.ts').AgentSessionEvent} */ event,
    ) => cb(event);
    ipcRenderer.on('agent:event', listener);
    return () => ipcRenderer.removeListener('agent:event', listener);
  },
};

contextBridge.exposeInMainWorld('zion', api);
