# src/main 设计（Electron 主进程 + preload 安全桥）

## 目标与非目标

**目标**
- 进程内接入 pi SDK：`createAgentSession` 复用 `~/.pi/agent` 配置（auth/models/settings）；会话创建/恢复/列举/打开全部经 `SessionManager`，工作目录固定为 `WORKSPACE_DIR`（值见 AGENTS.md 硬约束）
- 多会话并存：`Map<sessionId, AgentSession>` 懒创建 + `currentSession` 指针切换；事件流只转发当前会话
- 渲染层零 Node 访问：preload 在 sandbox 下暴露 `window.zion` 白名单桥（安全配置事实归 `src/shared/DESIGN.md` 安全边界）

**非目标 / 边界**
- 不做 UI：渲染层在 `src/renderer`，只经 `window.zion` 与 `src/shared/protocol.ts` 契约交互
- 不管理模型/凭据：SDK 直接读 `~/.pi/agent`
- 不实现扩展 UI 桥与项目信任处理（见「已知限制与技术债」）
- main 进程保持 `.mjs` + JSDoc + checkJs，不引入 TS 构建管线（当前定案）
- IPC 契约本身（通道全集、`ZionAPI`、数据形状、stopReason 语义）不在此重复，见 `src/shared/DESIGN.md`

## 架构与主要流程

组件与数据流：

```
src/renderer (React/TS)  ⇄  window.zion（preload.cjs, CJS, sandbox）
        │ 契约：src/shared/protocol.ts（ZionAPI / AgentSessionEvent）
        ▼
main.mjs：ipcMain.handle ×10 + agent:event 转发
        │ sessions: Map<sessionId, AgentSession>；currentSession 指针
        ▼
@earendil-works/pi-coding-agent：createAgentSession / SessionManager / session.subscribe
```

**启动**：`app.whenReady` → `createWindow()`（1440×900、黑底、`autoHideMenuBar`、preload=`../preload/preload.cjs`）；存在 `--dev` argv 时加载 `http://127.0.0.1:5173`，否则 `dist-renderer/index.html`；`did-finish-load` 后 `executeJavaScript('Boolean(window.zion)')` 自检注入并打日志（smoke 脚本同款检查）。

**会话生命周期**：
- `ensureCurrentSession()`：无当前会话 → `fs.mkdirSync(WORKSPACE_DIR, { recursive: true })` → `SessionManager.continueRecent(WORKSPACE_DIR)` → `ensureSessionFor(sm, id)`
- `ensureSessionFor(sm, id)`：Map 命中 → 置 `currentSession` 直接返回；未命中 → `createAgentSession({ cwd: WORKSPACE_DIR, sessionManager })` 与 **45s 超时**（`Promise.race`，超时 reject `'agent init timeout'`）竞争 → 成功则 `sessions.set`、置指针、`wireSession(s)`；超时失败不入 Map，下次调用可重试
- 切换：`zion:switch-session` 先用 `SessionManager.list` 结果校验 id（未知 id 抛 `'session not found: <id>'`）→ `SessionManager.open(info.path, undefined, WORKSPACE_DIR)` → `ensureSessionFor`；`zion:new-session` → `SessionManager.create(WORKSPACE_DIR)`；`zion:get-current` → `ensureCurrentSession`；三者返回 `{ id, items }`（`items` 来自 `historyFromSession`）

**prompt 主流程**：`agent:prompt` → `ensureCurrentSession` → `s.prompt(text)` → 取末条消息 stopReason（仅 LLM 助手消息分支有该字段，守卫规则见 `src/shared/DESIGN.md` 失败模式）→ 返回 `stop ?? 'ok'`。SDK 事件：`s.subscribe` 回调 → 过滤（`win` 未销毁且 `s === currentSession`）→ `win.webContents.send('agent:event', event)` → preload `ipcRenderer.on('agent:event')` 剥掉 `IpcRendererEvent` → `onAgentEvent` 回调（返回退订函数）。过滤是转发期判断而非订阅期判断：`wireSession` 每会话只订阅一次，切换会话不重订阅，旧会话事件被过滤不污染当前 feed。

