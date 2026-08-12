# src/main 设计（Electron 主进程 + preload 安全桥）

## 目标与非目标

**目标**
- 进程内接入 pi SDK：`createAgentSession` 复用 `~/.pi/agent` 配置（auth/models/settings）；会话创建/恢复/列举/打开/重命名/删除全部经 `SessionManager`，工作目录固定为 `WORKSPACE_DIR`（值见 AGENTS.md 硬约束）
- 多会话并存：`Map<sessionId, AgentSession>` 懒创建 + `currentSession` 指针切换；事件流只转发当前会话
- 命令面板数据源：`zion:list-commands` 聚合本机全部 skills（用户/共享/项目/扩展包/settings.skills）与命令（内置 + 扩展白名单），`skillscan.mjs` 实现
- 渲染层零 Node 访问：preload 在 sandbox 下暴露 `window.zion` 白名单桥（安全配置事实归 `src/shared/DESIGN.md` 安全边界）
- 扩展 UI 桥：`uibridge.mjs` 实现 SDK `ExtensionUIContext` 的 dialog（select/confirm/input）与 notify——请求挂 Promise 表 → 派发 renderer（AskDialog/ToastHost 呈现）→ `zion:ui-answer` 回传；经 `session.bindExtensions({ uiContext })` 注入（官方路径，`CreateAgentSessionOptions` 无 uiContext 字段）。绑定后 SDK `hasUI()` 为 true，项目信任询问（工作区含需信任资源且 defaultProjectTrust='ask' 时）也经桥的 select 弹窗呈现，不再 headless 静默拒绝

**非目标 / 边界**
- 不做 UI：渲染层在 `src/renderer`，只经 `window.zion` 与 `src/shared/protocol.ts` 契约交互
- 不管理模型/凭据：SDK 直接读 `~/.pi/agent`
- 不实现 TUI 专属 UI 能力：`ExtensionUIContext` 的终端方法（setStatus/setWidget/custom 等）为 no-op 桩，ZION 无终端 UI（见「已知限制与技术债」）
- 不解释/执行命令与技能：面板只提供数据清单，插入与执行语义在渲染层/宿主 TUI
- main 进程保持 `.mjs` + JSDoc + checkJs：`build:main` 只做 typecheck 门禁 + 复制（源码即产物），无 TS 转译管线（迁移方案见「已知限制与技术债」）
- IPC 契约本身（通道全集、`ZionAPI`、数据形状、stopReason 语义）不在此重复，见 `src/shared/DESIGN.md`

## 架构与主要流程

组件与数据流：

```
src/renderer (React/TS)  ⇄  window.zion（preload.cjs, CJS, sandbox）
        │ 契约：src/shared/protocol.ts（ZionAPI / AgentSessionEvent / UiAsk / UiNotify）
        ▼
main.mjs：ipcMain.handle ×14 + agent:event / zion:ui-ask / zion:ui-notify 转发
        │ sessions: Map<sessionId, AgentSession>；currentSession 指针
        │ ├─ skillscan.mjs：collectCommands（skills 扫描 + 命令清单，纯 Node）
        │ └─ uibridge.mjs：createUiBridge（dialog Promise 表 + notify，纯 Node）
        ▼
@earendil-works/pi-coding-agent：createAgentSession / SessionManager / session.subscribe / bindExtensions
```

**启动**：`app.whenReady` → `createWindow()`（1440×900、黑底、`autoHideMenuBar`、preload=`../preload/preload.cjs`）；存在 `--dev` argv 时加载 `http://127.0.0.1:5173`，否则 `dist-renderer/index.html`；`did-finish-load` 后 `executeJavaScript('Boolean(window.zion)')` 自检注入并打日志（smoke 脚本同款检查）。`createWindow()` 开头调用 `dispatchUi()` 向 uiBridge 注入真实派发（`webContents.send('zion:ui-ask' / 'zion:ui-notify')`，闭包经 `win?.` 可选链）：派发时窗口不存在则落到 no-op，ask 由 timeout 兜底。产物侧：`scripts/build-main.mjs` 以 tsconfig.node.json typecheck 为门禁，把 `src/main`/`src/preload` 的 JS 复制到 `dist-main/main` + `dist-main/preload`（package.json `main` 指向 `dist-main/main/main.mjs`，dev/smoke/e2e/start 全走产物；复制保持 `../preload/preload.cjs`、`../../dist-renderer` 相对路径在 dist-main 布局下依旧成立）。

