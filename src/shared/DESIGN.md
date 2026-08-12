# src/shared 设计 —— IPC 类型契约

## 目标与非目标

**目标**：为 ZION 渲染层 ↔ 主进程的全部 IPC 通信提供单一的类型事实来源，使桥面（`window.zion`）、事件流与数据结构在三个进程角色（renderer / preload / main）之间保持一致，并纳入 `tsc` 静态校验。

**非目标**：
- 不提供任何运行时代码、常量或 IPC 实现（实现分别在 `src/main/main.mjs`、`src/main/uibridge.mjs` 与 `src/preload/preload.cjs`）
- 不实现扩展 UI 桥本身（Promise 表 `uibridge.mjs`、弹层 `AskDialog.tsx`、toast `ToastHost`）：本契约只定义其 IPC 类型（`UiAsk`/`UiNotify`）与桥面方法（`uiAnswer`/`onUiAsk`/`onUiNotify`）
- 不提供通道名的运行时共享来源：通道名只能是 `main.mjs` / `preload.cjs` 两侧字面量（理由见「设计决策与权衡」）
- 不本地重定义 SDK 类型：`AgentSessionEvent` 直接 re-export（理由见「设计决策与权衡」）

## 架构与主要流程

类型流向（全部编译期，运行时零依赖）：

```
renderer（import type，vite/esbuild 擦除）  ──┐
                                               ├──►  src/shared/protocol.ts  ◄──  main.mjs / preload.cjs / skillscan.mjs
env.d.ts 声明 Window.zion: ZionAPI  ◄─────────┘                                （JSDoc @typedef/@type import）
```

桥注入链（运行时，本契约约束的对象）：`preload.cjs` 构造符合 `ZionAPI` 的对象 → `contextBridge.exposeInMainWorld('zion', api)` → renderer 经 `window.zion.*` 调用。

指令数据流：renderer `window.zion.prompt(text)` → `ipcRenderer.invoke('agent:prompt')` → main `ipcMain.handle` → pi SDK `session.prompt()` → `session.subscribe` 事件 → `win.webContents.send('agent:event')` → preload `ipcRenderer.on('agent:event')` 剥掉 `IpcRendererEvent` 后回调 → renderer `onAgentEvent(cb)`。仅当前会话的事件被转发（见「失败模式」）。

命令面板数据流：renderer 的 InputBar 挂载时预取 `window.zion.listCommands()` → `ipcRenderer.invoke('zion:list-commands')` → main `collectCommands()`（`src/main/skillscan.mjs` 聚合，已按 kind:name 去重）→ `CommandItem[]`。

扩展 UI 桥数据流（dialog 双向 + notify 单向）：

```
扩展 ctx.ui.confirm/select/input → uibridge.mjs（Promise 表，id = ui<N>）→ setDispatch 注入的派发器
  → webContents.send('zion:ui-ask') → preload onUiAsk → store.uiAsk → AskDialog 弹层
  → window.zion.uiAnswer(id, result) → ipcMain 'zion:ui-answer' → handleAnswer → resolve 扩展 Promise
取消（Esc/遮罩/取消按钮）、timeout、AbortSignal 一律 resolve undefined；
notify 单向：uibridge.notify → send('zion:ui-notify') → preload onUiNotify → store.toasts → ToastHost（3s 自动消失）
```

注入时机：`createUiBridge()` 在 main.mjs 模块加载期创建（此时无窗口引用，ask 挂起由 timeout 兜底）；`createWindow()` 里 `dispatchUi()` 调 `setDispatch` 注入真实 `webContents.send`；会话创建后 `session.bindExtensions({ uiContext: uiBridge })` 把桥挂给 SDK 扩展（官方注入路径，`CreateAgentSessionOptions` 无 uiContext 字段）。

## 接口与依赖

### ZionAPI（17 个方法）

| 方法 | 通道 | 返回 |
|---|---|---|
| ping | `zion:ping`（invoke） | `{ ok: true, pid }` 连通性自检 |
| prompt(text) | `agent:prompt`（invoke） | `string`：末条消息 stopReason（'ok'/'error'/'aborted'…；prompt 从不抛错） |
| abort() | `agent:abort`（invoke） | `boolean` |
| steer(text) | `agent:steer`（invoke） | `boolean` |
| followUp(text) | `agent:followUp`（invoke） | `boolean` |
| scanTree() | `zion:scan-tree`（invoke） | `FileNode[]`：深度 ≤3，跳过 `node_modules`/`.git`/`dist`/`dist-renderer`/`graphify-out`/`.vite` 与点文件，目录在前 |
| listCommands() | `zion:list-commands`（invoke） | `CommandItem[]`：本机全部 skills + 内置/扩展命令聚合（main 侧 `src/main/skillscan.mjs` 扫描） |
| listSessions() | `zion:list-sessions`（invoke） | `SessionInfoLike[]`，按 modified 降序 |
| getCurrentSession() | `zion:get-current`（invoke） | `{ id, items }`（惰性 ensureCurrentSession：continueRecent 或新建） |
| switchSession(id) | `zion:switch-session`（invoke） | `{ id, items }`（懒创建实例，慢则秒级；id 不存在抛 `session not found`） |
| newSession() | `zion:new-session`（invoke） | `{ id, items }` |
| uiAnswer(id, result) | `zion:ui-answer`（invoke） | `{ ok: boolean }`：应答扩展对话框（结果回传 uiBridge，取消传 undefined）；id 未匹配（已超时/重复应答）返回 `{ ok: false }` |
| onUiAsk(cb) | `zion:ui-ask`（send） | 退订函数：AskDialog 渲染对话框请求 |
| onUiNotify(cb) | `zion:ui-notify`（send） | 退订函数：ToastHost 渲染通知 |
| renameSession(id, name) | `zion:rename-session`（invoke） | `SessionInfoLike[]`：刷新后的会话列表 |
| deleteSession(id) | `zion:delete-session`（invoke） | `SessionInfoLike[]`：刷新后的会话列表 |
| onAgentEvent(cb) | `agent:event`（send） | 退订函数 `() => void` |