**历史提取**：`historyFromSession(s)` 遍历 `s.state.messages`，仅处理 `role === 'user'` / `'assistant'` 的消息（其余角色天然排除）；user 的 `content` 兼容 string 与内容数组（取 `type === 'text'` 部分拼接），assistant 同为数组文本过滤；空文本跳过；输出 `SessionHistoryItem[]`（形状归 shared 契约）。

**文件树扫描**：`zion:scan-tree` → `scanDir(WORKSPACE_DIR, WORKSPACE_DIR, 0)` 同步递归（`readdirSync`/`statSync`），跳过规则与契约摘要同 `src/shared/DESIGN.md` scanTree 行：
- `SCAN_SKIP` 集合（node_modules / .git / dist / dist-renderer / graphify-out / .vite）+ 一切点文件（`e.name.startsWith('.')`）
- 深度上限 `SCAN_MAX_DEPTH = 3`，越界目录 `children: []`；目录 `open: depth < 2`（前两层默认展开）
- 文件大小经 `humanSize`（b / k / M）；目录优先、按名排序；单条 readdir/stat 失败 try/catch 静默跳过，不中断整树

## 接口与依赖

IPC 通道全集（10 invoke + 1 send）与返回形状见 `src/shared/DESIGN.md` 接口节（本模块是字面量与 handler 所在地）。契约未载明的实现侧行为：

- `agent:prompt` 完整 await `s.prompt()`，返回 `stop ?? 'ok'`；不因模型/请求失败 reject（失败表现为末条消息 `stopReason: 'error'` + `errorMessage`，UI 必须查，语义见 shared）
- `agent:abort` / `agent:steer` / `agent:followUp` **不 await** SDK 调用即返回 `true`（fire-and-forget）：返回不代表 agent 已 idle；无当前会话时静默 no-op
- `zion:switch-session` / `zion:new-session` / `zion:get-current` 的 `{ id, items }` 中 `id` 来自 `sessionManager.getSessionId()`
- `zion:list-sessions` 映射 `SessionManager.list` 结果：`firstMessage` 截 80 字符、`modified` 转 ISO、按 modified 倒序

依赖：
- `@earendil-works/pi-coding-agent`（^0.84.1）：`createAgentSession`、`AgentSession`（prompt/steer/followUp/abort/subscribe/state）、`SessionManager` static create/open/continueRecent/list
- `electron`（^43.x）：app / BrowserWindow / ipcMain / webContents；`node:path` / `node:fs` / `node:url`
- 外部边界：`~/.pi/agent`（SDK 配置）；`WORKSPACE_DIR`（agent cwd + 会话归属）；SDK 默认会话目录 `~/.pi/agent/sessions/<encoded-cwd>/`（未显式传 sessionDir 时——`continueRecent`/`create`/`list` 均省略；`open` 第二参传 `undefined` 则 sessionDir 从会话文件父目录推导）

## 设计决策与权衡

