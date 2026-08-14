# src/shared 设计 —— IPC 类型契约

## 目标与非目标

**目标**：为 ZION 渲染层 ↔ 主进程的全部 IPC 通信提供单一的类型事实来源，使桥面（`window.zion`）、事件流与数据结构在三个进程角色（renderer / preload / main）之间保持一致，并纳入 `tsc` 静态校验。

**非目标**：
- 不提供任何运行时代码、常量或 IPC 实现（实现分别在 `src/main/main.mjs`、`src/main/uibridge.mjs` 与 `src/preload/preload.cjs`）
- 不实现扩展 UI 桥本身（Promise 表 `uibridge.mjs`、弹层 `AskDialog.tsx`、toast `ToastHost`）：本契约只定义其 IPC 类型（`UiAsk`/`UiNotify`）与桥面方法（`uiAnswer`/`onUiAsk`/`onUiNotify`）
- 不提供通道名的运行时共享来源：通道名只能是 `main.mjs` / `preload.cjs` 两侧字面量（理由见「设计决策与权衡」）
- 不实现命令执行本身（handler 注册表 `commandHandlers` 在 `src/main/main.mjs`、面板数据源 `collectCommands` 在 `src/main/skillscan.mjs`）：本契约只定义 `runCommand` 桥面与 `CommandItem`/`RunCommandResult` 形状
- 不实现项目切换的主进程语义（`WORKSPACE_DIR` 变更、旧会话 dispose、`zion-projects.json` 持久化在 `src/main/main.mjs`；渲染侧管线见 `src/renderer/DESIGN.md` 项目切换节）——本契约只定义 `ProjectInfo`/`SwitchProjectResult` 形状与 `listProjects`/`getProject`/`browseProject`/`switchProject` 桥面
- 不实现工作区文件树监听本身（`fs.watch` 防抖重扫在 `src/main/main.mjs`）：本契约只定义 `onTreeChanged` 桥面与推送形状（`FileNode[]`）
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

命令执行数据流：InputBar 输入 `/cmd args` 回车或面板选中无参数 command → `window.zion.runCommand(name, args?)` → `invoke('zion:run-command')` → main `commandHandlers` 注册表按 name 路由（main.mjs；未知/未实现/异常统一返回 `kind:'error'` 占位结果）→ `RunCommandResult`：renderer 按 `kind` 渲染（ok=绿色 toast / error=红色 toast / info=仅日志）；会话切换类命令（/new /import /resume）成功后主进程已切 `currentSession`，以 `data: { id, items }`（同 `SessionPayload` 形状）回传 → renderer 重建 feed（InputBar.tsx 已按此实现）。面板选中带 `argumentHint` 的 command → 回填 `/name ` 待补参，Enter 后再走 runCommand。

项目切换数据流：ProjectPanel 打开时 `window.zion.listProjects()` → `invoke('zion:list-projects')` → main 读 `~/.pi/agent/zion-projects.json`（上限 8、最近优先去重）；选卡/浏览后 `switchProject(path)` / `browseProject()` → main `switchProject()`：同目录快速路径仅刷新会话指针；异目录逐个 `dispose()` 旧会话、清 `sessions` Map、重置 `currentSession`、更新 `WORKSPACE_DIR` 并写回最近项目，再对新目录 `continueRecent`/新建 → 返回 `SwitchProjectResult`（渲染层据此重建 feed/树/会话列表，管线细节见 `src/renderer/DESIGN.md` 项目切换节）

当前项目展示数据流：App 启动时 `window.zion.getProject()` → `invoke('zion:get-project')` → main 直接返回 `{ path: WORKSPACE_DIR }`（当前值，不读盘、不抛错）→ `store.currentProject` 驱动侧栏项目标题（渲染侧细节见 `src/renderer/DESIGN.md` 项目切换节）

