// ZION preload —— 安全桥（contextIsolation on）
// 渲染进程只能通过 window.zion.* 与主进程交互，拿不到 Node/凭据
import { contextBridge, ipcRenderer } from 'electron';

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