**会话生命周期**：
- `ensureCurrentSession()`：无当前会话 → `fs.mkdirSync(WORKSPACE_DIR, { recursive: true })` → `SessionManager.continueRecent(WORKSPACE_DIR)` → `ensureSessionFor(sm, id)`
- `ensureSessionFor(sm, id)`：Map 命中 → 置 `currentSession` 直接返回；未命中 → `createAgentSession({ cwd: WORKSPACE_DIR, sessionManager })` 与 **45s 超时**（`Promise.race`，超时 reject `'agent init timeout'`）竞争 → 成功则先 `await session.bindExtensions({ uiContext: uiBridge })`（扩展 UI 桥注入，SDK 官方路径）再 `sessions.set`、置指针、`wireSession(s)`；超时失败不入 Map，下次调用可重试
- 切换：`zion:switch-session` 先用 `SessionManager.list` 结果校验 id（未知 id 抛 `'session not found: <id>'`）→ `SessionManager.open(info.path, undefined, WORKSPACE_DIR)` → `ensureSessionFor`；`zion:new-session` → `SessionManager.create(WORKSPACE_DIR)`；`zion:get-current` → `ensureCurrentSession`；三者返回 `{ id, items }`（`items` 来自 `historyFromSession`）
- 重命名/删除：`zion:rename-session` / `zion:delete-session` 同 switch 的 id 校验；重命名 = `SessionManager.open` + `appendSessionInfo(name)` 持久化显示名（不加载 AgentSession 实例，见接口节）；删除 = 释放 Map 实例 + 删的是当前会话则清指针 + 会话文件移入 `<会话文件目录>/.trash/`（时间戳后缀，可恢复）。SDK 事实：空会话不落盘（无 assistant 消息 → 无 `.jsonl` 文件），rename/delete 只对真实列出的已持久化会话有效（新建即空的会话在列表外）

**prompt 主流程**：`agent:prompt` → `ensureCurrentSession` → `s.prompt(text)` → 取末条消息 stopReason（仅 LLM 助手消息分支有该字段，守卫规则见 `src/shared/DESIGN.md` 失败模式）→ 返回 `stop ?? 'ok'`。SDK 事件：`s.subscribe` 回调 → 过滤（`win` 未销毁且 `s === currentSession`）→ `win.webContents.send('agent:event', event)` → preload `ipcRenderer.on('agent:event')` 剥掉 `IpcRendererEvent` → `onAgentEvent` 回调（返回退订函数）。过滤是转发期判断而非订阅期判断：`wireSession` 每会话只订阅一次，切换会话不重订阅，旧会话事件被过滤不污染当前 feed。

**历史提取**：`historyFromSession(s)` 遍历 `s.state.messages`，仅处理 `role === 'user'` / `'assistant'` 的消息（其余角色天然排除）；user 的 `content` 兼容 string 与内容数组（取 `type === 'text'` 部分拼接），assistant 同为数组文本过滤；空文本跳过；输出 `SessionHistoryItem[]`（形状归 shared 契约）。

**文件树扫描**：`zion:scan-tree` → `scanDir(WORKSPACE_DIR, WORKSPACE_DIR, 0)` 同步递归（`readdirSync`/`statSync`），跳过规则与契约摘要同 `src/shared/DESIGN.md` scanTree 行：
- `SCAN_SKIP` 集合（node_modules / .git / dist / dist-renderer / graphify-out / .vite）+ 一切点文件（`e.name.startsWith('.')`）
- 深度上限 `SCAN_MAX_DEPTH = 3`，越界目录 `children: []`；目录 `open: depth < 2`（前两层默认展开）
- 文件大小经 `humanSize`（b / k / M）；目录优先、按名排序；单条 readdir/stat 失败 try/catch 静默跳过，不中断整树

**命令聚合**：`zion:list-commands` → `collectCommands`（skillscan.mjs，纯 Node 同步扫描）：
- 来源（遵循 pi docs/skills.md 官方加载来源，按序扫描）：`~/.pi/agent/skills`（用户）→ `~/.agents/skills`（共享）→ `WORKSPACE_DIR/.pi/skills` + `.agents/skills`（项目）→ `~/.pi/agent/settings.json` 的 `skills` 数组（`~` 展开为 home，解析失败视为空）→ `~/.pi/agent/npm/node_modules` 各包 `skills/` 目录（扩展，递归支持 `@scope` 包）
- 技能形态：`<dir>/SKILL.md`（frontmatter 无 name 时回退目录名）；根级 `.md`（带 name frontmatter）也计入；单文件损坏跳过
- 去重：`kind:name` 先到先得（用户级先扫，优先于共享/项目/settings）；命令最后追加
- 命令：`BUILTIN_COMMANDS`（21 个，pi 源码 `BUILTIN_SLASH_COMMANDS` 快照）+ `EXTENSION_COMMANDS`（/goal 白名单）；返回 `CommandItem[]`（形状归 shared 契约）