文件树数据流（实时刷新）：main 启动恢复与 `switchProject` 时 `watchWorkspaceTree()` —— `fs.watch(WORKSPACE_DIR, { recursive: true })`，事件顶层名 ∈ `SCAN_SKIP` 或点文件开头直接跳过 → 400ms 防抖后重扫（与 `scanTree` 同一 `scanDir`，同深度/跳过规则）→ 重扫结果与上次 JSON 串相同则不推送，否则 `send('zion:tree-changed', fresh)` → preload `onTreeChanged` → Sidebar 用 `mergeTreeOpen(旧树, fresh)` 保留目录展开态后 `setTree`（直接替换会重置用户展开）。`fs.watch` 不可用（如平台不支持 recursive）→ console.warn 退化为手动刷新，渲染层仍可调 `scanTree` 兜底。

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

### ZionAPI（23 个方法）

通道全集以本表为准：`protocol.ts` 头注释只列示例通道并指向 `src/main/DESIGN.md`「接口」节，后者同样指回本表（完整清单唯一落点）。

| 方法 | 通道 | 返回 |
|---|---|---|
| ping | `zion:ping`（invoke） | `{ ok: true, pid }` 连通性自检 |
| prompt(text) | `agent:prompt`（invoke） | `string`：末条消息 stopReason（'ok'/'error'/'aborted'…；prompt 从不抛错） |
| abort() | `agent:abort`（invoke） | `boolean` |
| steer(text) | `agent:steer`（invoke） | `boolean` |
| followUp(text) | `agent:followUp`（invoke） | `boolean` |
| scanTree() | `zion:scan-tree`（invoke） | `FileNode[]`：深度 ≤3，跳过 `node_modules`/`.git`/`dist`/`dist-renderer`/`graphify-out`/`.vite` 与点文件，目录在前 |
| listCommands() | `zion:list-commands`（invoke） | `CommandItem[]`：本机全部 skills + 内置/扩展命令聚合（main 侧 `src/main/skillscan.mjs` 扫描） |
| runCommand(name, args?) | `zion:run-command`（invoke） | `RunCommandResult`：主进程 dispatch（main.mjs `commandHandlers`）；未知/未实现命令/异常统一返回 `kind:'error'` 占位结果，永不 reject |
| listSessions() | `zion:list-sessions`（invoke） | `SessionInfoLike[]`，按 modified 降序 |
| getCurrentSession() | `zion:get-current`（invoke） | `SessionPayload`（惰性 ensureCurrentSession：continueRecent 或新建） |
| switchSession(id) | `zion:switch-session`（invoke） | `SessionPayload`（懒创建实例，慢则秒级；id 不存在抛 `session not found`） |
| newSession() | `zion:new-session`（invoke） | `SessionPayload` |
| uiAnswer(id, result) | `zion:ui-answer`（invoke） | `{ ok: boolean }`（=`{ ok: handled }`，`handleAnswer` 是否命中 Promise 表）：应答扩展对话框（结果回传 uiBridge，取消传 undefined）；id 未匹配（已超时/重复应答）返回 `{ ok: false }` |
| listProjects() | `zion:list-projects`（invoke） | `ProjectInfo[]`：最近项目（`~/.pi/agent/zion-projects.json`，上限 8，最近优先去重；坏文件/缺失 → 空数组） |
| getProject() | `zion:get-project`（invoke） | `{ path: string }`：当前工作目录（`WORKSPACE_DIR` 现值，不读盘、不抛错） |
| browseProject() | `zion:browse-project`（invoke） | `SwitchProjectResult \| null`：原生目录选择（`dialog.showOpenDialog`）后直接切换；取消返回 null |
| switchProject(dir) | `zion:switch-project`（invoke） | `SwitchProjectResult`：切换工作目录 + 会话上下文重建；非字符串/空串抛 `invalid project path` |
| onUiAsk(cb) | `zion:ui-ask`（send） | 退订函数：AskDialog 渲染对话框请求 |
| onUiNotify(cb) | `zion:ui-notify`（send） | 退订函数：ToastHost 渲染通知 |
| renameSession(id, name) | `zion:rename-session`（invoke） | `SessionInfoLike[]`：刷新后的会话列表 |
| deleteSession(id) | `zion:delete-session`（invoke） | `SessionInfoLike[]`：刷新后的会话列表 |
| onAgentEvent(cb) | `agent:event`（send） | 退订函数 `() => void` |
| onTreeChanged(cb) | `zion:tree-changed`（send） | 退订函数：工作区文件树变化推送（主进程 fs.watch 防抖重扫，重扫结果无变化则不推送） |

