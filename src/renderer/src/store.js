import { create } from 'zustand';

let id = 0;
const nid = () => `i${++id}`;

export const useFeed = create((set, get) => ({
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
        last.text = (last.text || '') + delta;
        return { items };
      }
      items.push({ id: nid(), kind: 'assistant', text: delta });
      return { items };
    });
  },
  toolStart({ toolName, args }) {
    set((s) => ({
      items: [...s.items, { id: nid(), kind: 'tool', toolName, args, status: 'run' }],
    }));
  },
  toolEnd(toolName, isError) {
    set((s) => {
      const items = [...s.items];
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].kind === 'tool' && items[i].toolName === toolName && items[i].status === 'run') {
          items[i].status = isError ? 'err' : 'ok';
          break;
        }
      }
      return { items };
    });
  },
  setBusy(b) { set({ busy: b }); },
  setError(e) { set({ error: e }); },
  reset() { set({ items: [], busy: false, error: null }); },
}));
