// ZION preload（骨架）
// 后续在此暴露：agent 事件流订阅、会话控制（prompt/abort/steer）、扩展 UI 桥（ExtensionUIContext）
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zion', {
  ping: () => ipcRenderer.invoke('zion:ping'),
  // TODO(#9/#10): agentSubscribe / sessionPrompt / sessionAbort / extensionUI...
});
