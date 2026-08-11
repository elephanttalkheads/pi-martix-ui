import { create } from 'zustand';
import type { ToolExecutionStartEvent } from '@earendil-works/pi-coding-agent';

export type ToolStatus = 'run' | 'ok' | 'err';

/** feed 消息项 —— 渲染层数据模型（与 SDK 事件解耦，只保留 UI 所需字段） */
export type FeedItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'system'; text: string }
  | { id: string; kind: 'tool'; toolName: string; args?: unknown; status: ToolStatus };

interface FeedState {
  items: FeedItem[];
  busy: boolean;
  error: string | null;

  pushUser(text: string): void;
  pushSystem(text: string): void;
  /** 流式增量追加到末条 assistant 消息（无则新建） */
  appendDelta(delta: string): void;
  toolStart(ev: Pick<ToolExecutionStartEvent, 'toolName' | 'args'>): void;
  toolEnd(toolName: string, isError: boolean): void;
  setBusy(busy: boolean): void;
  setError(error: string | null): void;
  reset(): void;
}

let id = 0;
const nid = () => `i${++id}`;

export const useFeed = create<FeedState>()((set) => ({
  items: [],
  busy: false,
  error: null,

  pushUser(text) {
    set((s) => ({ items: [...s.items, { id: nid(), kind: 'user', text }] }));
  },
  pushSystem(text) {
    set((s) => ({ items: [...s.items, { id: nid(), kind: 'system', text }] }));
  },
  appendDelta(delta) {
    set((s) => {
      const items = [...s.items];
      const last = items[items.length - 1];
      if (last && last.kind === 'assistant') {
        items[items.length - 1] = { ...last, text: last.text + delta };
        return { items };
      }
      items.push({ id: nid(), kind: 'assistant', text: delta });
      return { items };
    });
  },
  toolStart(ev) {
    set((s) => ({
      items: [...s.items, { id: nid(), kind: 'tool', toolName: ev.toolName, args: ev.args, status: 'run' }],
    }));
  },
  toolEnd(toolName, isError) {
    set((s) => {
      const items = [...s.items];
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.kind === 'tool' && it.toolName === toolName && it.status === 'run') {
          items[i] = { ...it, status: isError ? 'err' : 'ok' };
          break;
        }
      }
      return { items };
    });
  },
  setBusy(busy) { set({ busy }); },
  setError(error) { set({ error }); },
  reset() { set({ items: [], busy: false, error: null }); },
}));