**会话重命名/删除语义**（main.mjs 实现）：
- `renameSession`：`SessionManager.open(info.path, undefined, WORKSPACE_DIR)` + `appendSessionInfo(name)` —— 向会话 JSONL 追加 `session_info` 条目持久化显示名（重启不丢，`listSessionInfos` 直接映射 `name`）；SDK 会清洗名字（换行折叠为空格 + trim，空名清除标题）
- `deleteSession`：非硬删 —— 释放 `sessions` Map 实例；若删的是当前会话则清 `currentSession` 指针（下次 `ensureCurrentSession` 经 continueRecent 自动落回最近会话）；会话文件改名移入 `<会话目录>/.trash/<原名>.<时间戳>.jsonl`（可恢复）
- 渲染层已接线（`Sidebar.tsx`）：hover 操作区触发「行内改名」（`startRename`/`commitRename`，改名当前会话时同步 `setSessionTitle`）与「两段删除确认」（第一击进入 2.5s 确认态，再击执行 `deleteSession`；当前会话被删时经 `getCurrentSession` 落回最近会话）；两方法均以返回的刷新列表直接 `setSessions`

### 数据形状

- `SessionInfoLike`：`id` / `path` / `name?` / `firstMessage`（首条消息摘要，main 侧截断 80 字符）/ `messageCount` / `modified`（ISO 字符串）
- `SessionHistoryItem`：`role: 'user' | 'assistant'` / `text` / `ts`（仅文本消息；main 侧 `historyFromSession` 跳过工具消息与空文本）
- `ProjectInfo`：`path` / `lastUsed`（ISO 字符串；main 侧最近优先去重、上限 8）
- `SessionPayload`：`id` / `items`（该会话历史，同 `SessionHistoryItem[]`；`getCurrentSession`/`switchSession`/`newSession` 的返回载荷，`SwitchProjectResult` 复用同一 id/items 形状）
- `SwitchProjectResult`：`path`（切换后的工作目录）+ `SessionPayload`（id/items：新当前会话及其历史）
- `FileNode`：`name` / `path`（相对工作目录的斜杠路径）/ `dir` / `size?`（人类可读字符串，目录无）/ `open?`（目录默认展开）/ `children?`
- `CommandItem`：`name`（展示名，不含斜杠）/ `description` / `kind: 'skill' | 'command'` / `source`（来源标注：skill：用户/共享/项目/settings/扩展·包名；command：内置/扩展，与 `skillscan.mjs` 的 `collectCommands` 一致）/ `argumentHint?`（命令参数提示，对齐官方 `BUILTIN_SLASH_COMMANDS.argumentHint`，如 `'<provider/model>'`；缺省=无参数命令）
- `RunCommandResult`：`ok` / `message`（展示文案，写日志或 toast）/ `kind?: 'info' | 'ok' | 'error'`（渲染分级：info=仅日志、ok=成功、error=失败）/ `data?`（命令专属载荷：如 session 统计、导出路径、会话切换类命令的 `{ id, items }`）
- `UiAsk`：`id`（`ui<N>` 序号）/ `kind: 'confirm' | 'input' | 'select'` / `title` / `message?`（confirm 消息或 input placeholder）/ `options?`（select 选项）/ `timeoutMs?`（透传扩展 timeout，renderer 侧未消费）
- `UiNotify`：`message` / `type?: 'info' | 'warning' | 'error'`（`uibridge.mjs` 内部另有 `UiAnswer = { id, result: string | boolean | undefined }`，仅桥内回传、不经 IPC）

