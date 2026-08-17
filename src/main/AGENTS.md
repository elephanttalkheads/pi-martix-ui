# src/main（Electron 主进程 + preload 安全桥）

本模块是 ZION 的进程边界：主进程进程内接入 pi SDK（`createAgentSession`，复用 `~/.pi/agent` 配置），经 IPC 把 agent 会话管理、事件流、扩展 UI 请求（dialog/notify）与命令执行（run-command dispatch）暴露给渲染层；preload 在 sandbox 下实现渲染进程唯一入口 `window.zion`。不含 UI 逻辑，不管理模型/凭据配置。IPC 契约（通道清单、类型形状、stopReason 语义）由 `src/shared` 模块拥有，本模块是契约的实现方。

> 任务涉及本模块架构（会话模型、项目切换、事件转发、文件树监听、扫描与命令聚合/执行 dispatch）、接口实现或设计决策时，先读 [DESIGN.md](DESIGN.md)；
> 涉及 IPC 契约本身（通道名、`ZionAPI`、类型形状）时读 `src/shared/AGENTS.md` / `src/shared/DESIGN.md`；
> 仅改本模块实现细节（不动会话模型、不加通道、不改契约）时可跳过两者。

## 关键入口

- `src/main/main.mjs` —— 主进程全部逻辑：`sessions` Map + `currentSession` 指针、`ensureCurrentSession`/`ensureSessionFor`（会话创建后 `bindExtensions({ uiContext })` 注入 UI 桥；init 45s 超时，败北后迟到的初始化 `dispose()` 丢弃、不 set 不接管）、`listSessionInfos`（磁盘列表 + 内存未落盘会话合并，见 [DESIGN.md](DESIGN.md) 接口节）、20 组 `ipcMain.handle`（含 `zion:session-meta` 会话元信息，渲染层微簇状态条数据源）+ 4 条 send 转发（`wireSession` / `dispatchUi` / `onTreeChange`；通道全集见 [DESIGN.md](DESIGN.md)「接口与依赖」节）、`commandHandlers` 命令 dispatch 注册表（`zion:run-command` 路由；`cmd()` 结果工厂 + `withWin()` 对话框辅助，机制见 [DESIGN.md](DESIGN.md) 架构节）、`listProjects`/`saveProject`/`switchProject`（项目切换：dispose 旧会话 + 重建）、启动恢复（模块加载期读 `zion-projects.json` 首位重置 `WORKSPACE_DIR`）、`historyFromSession`、`scanDir`、`watchWorkspaceTree`/`unwatchWorkspaceTree`/`onTreeChange`（文件树实时监听：fs.watch + 防抖重扫 + 变化推送，机制见 [DESIGN.md](DESIGN.md) 架构节）
- `src/main/uibridge.mjs` —— 扩展 UI 桥（纯 Node、无 electron 依赖）：`createUiBridge` 把 `select`/`confirm`/`input` 挂 Promise 表 → 经注入的 `dispatch` 派发 renderer；timeout/AbortSignal 兜底 resolve `undefined`；`notify` 单向派发；`handleAnswer` 回传应答；其余 `ExtensionUIContext` 方法为 TUI no-op 桩
- `src/main/skillscan.mjs` —— 命令面板数据源（纯 Node、无 electron 依赖）：`parseSkillFrontmatter`/`scanSkillsDir`/`collectCommands` + `BUILTIN_COMMANDS`/`EXTENSION_COMMANDS`（命令清单维护规则见「本模块硬约束」）
- `scripts/build-main.mjs` —— main/preload 产物构建脚本（构建管线/产物布局见 [DESIGN.md](DESIGN.md) 启动节）
- `src/preload/preload.cjs` —— 安全桥实现：`contextBridge.exposeInMainWorld('zion', api)`；方法集合必须与 `ZionAPI`（`src/shared/protocol.ts`）一一对应；四个订阅方法（`onAgentEvent`/`onTreeChanged`/`onUiAsk`/`onUiNotify`）统一经 `subscribe(channel, cb)` 样板（注册 `ipcRenderer.on` → 剥 `IpcRendererEvent` → 返回退订函数）
- `src/shared/protocol.ts` —— 契约单一事实源（属 `src/shared` 模块，本模块只做 JSDoc 类型引用；`CommandItem` 形状归它）
- `tsconfig.node.json` —— main/preload 的 checkJs 配置（include `src/main` + `src/preload` + `src/shared`）

## 命令

改动本模块后必须跑 `npm run typecheck`（双配置 `tsc --noEmit`；main/preload 的 JSDoc 类型错误由 tsconfig.node.json 暴露）。

