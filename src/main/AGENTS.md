# src/main（Electron 主进程 + preload 安全桥）

本模块是 ZION 的进程边界：主进程进程内接入 pi SDK（`createAgentSession`，复用 `~/.pi/agent` 配置），经 IPC 把 agent 会话管理与事件流暴露给渲染层；preload 在 sandbox 下实现渲染进程唯一入口 `window.zion`。不含 UI 逻辑，不管理模型/凭据配置。IPC 契约（通道清单、类型形状、stopReason 语义）由 `src/shared` 模块拥有，本模块是契约的实现方。

> 任务涉及本模块架构（会话模型、事件转发、扫描）、接口实现或设计决策时，先读 [DESIGN.md](DESIGN.md)；
> 涉及 IPC 契约本身（通道名、`ZionAPI`、类型形状）时读 `src/shared/AGENTS.md` / `src/shared/DESIGN.md`；
> 仅改本模块实现细节（不动会话模型、不加通道、不改契约）时可跳过两者。

## 关键入口

- `src/main/main.mjs` —— 主进程全部逻辑：`sessions` Map + `currentSession` 指针、`ensureCurrentSession`/`ensureSessionFor`、10 组 `ipcMain.handle` + `agent:event` 转发（`wireSession`）、`historyFromSession`、`scanDir`
- `src/preload/preload.cjs` —— 安全桥实现：`contextBridge.exposeInMainWorld('zion', api)`；方法集合必须与 `ZionAPI`（`src/shared/protocol.ts`）一一对应
- `src/shared/protocol.ts` —— 契约单一事实源（属 `src/shared` 模块，本模块只做 JSDoc 类型引用）
- `tsconfig.node.json` —— main/preload 的 checkJs 配置（include `src/main` + `src/preload` + `src/shared`）

## 命令

改动本模块后必须跑 `npm run typecheck`（双配置 `tsc --noEmit`；main/preload 的 JSDoc 类型错误由 tsconfig.node.json 暴露）。

- `npm run smoke` —— 构建 renderer + CDP 冒烟：验证 `window.zion` 注入、`zion:ping`、渲染基线（`scripts/smoke-cdp.mjs`）
- `npm run e2e` —— 构建 + 真实 prompt 回归：`window.zion.prompt(...)` → deepseek → 事件流 → feed（`scripts/e2e-prompt.mjs`，约 12s）
- `npm run dev` —— vite + electron；main 以 `--dev` 参数加载 `http://127.0.0.1:5173`
- `npm start` —— `electron .` 直跑（加载 `dist-renderer/index.html`，需先 `npm run build:renderer`）

## 本模块硬约束

- **preload 必须 CJS（`.cjs`）**：`sandbox: true` 下 ESM preload 不注入，`window.zion` 变 undefined（root AGENTS.md 已知坑 3）
- **CJS `require('electron')` 返回 any**：解构前必须 `/** @type {typeof import('electron')} */` 注解（见 preload.cjs 顶部；坑 6）
- **JSDoc 类型引用固定写法**：`import('../shared/protocol.ts')`（带 `.ts` 后缀，依赖 tsconfig.node.json 的 `allowImportingTsExtensions`）；不要在 `.mjs`/`.cjs` 里 require 该 TS 文件（规则详见 `src/shared/AGENTS.md` 硬约束；坑 5、8）
- **IPC 通道名字符串散落两处字面量**（main.mjs 的 `handle`/`send` 与 preload.cjs 的 `invoke`/`on`，JS 无法共享运行时常量）：新增/改名通道必须两处同步，且同步更新 `ZionAPI`（契约归 `src/shared`，完整清单见其 DESIGN.md）
- **会话工作目录固定 `D:\zion-workspace`**（main.mjs `WORKSPACE_DIR`，项目选择 UI 落地前的独立工作区，避免 agent 直接操作主目录）：改动会影响会话存储位置与 agent 实际操作目录
- **`window.zion` 之外的渲染层通道不可新增**：渲染进程只能经该白名单触达主进程（`contextIsolation`/`sandbox` 等安全配置事实见 `src/shared/DESIGN.md` 安全边界，改动 `webPreferences` 前先读）

## 人工补充