- **多会话 Map + 当前指针而非单例**：会话懒创建（首次进入秒级），切换后实例保留在 Map 避免重复初始化；代价是旧会话后台任务仍可能运行（其事件被转发过滤，UI 无感知）
- **转发期过滤而非按会话路由**：`wireSession` 每会话订阅一次，转发时判 `s === currentSession`；切换无需重订阅，且保证任意时刻至多一个会话的事件到达渲染层
- **45s init 超时**：SDK 的 ModelRuntime 目录刷新可能挂（root AGENTS.md「关键 SDK 行为」），超时保护避免 UI 永久等待；失败会话不入 Map，可重试
- **prompt 不抛错 → IPC 返回 stopReason**：主进程不维护回合状态机，错误检测责任交给渲染层（shared 契约明示）
- **preload CJS + JSDoc 类型**：`sandbox: true` 强制 CJS 决定文件形态；类型经 `@typedef import('../shared/protocol.ts')` + checkJs 校验，契约单一事实源不落地为运行时模块
- **WORKSPACE_DIR 独立工作区**：项目选择 UI 落地前避免 agent 直接操作主目录；`SessionManager.open(info.path, undefined, WORKSPACE_DIR)` 的第三参 cwdOverride 把会话 cwd 固定在本工作区
- **历史只取 user/assistant 文本**：恢复 feed 的最小契约（`SessionHistoryItem` 无工具细节字段），工具消息与空文本排除
- **scan-tree 同步 fs + 深度/跳过限制**：主进程阻塞式扫描换实现简单，深度上限 + 跳过集合（清单见 shared）把代价限制在可控范围
- **abort/steer/followUp fire-and-forget**：与 prompt 的完整 await 不对称——主进程不维护回合状态，UI 交互即时返回；需要精确 idle 状态时 SDK 提供 `waitForIdle`

## 不变量、安全边界与失败模式

**不变量**：
- 任意时刻至多一个会话（`currentSession`）的事件被转发；`sessions` Map 实例在进程生命周期内不销毁（切换不丢上下文，也没有淘汰策略）
- `window.zion` 方法集合与 `ZionAPI` 一一对应（preload 以 `/** @type {ZionAPI} */` 注解，checkJs 强制）
- `agent:prompt` 不因模型/请求失败 reject；abort/steer/followUp 无会话时返回 `true`
- 所有 IPC 返回均为可序列化 JSON

**安全边界**：
- 渲染层零 Node 访问的配置事实归 shared（`main.mjs` createWindow 的 webPreferences）；本模块侧责任是：preload 不得暴露白名单之外的 API，main 不得把 Node 能力经其他通道传出
- `switch-session` 的 id 必须先经 `SessionManager.list` 结果校验（防任意路径打开会话文件）
- 渲染层输入（prompt/steer/followUp 文本、会话 id）不做信任校验，但 agent 的 cwd 固定在 `WORKSPACE_DIR`，影响范围受限

**失败模式**：
- `createAgentSession` 超时（45s）→ reject `'agent init timeout'` → 该次 IPC reject；主进程无重试/降级逻辑（下次调用可重试）
- **streaming 中再发 prompt**：SDK 的 `prompt()` 在流式中且未指定 `streamingBehavior` 时抛错（SDK d.ts `@throws` 声明），main.mjs 调用未传 options——连续快速发两条指令可能令该次 IPC reject；root AGENTS.md「从不抛错」仅覆盖模型/请求失败场景
- 模型/请求失败 → prompt 正常 resolve，末条消息 `stopReason: 'error'`；UI 必须检查
- 窗口销毁后事件到达 → `win.isDestroyed()` 守卫丢弃，不 send
- 扫描遇不可读目录/文件 → 静默跳过单条目，整树不中断
- `continueRecent` 无历史 → 返回新会话 id，走正常创建路径

## 已知限制与技术债

- 扩展 UI 桥未实现：`createAgentSession` 未传 ExtensionUIContext（SDK `ctx.ui` 默认 headless），agent 侧 UI 能力（如 ask）不可用
- 项目信任未处理：headless 下 `ask` 会静默忽略项目资源
- main 进程 TS 构建管线未做：`.mjs` + JSDoc + checkJs 是当前方案；通道名无运行时单一来源的根治依赖它（后果见 `src/shared/DESIGN.md` 已知限制）
- abort/steer/followUp 为 fire-and-forget：`true` 不代表 agent 已 idle；若 UI 需要精确状态，后续应 await 或改用 SDK `waitForIdle`
- `sessions` Map 只增不减：会话数随 `zion:new-session` 增长，长期运行内存随之增长（当前无淘汰策略）

## 人工补充
