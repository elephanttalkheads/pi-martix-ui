// 扩展 UI 桥核心（纯 Node，无 electron 依赖，可 node:test）
// 职责：dialog 请求（select/confirm/input）挂 Promise 表 → 派发外部（main.mjs 注入 dispatch 发 renderer）；
// renderer 应答 handleAnswer 回传；timeout/signal 兜底 resolve undefined；notify 单向派发。
// 其余 ExtensionUIContext 方法（setStatus/setWidget/onTerminalInput 等）为 TUI 专属，提供 no-op 桩。

/**
 * @typedef {import('../shared/protocol.ts').UiAsk} UiAsk
 * @typedef {import('../shared/protocol.ts').UiNotify} UiNotify
 * @typedef {{ id: string, result: string | boolean | undefined }} UiAnswer
 */

/**
 * 创建 UI 桥
 * @param {object} [opts]
 * @param {(ask: UiAsk) => void} [opts.onAsk] 外部派发钩子（main.mjs 注入 webContents.send）
 * @param {(n: UiNotify) => void} [opts.onNotify] notify 派发钩子
 */
export function createUiBridge(opts = {}) {
  /** @type {Map<string, { resolve: (v: string | boolean | undefined) => void, cleanup: () => void }>} */
  const pending = new Map();
  let seq = 0;
  const nextId = () => `ui${++seq}`;
  /** 动态派发器（main.mjs 在窗口就绪后注入） */
  /** @type {{ ask: (a: import('../shared/protocol.ts').UiAsk) => void, notify: (n: import('../shared/protocol.ts').UiNotify) => void }} */
  let dispatch = {
    ask: opts.onAsk ?? (() => {}),
    notify: opts.onNotify ?? (() => {}),
  };

  /**
   * 通用 ask：挂 Promise → 派发；timeout/signal 自动 resolve undefined
   * @param {UiAsk['kind']} kind
   * @param {string} title
   * @param {string | undefined} message
   * @param {string[] | undefined} options
   * @param {{ timeout?: number, signal?: AbortSignal }} [dlg]
   * @returns {Promise<string | boolean | undefined>}
   */
  const ask = (kind, title, message, options, dlg) =>
    new Promise((resolve) => {
      const id = nextId();
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        pending.delete(id);
      };
      /** @type {ReturnType<typeof setTimeout> | null} */
      let timer = null;
      if (dlg?.timeout && dlg.timeout > 0) {
        timer = setTimeout(() => {
          pending.delete(id);
          resolve(undefined);
        }, dlg.timeout);
      }
      if (dlg?.signal) {
        if (dlg.signal.aborted) {
          cleanup();
          resolve(undefined);
          return;
        }
        dlg.signal.addEventListener(
          'abort',
          () => {
            cleanup();
            resolve(undefined);
          },
          { once: true },
        );
      }
      pending.set(id, { resolve, cleanup });
      /** @type {UiAsk} */
      const askMsg = { id, kind, title, message, options, timeoutMs: dlg?.timeout };
      dispatch.ask(askMsg);
    });

  /** @type {import('@earendil-works/pi-coding-agent').ExtensionUIContext} */
  const bridge = {
    select(title, options, dlg) {
      return /** @type {Promise<string | undefined>} */ (ask('select', title, undefined, options ?? [], dlg));
    },
    confirm(title, message, dlg) {
      return /** @type {Promise<boolean>} */ (ask('confirm', title, message, undefined, dlg));
    },
    input(title, placeholder, dlg) {
      return /** @type {Promise<string | undefined>} */ (ask('input', title, placeholder, undefined, dlg));
    },
    notify(message, type) {
      dispatch.notify({ message, type });
    },
    // ---- TUI 专属：no-op 桩（ZION 无终端 UI） ----
    onTerminalInput() {
      return () => {};
    },
    setStatus() {},
    setWorkingMessage() {},
    setWorkingVisible() {},
    setWorkingIndicator() {},
    setHiddenThinkingLabel() {},
    setWidget() {},
    setFooter() {},
    setHeader() {},
    setTitle() {},
    pasteToEditor() {},
    setEditorText() {},
    getEditorText() {
      return '';
    },
    editor() {
      return Promise.resolve(undefined);
    },
    addAutocompleteProvider() {},
    setEditorComponent() {},
    getEditorComponent() {
      return undefined;
    },
    theme: /** @type {any} */ ({}),
    getAllThemes() {
      return [];
    },
    getTheme() {
      return undefined;
    },
    setTheme() {
      return { success: false, error: 'ZION 无 TUI 主题系统' };
    },
    getToolsExpanded() {
      return false;
    },
    setToolsExpanded() {},
    custom() {
      throw new Error('ui.custom 未实现（ZION 无 TUI）');
    },
  };

  return {
    ...bridge,
    /** 窗口就绪后注入真实派发（创建期可先空跑，ask 挂 Promise 由 timeout 兜底）
     * @param {{ ask: (a: import('../shared/protocol.ts').UiAsk) => void, notify: (n: import('../shared/protocol.ts').UiNotify) => void }} d */
    setDispatch(d) {
      dispatch = d;
    },
    /** renderer 应答入口（main.mjs ipcMain.handle('zion:ui-answer')） */
    handleAnswer(/** @type {string} */ id, /** @type {string | boolean | undefined} */ result) {
      const entry = pending.get(id);
      if (!entry) return false;
      entry.cleanup();
      entry.resolve(result);
      return true;
    },
    /** 未应答 dialog 数（测试/诊断用） */
    pendingCount() {
      return pending.size;
    },
  };
}