**会话重命名/删除语义**（main.mjs 实现）：
- `renameSession`：`SessionManager.open(info.path, undefined, WORKSPACE_DIR)` + `appendSessionInfo(name)` —— 向会话 JSONL 追加 `session_info` 条目持久化显示名（重启不丢，`listSessionInfos` 直接映射 `name`）；SDK 会清洗名字（换行折叠为空格 + trim，空名清除标题）
- `deleteSession`：非硬删 —— 释放 `sessions` Map 实例；若删的是当前会话则清 `currentSession` 指针（下次 `ensureCurrentSession` 经 continueRecent 自动落回最近会话）；会话文件改名移入 `<会话目录>/.trash/<原名>.<时间戳>.jsonl`（可恢复）
- 渲染层已接线（`Sidebar.tsx`）：hover 操作区触发「行内改名」（`startRename`/`commitRename`，改名当前会话时同步 `setSessionTitle`）与「两段删除确认」（第一击进入 2.5s 确认态，再击执行 `deleteSession`；当前会话被删时经 `getCurrentSession` 落回最近会话）；两方法均以返回的刷新列表直接 `setSessions`

### 数据形状

- `SessionInfoLike`：`id` / `path` / `name?` / `firstMessage`（首条消息摘要，main 侧截断 80 字符）/ `messageCount` / `modified`（ISO 字符串）
- `SessionHistoryItem`：`role: 'user' | 'assistant'` / `text` / `ts`（仅文本消息；main 侧 `historyFromSession` 跳过工具消息与空文本）
- `FileNode`：`name` / `path`（相对工作目录的斜杠路径）/ `dir` / `size?`（人类可读字符串，目录无）/ `open?`（目录默认展开）/ `children?`
- `CommandItem`：`name`（展示名，不含斜杠）/ `description` / `kind: 'skill' | 'command'` / `source`（来源标注：用户/共享/项目/settings/扩展·包名/内置/扩展）
- `UiAsk`：`id`（`ui<N>` 序号）/ `kind: 'confirm' | 'input' | 'select'` / `title` / `message?`（confirm 消息或 input placeholder）/ `options?`（select 选项）/ `timeoutMs?`（透传扩展 timeout，renderer 侧未消费）
- `UiNotify`：`message` / `type?: 'info' | 'warning' | 'error'`（`uibridge.mjs` 内部另有 `UiAnswer = { id, result: string | boolean | undefined }`，仅桥内回传、不经 IPC）

### 类型依赖

- `@earendil-works/pi-coding-agent` —— `AgentSessionEvent` 类型源（`dist/core/agent-session.d.ts`）与 `ExtensionUIContext` 形状参照（`uibridge.mjs` 以 `/** @type {import('@earendil-works/pi-coding-agent').ExtensionUIContext} */` 标注桥对象），随 SDK 版本演进
- 类型检查双配置：`tsconfig.json` 覆盖 renderer + shared；`tsconfig.node.json` 覆盖 main/preload/shared（checkJs），改 `protocol.ts` 时两侧同时受检

## 设计决策与权衡

