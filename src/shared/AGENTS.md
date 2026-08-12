# src/shared —— IPC 类型契约（单一事实源）

本模块只承载渲染进程 ↔ 主进程 IPC 的 TypeScript 类型契约（`ZionAPI` 桥面、`AgentSessionEvent` 事件、`FileNode`/`SessionInfoLike`/`SessionHistoryItem`/`UiAsk`/`UiNotify` 数据形状），运行时零产物：所有消费方只做类型引用。

> 任务涉及本模块的接口契约、类型流向、通道名或失败语义时，先读 [DESIGN.md](DESIGN.md)；
> 仅新增/调整某个数据类型的字段（不改桥面契约、不跨模块）时可跳过。

## 关键入口

- `src/shared/protocol.ts` —— 本模块唯一文件，全部契约
- 消费方（仅类型引用，不产生运行时依赖）：
  - `src/renderer/src/env.d.ts` —— `import type { ZionAPI }` 声明 `window.zion`
  - `src/renderer/src/store.ts`、`src/renderer/src/App.tsx`、`src/renderer/src/components/Sidebar.tsx`、`src/renderer/src/components/InputBar.tsx` —— `import type` 引用业务类型（InputBar 是命令面板，消费 `CommandItem`；store 消费 `UiAsk`/`UiNotify`，驱动 AskDialog/toast）
  - `src/main/main.mjs`、`src/main/skillscan.mjs`、`src/main/uibridge.mjs`、`src/preload/preload.cjs` —— JSDoc `@typedef {import('../shared/protocol.ts').X}` 引用（skillscan 消费 `CommandItem`；uibridge 消费 `UiAsk`/`UiNotify`）

## 命令

- `npm run typecheck` —— 双配置 `tsc --noEmit`：`tsconfig.json`（renderer + shared）+ `tsconfig.node.json`（main/preload/shared，checkJs）。**改本模块后必跑**，两侧类型引用（type-only import 与 JSDoc import）同时校验
- `npm run smoke` —— 构建 renderer + CDP 冒烟，端到端验证桥面注入：`!!window.zion` 与 `window.zion.ping()`（见 `scripts/smoke-cdp.mjs`）
- `node --test scripts/uibridge.test.mjs` —— uiBridge 核心单测（confirm/input/select 回传、timeout/signal → undefined、notify、重复应答安全）；改 `UiAsk`/`UiNotify` 契约时跑

## 本模块硬约束

- **只写类型**：本文件只允许 `export type` / `export interface` / `import type`。任何运行时导出都会被 vite/esbuild 整体擦除（main/preload 是 JS，无法 import 本 TS 文件），等于无效代码
- **renderer 引用**：必须 `import type { ... } from '../../shared/protocol'`（**不带 `.ts` 后缀**）；`tsconfig.json` 开了 `verbatimModuleSyntax`，漏写 `type` 报 TS1484
- **main/preload 引用**：JSDoc 写 `import('../shared/protocol.ts')`（**带 `.ts` 后缀**），依赖 `tsconfig.node.json` 的 `allowImportingTsExtensions: true`；不要在 `.mjs` / `.cjs` 里 require/import 本文件（`uibridge.mjs` 同）
- **通道名字符串**：改动时必须同步 `src/main/main.mjs` 与 `src/preload/preload.cjs` 两处字面量（完整清单见 [DESIGN.md](DESIGN.md) 接口节）
- **对话框应答契约**：`UiAsk.kind` 三形态与「取消/超时/signal → `undefined`」语义必须在 renderer `AskDialog.tsx` 与 `uibridge.mjs` 两侧保持一致（不能改成一侧抛错或返回哨兵值；语义细节见 [DESIGN.md](DESIGN.md) 失败模式节）
- **不定义 Electron 专属类型**（`IpcMainInvokeEvent` 等）：契约保持与 SDK 类型解耦；`AgentSessionEvent` 一律直接 re-export SDK 类型，不本地重定义

## 人工补充
