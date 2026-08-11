/// <reference types="vite/client" />
import type { ZionAPI } from '../../shared/protocol';

declare global {
  interface Window {
    /** preload 注入的安全桥（contextIsolation + sandbox，仅白名单 API，渲染进程无 Node） */
    zion: ZionAPI;
  }
}

export {};