- **以类型而非运行时常量作为单一事实源**：preload 受 sandbox 约束必须 CJS、main 保持 JS，两端都无法 import TS 常量；用「类型契约 + checkJs 静态校验」零构建成本地约束两侧一致性。代价：通道名字符串在 main/preload 两处字面量重复，改通道必须两处同步
- **`AgentSessionEvent` 直接 re-export SDK 类型**：事件联合随 SDK 演进，本地重定义会漂移失真；代价是 SDK 升级可能增删联合成员，renderer 按 `type` 收窄的分支需同步更新
- **renderer 纯类型 import**：`import type` 被 vite/esbuild 构建时擦除，渲染包不携带任何契约运行时依赖，配合 `sandbox: true` 维持渲染层零 Node 访问
- **UI 桥 = Promise 表 + 动态派发注入**：桥在 main.mjs 模块加载期创建（早于任何 BrowserWindow），`createWindow()` 里 `dispatchUi()` 调 `setDispatch` 注入真实 `webContents.send`；桥本体纯 Node 无 electron 依赖，可 `node --test scripts/uibridge.test.mjs` 直测
- **取消/超时/AbortSignal 统一 resolve undefined（不 reject）**：扩展侧无需 try/catch 区分「拒绝」与「取消」；confirm 的 false 保留给显式「否」。代价：扩展无法区分「用户取消」与「超时」
- **`session.bindExtensions({ uiContext })` 是官方注入路径**：`CreateAgentSessionOptions` 无 uiContext 字段（headless 默认无 UI），`ExtensionBindings.uiContext` 是唯一入口
- **TUI 专属方法 no-op 桩**：`setStatus`/`setWidget`/`setTheme`/`editor` 等在 ZION（无终端 UI）无语义，空实现避免扩展调用报错；`custom()` 抛错明示未实现，`setTheme` 返回 `{ success: false, error: 'ZION 无 TUI 主题系统' }` 保持 SDK 返回形状

## 不变量、安全边界与失败模式

**不变量**：
- `window.zion` 的形状 === `ZionAPI`：preload 以 `/** @type {ZionAPI} */` 注解 api 对象，`tsc -p tsconfig.node.json`（checkJs）强制校验；renderer 侧 `env.d.ts` 声明同一类型
- `protocol.ts` 不产生任何运行时导出
- 会话列表条目都是真实落盘文件：SDK 只在出现首条 assistant 消息后才写会话文件（no-assistant 守卫），空会话（只有用户消息或纯新建）不落盘、不会出现在 `listSessions` 中 —— 因此 rename/delete 只作用于真实存在的会话

**安全边界**：renderer 零 Node 访问 —— `contextIsolation: true` + `sandbox: true` + `nodeIntegration: false`（`main.mjs` createWindow 的 webPreferences）；`window.zion` 是唯一 IPC 出口，凭据只留主进程。

**失败模式（renderer 的处理依据）**：
- `prompt()` 从不因模型/请求失败抛错：须检查 resolve 的 stopReason，'error' 时按失败展示
- `stopReason` 只存在于 LLM 助手消息分支（`AgentMessage` 联合其他成员没有）→ 必须 `'stopReason' in msg` 守卫后再取
- 会话懒创建：首次 `getCurrentSession` / `switchSession` 可能长达 45s（main 侧 `ensureSessionFor` 超时保护，超时 reject `agent init timeout`）；`switchSession` / `renameSession` / `deleteSession` 传未知 id 抛 `session not found: <id>`
- `window.zion` 可能为 undefined（preload 注入失败）→ renderer 需可选链 `window.zion?.` 或显式判空（见 App.tsx / Sidebar.tsx 现有用法）
- `onAgentEvent` 返回退订函数：组件卸载时必须调用，否则 preload 的 `ipcRenderer.on` listener 泄漏
- `onUiAsk` / `onUiNotify` 同样返回退订函数：App 卸载时必须调用，否则 listener 泄漏
- **超时只解决扩展侧 Promise，不强制关闭弹层**：`timeoutMs` 到点后 uibridge 删除 pending 条目并 resolve undefined，但 AskDialog 不自动关闭、不展示倒计时；用户稍后应答命中未匹配 id → main 侧 `console.warn('[zion] ui-answer 未匹配 dialog')` + `{ ok: false }`，弹层随 `setUiAsk(null)` 关闭，不会误答新对话框
- **窗口未就绪/已关闭时 ask 悬挂**：派发器未注入或 `win` 为空时 send 不投递，ask 悬挂到 timeout 兜底；notify 单向静默丢弃

## 已知限制与技术债

- `protocol.ts` 头部注释的通道清单不完整：只列了 5 个 invoke + 1 个 send（`agent:event`），缺 `zion:scan-tree` / `zion:list-commands` / `zion:list-sessions` / `zion:get-current` / `zion:switch-session` / `zion:new-session` / `zion:ui-answer` / `zion:rename-session` / `zion:delete-session` 与 send 通道 `zion:ui-ask` / `zion:ui-notify`（会话管理、命令面板、扩展 UI 桥后加时未更新注释）；实际 14 个 invoke + 3 个 send，以 `main.mjs` / `preload.cjs` 字面量为准
- 通道名无运行时单一来源；根治依赖 main 进程 TS 构建管线（仓库已列为后续步骤）
- `FileNode.size` 是**人类可读字符串**（如 '1.2k'）而非字节数，需要比较/排序时应由 main 侧改进
- AskDialog 不展示 timeout 倒计时、不自动关闭：SDK `ExtensionUIDialogOptions.timeout` 的文档语义是「自动关闭 + 倒计时」，当前只兑现了扩展侧 Promise 兜底
- 项目信任未接入：`bindExtensions` 只注入了 `uiContext`，`projectTrustContextFactory`（`CreateAgentSessionOptions` 字段）未传，项目信任处理仍属主仓「未做」清单

## 人工补充