## 接口与依赖

IPC 通道全集与返回形状见 `src/shared/DESIGN.md` 接口节（本模块是字面量与 handler 所在地）。契约未载明的实现侧行为：

- `agent:prompt` 完整 await `s.prompt()`，返回 `stop ?? 'ok'`；不因模型/请求失败 reject（失败表现为末条消息 `stopReason: 'error'` + `errorMessage`，UI 必须查，语义见 shared）
- `agent:abort` / `agent:steer` / `agent:followUp` **不 await** SDK 调用即返回 `true`（fire-and-forget）：返回不代表 agent 已 idle；无当前会话时静默 no-op
- `zion:switch-session` / `zion:new-session` / `zion:get-current` 的 `{ id, items }` 中 `id` 来自 `sessionManager.getSessionId()`
- `zion:list-sessions` 映射 `SessionManager.list` 结果：`firstMessage` 截 80 字符、`modified` 转 ISO、按 modified 倒序
- `zion:rename-session` 校验 id 后 `SessionManager.open` + `appendSessionInfo`，**不加载 AgentSession 实例**（不入 `sessions` Map、不动 `currentSession` 指针），返回 `listSessionInfos()`
- `zion:delete-session` **先断引用后移文件**：`sessions.delete(id)`、当前会话则 `currentSession = null`，再 `mkdirSync` + `renameSync` 移入 `<会话文件目录>/.trash/<原名>.<时间戳>.jsonl`；不 abort 被删会话可能的后台任务（引用已断，事件无转发资格），返回 `listSessionInfos()`
- `zion:ui-answer` → `uiBridge.handleAnswer(id, result)`：命中 Promise 表 → cleanup + resolve(result)，返回 `{ ok: true }`；未知 id（已超时清理/重复应答）返回 `{ ok: false }` 并 warn，不抛错

依赖：
- `@earendil-works/pi-coding-agent`（^0.84.1）：`createAgentSession`、`AgentSession`（prompt/steer/followUp/abort/subscribe/state）、`SessionManager` static create/open/continueRecent/list + 实例方法 `appendSessionInfo`（重命名持久化）
- `electron`（^43.x）：app / BrowserWindow / ipcMain / webContents；`node:path` / `node:fs` / `node:url`
- `skillscan.mjs` 仅依赖 `node:fs` / `node:path`（刻意不依赖 electron，保证 `node --test` 可直测）
- 外部边界：`~/.pi/agent`（SDK 配置）；`WORKSPACE_DIR`（agent cwd + 会话归属）；SDK 默认会话目录 `~/.pi/agent/sessions/<encoded-cwd>/`（未显式传 sessionDir 时——`continueRecent`/`create`/`list` 均省略；`open` 第二参传 `undefined` 则 sessionDir 从会话文件父目录推导）

**uiBridge 语义**（`uibridge.mjs`，纯 Node、无 electron 依赖）：
- ask 流程：`id = 'ui' + 自增序号` → `pending.set` → `dispatch.ask({ id, kind, title, message, options, timeoutMs })`；`dlg.timeout`（>0）到点 resolve `undefined`；`dlg.signal` abort（含已 abort 立即）resolve `undefined`；应答/超时/abort 均经 cleanup 清表
- `handleAnswer(id, result)`：命中 → resolve(result) 返回 true；未命中返回 false（重复应答安全）
- `notify`：单向派发 `{ message, type }`，无应答、无超时
- `setDispatch(d)`：动态注入真实派发；创建期缺省 no-op（`opts.onAsk`/`onNotify`），ask 由 timeout 兜底
- TUI 专属方法为 no-op 桩：`getEditorText()` 返回 `''`、`getToolsExpanded()` 返回 `false`、`getAllThemes()` 返回 `[]`、`setTheme()` 返回 `{ success: false, error }`、`custom()` 抛错 `'ui.custom 未实现（ZION 无 TUI）'`（RPC 模式降级为返回 undefined，ZION 选择显式抛错）
- `pendingCount()`：未应答 dialog 数（测试/诊断用）

## 设计决策与权衡