- `npm run build:main` —— 构建 main/preload 产物（dev/smoke/e2e 会自动先跑，`npm start` 不会；管线见 [DESIGN.md](DESIGN.md) 启动节）
- `npm run smoke` —— 构建 renderer + main 产物 + CDP 冒烟：验证 `window.zion` 注入、`zion:ping`、渲染基线、run-command 契约（未知命令错误路径 + settings/model 弹层 `data.open` 契约 + 模型清单与 settings.enabledModels 数量对照 + 真实输入路径弹层 DOM，`scripts/smoke-cdp.mjs`）
- `npm run e2e` —— 构建 + 真实 prompt 回归：`window.zion.prompt(...)` → 当前模型 → 事件流 → feed（`scripts/e2e-prompt.mjs`）
- `node --test scripts/skillscan.test.mjs` —— skillscan 单测（frontmatter 解析/目录扫描/聚合去重/内置清单完整性，6 用例；不依赖 Electron，改 skillscan.mjs 后跑）
- `node --test scripts/uibridge.test.mjs` —— uiBridge 单测（Promise 回传/超时/signal/notify/重复应答，7 用例；不依赖 Electron，改 uibridge.mjs 后跑）
- `npm run dev` —— build:main + vite + electron；main 以 `--dev` 参数加载 `http://127.0.0.1:5173`
- `npm start` —— `electron .` 直跑产物（经 `dist-main/main/main.mjs` 加载 `dist-renderer/index.html`；需先 `npm run build:main` + `npm run build:renderer`）

## 本模块硬约束

- **preload 必须 CJS（`.cjs`）**：`sandbox: true` 下 ESM preload 不注入，`window.zion` 变 undefined（root AGENTS.md 已知坑 3）
- **CJS `require('electron')` 返回 any**：解构前必须 `/** @type {typeof import('electron')} */` 注解（见 preload.cjs 顶部；坑 6）
- **JSDoc 类型引用固定写法**：`import('../shared/protocol.ts')`（带 `.ts` 后缀，依赖 tsconfig.node.json 的 `allowImportingTsExtensions`）；不要在 `.mjs`/`.cjs` 里 require 该 TS 文件（规则详见 `src/shared/AGENTS.md` 硬约束；坑 5、8）
- **IPC 通道名字符串散落两处字面量**（main.mjs 的 `handle`/`send` 与 preload.cjs 的 `invoke`/`on`，JS 无法共享运行时常量）：新增/改名通道必须两处同步，且同步更新 `ZionAPI`（契约归 `src/shared`；通道全集见 [DESIGN.md](DESIGN.md)「接口与依赖」节）
- **扩展对话框形态三处同步**：`uibridge.mjs` 的 `ask()` kind、`src/shared/protocol.ts` 的 `UiAsk.kind`、`AskDialog.tsx` 渲染分支（confirm/input/select）必须一致；新增形态三处同改（形状契约归 `src/shared`）
- **命令清单与执行器两处同步**：面板数据源（`skillscan.mjs` 的 `BUILTIN_COMMANDS` 14 个 + `EXTENSION_COMMANDS` /goal）与执行器（`main.mjs` 的 `commandHandlers`）的命令名必须一一对应——清单只管展示、dispatch 才执行；新增/改名命令两处同改（运行时注册的命令无法静态枚举，漏加则面板不显示或执行报「未知命令」）。带参数命令在清单补 `argumentHint`（内置 14 命令已全部实现，不再有占位；扩展命令仅 goal 有 handler，其余 → 「未知命令」）。升级 pi SDK 后核对 `BUILTIN_COMMANDS` 是否漂移（裁剪清单见 DESIGN.md 命令聚合节）
- **`WORKSPACE_DIR` 可变，项目相关逻辑必须读当前值**（默认 `D:\zion-test`、两处赋值点、跨目录切换重建与同目录快速路径见 [DESIGN.md](DESIGN.md) 不变量节）：不要在模块加载期缓存它的快照（启动恢复会改写），否则 scan-tree / 文件树监听 / list-commands（项目级 skills）/ 会话归属指向错误目录
- **`window.zion` 之外的渲染层通道不可新增**：渲染进程只能经该白名单触达主进程（`contextIsolation`/`sandbox` 等安全配置事实见 `src/shared/DESIGN.md` 安全边界，改动 `webPreferences` 前先读）
- **改 `src/main` / `src/preload` 后必须 `npm run build:main` 再验证**：运行时加载的是 `dist-main/` 产物（dev/smoke/e2e 自动先构建；`npm start` 不会，直接跑旧产物）

## 人工补充