### 类型依赖

- `@earendil-works/pi-coding-agent` —— `AgentSessionEvent` 类型源（`dist/core/agent-session.d.ts`）与 `ExtensionUIContext` 形状参照（`uibridge.mjs` 以 `/** @type {import('@earendil-works/pi-coding-agent').ExtensionUIContext} */` 标注桥对象），随 SDK 版本演进
- 类型检查双配置：`tsconfig.json` 与 `tsconfig.node.json` 同时覆盖本文件，改 `protocol.ts` 时两侧受检（覆盖关系见 AGENTS.md 命令节）

## 设计决策与权衡

- **以类型而非运行时常量作为单一事实源**：preload 受 sandbox 约束必须 CJS、main 保持 JS，两端都无法 import TS 常量；用「类型契约 + checkJs 静态校验」零构建成本地约束两侧一致性。代价：通道名字符串在 main/preload 两处字面量重复，改通道必须两处同步
- **`AgentSessionEvent` 直接 re-export SDK 类型**：事件联合随 SDK 演进，本地重定义会漂移失真；代价是 SDK 升级可能增删联合成员，renderer 按 `type` 收窄的分支需同步更新
- **renderer 纯类型 import**：`import type` 被 vite/esbuild 构建时擦除，渲染包不携带任何契约运行时依赖，配合 `sandbox: true` 维持渲染层零 Node 访问
- **UI 桥 = Promise 表 + 动态派发注入**：桥在 main.mjs 模块加载期创建（早于任何 BrowserWindow），`createWindow()` 里 `dispatchUi()` 调 `setDispatch` 注入真实 `webContents.send`；桥本体纯 Node 无 electron 依赖，可 `node --test scripts/uibridge.test.mjs` 直测
- **取消/超时/AbortSignal 统一 resolve undefined（不 reject）**：扩展侧无需 try/catch 区分「拒绝」与「取消」；confirm 的 false 保留给显式「否」。代价：扩展无法区分「用户取消」与「超时」
- **`session.bindExtensions({ uiContext })` 是官方注入路径**：`CreateAgentSessionOptions` 无 uiContext 字段（headless 默认无 UI），`ExtensionBindings.uiContext` 是唯一入口
- **TUI 专属方法 no-op 桩**：`setStatus`/`setWidget`/`setTheme`/`editor` 等在 ZION（无终端 UI）无语义，空实现避免扩展调用报错；`custom()` 抛错明示未实现，`setTheme` 返回 `{ success: false, error: 'ZION 无 TUI 主题系统' }` 保持 SDK 返回形状
- **命令执行集中 main 侧 dispatch**：`commandHandlers` 注册表（main.mjs）是唯一执行点，renderer 只按 `kind` 渲染日志/toast；未实现命令（trust/hotkeys/model/settings）返回明确占位错误而非静默吞掉，避免「点了没反应」的假象；`zion:run-command` 外层 catch 把 handler 异常统一转 `kind:'error'` 结果返回，调用方无需异常分支

## 不变量、安全边界与失败模式

**不变量**：
- `window.zion` 的形状 === `ZionAPI`：preload 以 `/** @type {ZionAPI} */` 注解 api 对象，`tsc -p tsconfig.node.json`（checkJs）强制校验；renderer 侧 `env.d.ts` 声明同一类型
- `protocol.ts` 不产生任何运行时导出
- 会话列表条目都是真实落盘文件：SDK 只在出现首条 assistant 消息后才写会话文件（no-assistant 守卫），空会话（只有用户消息或纯新建）不落盘、不会出现在 `listSessions` 中 —— 因此 rename/delete 只作用于真实存在的会话
- 最近项目清单：去重、最近优先、上限 8（main 侧 `PROJECTS_MAX`）；`listProjects` 永不抛错（坏文件 → 空数组）