- **多会话 Map + 当前指针而非单例**：会话懒创建（首次进入秒级），切换后实例保留在 Map 避免重复初始化；代价是旧会话后台任务仍可能运行（其事件被转发过滤，UI 无感知）；`delete-session` 是唯一显式释放路径
- **重命名走 SDK 的 `appendSessionInfo`、删除走 `.trash` 回收而非硬删**：显示名写进会话 JSONL 的 `session_info` 条目（重启不丢、与 pi 自身命名一致）；删除用 `renameSync` 移入 `<会话文件目录>/.trash/` 加时间戳后缀（误删可手动移回恢复）。代价：`.trash` 只进不出需人工清理（见技术债）
- **转发期过滤而非按会话路由**：`wireSession` 每会话订阅一次，转发时判 `s === currentSession`；切换无需重订阅，且保证任意时刻至多一个会话的事件到达渲染层
- **45s init 超时**：SDK 的 ModelRuntime 目录刷新可能挂（root AGENTS.md「关键 SDK 行为」），超时保护避免 UI 永久等待；失败会话不入 Map，可重试
- **prompt 不抛错 → IPC 返回 stopReason**：主进程不维护回合状态机，错误检测责任交给渲染层（shared 契约明示）
- **preload CJS + JSDoc 类型**：`sandbox: true` 强制 CJS 决定文件形态；类型经 `@typedef import('../shared/protocol.ts')` + checkJs 校验，契约单一事实源不落地为运行时模块
- **WORKSPACE_DIR 独立工作区**：项目选择 UI 落地前避免 agent 直接操作主目录；`SessionManager.open(info.path, undefined, WORKSPACE_DIR)` 的第三参 cwdOverride 把会话 cwd 固定在本工作区
- **历史只取 user/assistant 文本**：恢复 feed 的最小契约（`SessionHistoryItem` 无工具细节字段），工具消息与空文本排除
- **scan-tree 同步 fs + 深度/跳过限制**：主进程阻塞式扫描换实现简单，深度上限 + 跳过集合（清单见 shared）把代价限制在可控范围
- **abort/steer/followUp fire-and-forget**：与 prompt 的完整 await 不对称——主进程不维护回合状态，UI 交互即时返回；需要精确 idle 状态时 SDK 提供 `waitForIdle`
- **命令清单 = 内置权威快照 + 扩展白名单**：扩展运行时注册的命令无法静态枚举，`EXTENSION_COMMANDS` 是唯一静态入口；`BUILTIN_COMMANDS` 从 pi 源码提取快照，SDK 升级需人工核对漂移
- **skillscan 纯 Node、零 electron 依赖**：`node --test scripts/skillscan.test.mjs` 直接单测，不依赖 Electron 启动；同步 `readdirSync` 扫描仅限本机 skills 小目录，阻塞可接受（与 scan-tree 同步扫描同款权衡）
- **扫描位置遵循 pi docs/skills.md**：与 pi 自身技能加载来源一致；项目级技能目录挂在 `WORKSPACE_DIR` 下（当前工作区），不是仓库目录
- **去重先到先得**：按 `kind:name` 只保留首见条目，用户级先扫 → 用户技能优先于共享/项目/settings 同名技能（与 pi 的技能优先级一致）
- **bindExtensions 注入而非 createAgentSession options**：`CreateAgentSessionOptions` 无 uiContext 字段，`bindExtensions({ uiContext })` 是 SDK 官方注入路径（docs/sdk.md：会话替换后需重新 bind）；SDK 内部把 uiContext 交给扩展 runner，`hasUI()` 随之为 true。uiBridge 单例复用，注入点收敛在 `ensureSessionFor`（每个新会话都要注入）
- **Promise 表 + 动态派发解耦窗口生命周期**：uibridge 零 electron 依赖可 `node --test` 直测（与 skillscan 同款权衡）；派发由 main.mjs 注入，窗口未就绪时 ask 挂起、timeout 兜底，notify 静默丢弃——扩展调用永不悬挂
- **timeout/signal 兜底 resolve undefined**：对齐 SDK RPC 语义（docs/rpc.md：dialog 带 timeout 时 agent 侧自动按默认值 resolve）；取消（Esc/遮罩/undefined 应答）与超时归一为 `undefined`，调用方按「用户未选择」处理
- **TUI 方法 no-op 桩（custom 抛错）**：对齐 SDK RPC 降级语义（具体桩返回值见接口节）；`custom()` 例外——显式抛错让依赖终端覆盖层的扩展感知不可用，而非静默返回 undefined

## 不变量、安全边界与失败模式

