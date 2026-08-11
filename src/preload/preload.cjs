// ZION preload —— 安全桥（contextIsolation on, sandbox on）
// 注意：sandbox 下必须 CJS（.cjs）；ESM preload 需 sandbox:false，此处不取
// 渲染进程只能通过 window.zion.* 与主进程交互，拿不到 Node/凭据
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zion', {
  ping: () => ipcRenderer.invoke('zion:ping'),
  prompt: (text) => ipcRenderer.invoke('agent:prompt', text),
  abort: () => ipcRenderer.invoke('agent:abort'),
  steer: (text) => ipcRenderer.invoke('agent:steer', text),
  followUp: (text) => ipcRenderer.invoke('agent:followUp', text),
  onAgentEvent: (cb) => {
    const listener = (_e, event) => cb(event);
    ipcRenderer.on('agent:event', listener);
    return () => ipcRenderer.removeListener('agent:event', listener);
  },
});