**安全边界**：renderer 零 Node 访问 —— `contextIsolation: true` + `sandbox: true` + `nodeIntegration: false`（`main.mjs` createWindow 的 webPreferences）；`window.zion` 是唯一 IPC 出口，凭据只留主进程。

**失败模式（renderer 的处理依据）**：
- `prompt()` 从不因模型/请求失败抛错：须检查 resolve 的 stopReason，'error' 时按失败展示
- `stopReason` 只存在于 LLM 助手消息分支（`AgentMessage` 联合其他成员没有）→ 必须 `'stopReason' in msg` 守卫后再取
- `runCommand` 永不 reject：未知命令、未实现命令（占位）与 handler 异常一律由 main 侧转成 `kind:'error'` 的 `RunCommandResult`；renderer 按 `kind` 展示即可，但调用点仍建议 try/catch（`window.zion` 缺失等桥级失败）
- 会话懒创建：首次 `getCurrentSession` / `switchSession` 可能长达 45s（main 侧 `ensureSessionFor` 超时保护，超时 reject `agent init timeout`）；`switchSession` / `renameSession` / `deleteSession` 传未知 id 抛 `session not found: <id>`
- `window.zion` 可能为 undefined（preload 注入失败）→ renderer 需可选链 `window.zion?.` 或显式判空（见 App.tsx / Sidebar.tsx 现有用法）
- `onAgentEvent` 返回退订函数：组件卸载时必须调用，否则 preload 的 `ipcRenderer.on` listener 泄漏
- `onTreeChanged` 同 `onAgentEvent`：Sidebar 卸载时必须调用退订函数，否则 listener 泄漏（Sidebar.tsx 的 effect 已按此实现）
- `onUiAsk` / `onUiNotify` 同样返回退订函数：App 卸载时必须调用，否则 listener 泄漏
- **超时只解决扩展侧 Promise，不强制关闭弹层**：`timeoutMs` 到点后 uibridge 删除 pending 条目并 resolve undefined，但 AskDialog 不自动关闭、不展示倒计时；用户稍后应答命中未匹配 id → main 侧 `console.warn('[zion] ui-answer 未匹配 dialog')` + `{ ok: false }`，弹层随 `setUiAsk(null)` 关闭，不会误答新对话框
- **窗口未就绪/已关闭时 ask 悬挂**：派发器未注入或 `win` 为空时 send 不投递，ask 悬挂到 timeout 兜底；notify 单向静默丢弃
- `browseProject` 取消 → `null`（不抛错，渲染层判空保持面板不切换）；无窗口时 main 走 `dialog.showOpenDialog(opts)` 无父窗重载
- `switchProject` 旧会话 `dispose()` 异常被捕获忽略（实例随进程回收），不阻断切换；同目录快速路径不 dispose、不写最近项目文件
- `saveProject` 写盘失败（权限/磁盘）→ `console.warn` 后切换仍完成（最近项目列表少一条，下次保存覆盖）

## 已知限制与技术债

- 通道名无运行时单一来源（`protocol.ts` 头注释只列示例、完整清单在本文件接口节）；根治依赖 main 进程 TS 构建管线（仓库已列为后续步骤）
- `FileNode.size` 是**人类可读字符串**（如 '1.2k'）而非字节数，需要比较/排序时应由 main 侧改进；`onTreeChanged` 以重扫 JSON 串去重，size 字符串不变的细微内容改动不触发推送（文件树是结构级实时，非内容级）
- AskDialog 不展示 timeout 倒计时、不自动关闭：SDK `ExtensionUIDialogOptions.timeout` 的文档语义是「自动关闭 + 倒计时」，当前只兑现了扩展侧 Promise 兜底
- 项目信任未接入：`bindExtensions` 只注入了 `uiContext`，`projectTrustContextFactory`（`CreateAgentSessionOptions` 字段）未传，项目信任处理仍属主仓「未做」清单
- 命令执行 dispatch 中 trust/hotkeys/model/settings 仅占位（返回 `kind:'error'` 占位结果，对应 issue #25/#26）：面板可点但无实际功能

## 人工补充