**不变量**：
- 任意时刻至多一个会话（`currentSession`）的事件被转发；`sessions` Map 实例仅被 `zion:delete-session` 显式释放（切换不丢上下文，无自动淘汰策略）
- `window.zion` 方法集合与 `ZionAPI` 一一对应（preload 以 `/** @type {ZionAPI} */` 注解，checkJs 强制）
- `agent:prompt` 不因模型/请求失败 reject；abort/steer/followUp 无会话时返回 `true`
- 每个 dialog 请求至多一次有效应答：`handleAnswer` 命中即清表，二次应答返回 false 不重复 resolve
- 所有 IPC 返回均为可序列化 JSON

**安全边界**：
- 渲染层零 Node 访问的配置事实归 shared（`main.mjs` createWindow 的 webPreferences）；本模块侧责任是：preload 不得暴露白名单之外的 API，main 不得把 Node 能力经其他通道传出
- `switch-session` / `rename-session` / `delete-session` 的 id 必须先经 `SessionManager.list` 结果校验（防任意路径打开/移动会话文件）
- 渲染层输入（prompt/steer/followUp 文本、会话 id）不做信任校验，但 agent 的 cwd 固定在 `WORKSPACE_DIR`，影响范围受限

**失败模式**：
- `createAgentSession` 超时（45s）→ reject `'agent init timeout'` → 该次 IPC reject；主进程无重试/降级逻辑（下次调用可重试）
- **streaming 中再发 prompt**：SDK 的 `prompt()` 在流式中且未指定 `streamingBehavior` 时抛错（SDK d.ts `@throws` 声明），main.mjs 调用未传 options——连续快速发两条指令可能令该次 IPC reject；root AGENTS.md「从不抛错」仅覆盖模型/请求失败场景
- 模型/请求失败 → prompt 正常 resolve，末条消息 `stopReason: 'error'`；UI 必须检查
- 窗口销毁后事件到达 → `win.isDestroyed()` 守卫丢弃，不 send
- ask 派发时窗口未创建/已销毁 → dispatch 落到 no-op（`win?.` 可选链），扩展调用挂起至 timeout 兜底 resolve undefined（不 reject）；notify 静默丢弃
- `zion:ui-answer` 未知 id（已超时清理/重复应答）→ `{ ok: false }` + warn 日志，无副作用
- 扫描遇不可读目录/文件 → 静默跳过单条目，整树不中断
- `continueRecent` 无历史 → 返回新会话 id，走正常创建路径
- rename/delete 未知 id → 同 switch 抛 `'session not found: <id>'`（校验不通过，不触碰任何文件）
- `zion:delete-session` 先断引用后移文件：`fs.renameSync` 失败（权限/占用）→ IPC reject，但 Map 实例与指针已清、文件仍在原目录（半完成状态，可重试或手动恢复）
- `zion:list-commands`：settings.json 缺失/解析失败 → `skills` 视为空数组，其余来源不受影响；单个 SKILL.md 不可读/损坏 → 跳过该条目，不中断整体

## 已知限制与技术债

- 扩展 UI 桥仅覆盖 dialog（select/confirm/input）与 notify：`ExtensionUIContext` 其余方法为 TUI no-op 桩（ZION 无终端 UI），依赖终端能力的扩展功能（setWidget 组件工厂、custom 覆盖层、编辑器集成、主题系统）不可用，`custom()` 抛错
- 项目信任无专门 UI：询问经桥的 select 弹窗呈现（SDK `resolveProjectTrusted`，需信任资源 + defaultProjectTrust='ask' + 未记住决策时触发），决策持久化在 SDK trustStore；ZION 未提供独立信任管理界面
- main 仍是 JS：`build:main` 只做 typecheck 门禁 + 复制（源码即产物），无 tsc emit；通道名无运行时单一来源的问题仍在——未来迁 TS 时把 build:main 复制步骤替换为 tsc emit（dist-main 布局不变，见 `scripts/build-main.mjs` 注释）
- abort/steer/followUp 为 fire-and-forget：`true` 不代表 agent 已 idle；若 UI 需要精确状态，后续应 await 或改用 SDK `waitForIdle`
- 命令清单是静态快照：`BUILTIN_COMMANDS` 随 pi SDK 升级可能漂移（需人工核对）；新增扩展命令需手工追加 `EXTENSION_COMMANDS`，运行时注册的命令无法被发现
- `sessions` Map 无自动淘汰：会话数随 `zion:new-session` 增长，仅 `zion:delete-session` 显式释放；`.trash` 回收目录只进不出，需人工清理（恢复 = 把文件移回原会话目录）

## 人工补充
