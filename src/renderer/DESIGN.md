# src/renderer（ZION 渲染层）设计

## 目标与非目标

**目标**：把 pi SDK 会话事件流渲染为 v4 极简黑客帝国 UI——四区布局 + 4 态会话状态机 + 三件装饰（单层数字雨 / 轻扫描线 / 蠕虫入侵+神经核心）+ WebAudio 程序化音效；会话列表、文件树、历史恢复走真实 IPC。

**非目标**：不定义 IPC 契约（`src/shared/protocol.ts` 类型与主进程是事实源）；不提供 Node/凭据能力（隔离在 preload 白名单之后）；不做真实 context 统计（头部「上下文 12.4k / 128k」与「主控会话 #0047」为硬编码装饰）。

**边界**：渲染层只消费 `window.zion`（ZionAPI）；事件类型源 `@earendil-works/pi-coding-agent`（经 `shared/protocol.ts` re-export）。主进程/preload 为 JS（`main.mjs`/`preload.cjs`），经 `tsconfig.node.json` checkJs 校验，IPC 通道名字面量在 main/preload 三处，本模块不持有。

## 架构与主要流程

**布局**（App.tsx）：氛围层（`#rain` / `#signal` / `.scanlines`，fixed）与 `#stage`（z-index 5，四区）同级。
- 区1 标题栏 `.titlebar`（36px）：品牌 + 时钟
- 区2 侧栏 `.sidebar`（232px）：神经核心 `#core` + 会话堆叠卡 `.deck` + 文件树 `#file-tree` + 底部信息
- 区3 对话区 `.console`：`.conv-head`（状态芯片）+ `#feed` + `.inputbar`
- 区4 `.term` 日志抽屉（默认 height:0，展开 150px）+ `.statusbar`（26px，SND 开关 / 日志按钮）

**事件→状态管线**（`useAgentEvents`，App.tsx 单一订阅点；退订函数在 effect cleanup 调用）：
- `agent_start` → RUNNING（重置 replyScheduled）
- `tool_execution_start` → RUNNING + `toolStart` 入 feed + 编辑类调用触发蠕虫
- `message_update`（text_delta / thinking_delta）→ STREAMING + `appendDelta`
- `tool_execution_end` → `toolEnd`（写 dur、状态 ok/err、尝试 result.patch 升级）；err → SND.abort，ok → SND.step
- `agent_end` → READY + SND.reply（replyScheduled 防重复）；`agent_settled` → READY
- `message_end` 中 `stopReason === 'error'` → READY + SND.abort（错误回合）
- CANCELLING 由 InputBar 本地置位（中断按钮或生成中按 Enter，`setSessionState('CANCELLING')` + `markInterrupted` + `window.zion.abort()`），非事件驱动

**FX 派生**：`setSessionState` 同步 `Object.assign` 到模块级 `fx` 对象（READY `{speed:1, energy:0.3}` / 忙碌 `{speed:2.2, energy:0.85}`）；RainCanvas（`90/fx.speed` 帧节流）与 NeuralCore（`rot += 0.006*fx.speed`，alpha 含 energy）直接读取，不触发 React 渲染。

**启动恢复**（App useEffect）：`getCurrentSession` → `listSessions` → 标题经 `deriveSessionTitle`（title.ts 纯函数，规则见「设计决策与权衡」）→ `applySession(id, title, items)` 以历史重建 feed（仅 user/assistant 文本，无工具卡）+ `setSessions`。

**会话切换/新建/重命名/删除**（Sidebar）：`selectSession` → `switchSession`（主进程懒创建实例，可能秒级；`switching` 锁防并发）→ `applySession`；`newSession` 同理；失败走 `log('err')`。重命名：`startRename` 以当前显示标题为草稿，`.s-title-edit` 内联输入 Enter/blur 提交 `commitRename`、Esc 取消；`renameSession` → `setSessions`，当前会话另 `setSessionTitle(name)`（只改标题，不重置 feed）。删除：`askDelete` 两段确认——首击进入「确认?」态（2.5s 自动复位），再击 `doDelete` → `deleteSession`（软删，移入 `.trash` 可恢复）→ `setSessions`；删除的是当前会话时主进程指针已落最近会话，`getCurrentSession` 重拉 + `applySession`（标题取新列表匹配，兜底短码）。点文件树行 → `pushUser` + `window.zion.prompt('读取 <path>')`（真实 prompt，无假动画）。

**命令面板**（InputBar 本地 state，不入 store；`.palette` 上弹式锚定 `.inputbar`）：
- 数据：mount 预取一次 `window.zion.listCommands()`（`CommandItem[]`；主进程 `zion:list-commands` 聚合扫描 skills+命令，数据源 `skillscan.mjs` 属主进程模块）；失败静默 → 空面板。
- 开合：输入以 `/` 开头且 ≤48 字符时打开；Esc 仅关闭面板（不清输入）。
- 过滤/排序：`name` startsWith 或 includes（不区分大小写）；command 优先 + `localeCompare` 字母序。
- 插入与发送：skill → `运行技能 ${name}：`；command → `/name`。仅改输入框文本，随后与普通输入同路径 `send()` → `window.zion.prompt`。
- 行交互：`role="listbox"/option` + `aria-selected`；↑↓ 循环移动、`onMouseEnter` 同步 active、`onMouseDown` preventDefault 防点击丢焦点；空态 `palette-empty`「无匹配 skill / 命令」。

**蠕虫入侵管线**（编辑类工具调用）：
- `tool_execution_start` → `parseEditFromTool`：编辑工具集合 `edit/apply_patch/write/multi_edit/patch/batch_execute`；bash 走写操作启发式（echo/printf 提取文本；目标按重定向 `>>`/`>`（排除 2>&1）→ `sed -i` → `tee` → `cp` → `mv` → `touch` 顺序取，`/dev/null`、`nul` 排除）；`batch_execute` 取首个可解析命令。
- 触发链：`triggerWorm`（同步路径，`wormedRef` 按 toolCallId 去重）→ `normPath`（`\`→`/`、去盘符）→ `matchTreeRow`（`.ft-row[data-path]` 精确或互为后缀）→ 未命中则 `scanTree` 刷新 → `openAncestors` 展开祖先 → 双 rAF 等渲染完成后重试 → 兜底 `.trace[data-toolcall=<id>]` 块行。
- 动画（`releaseWorm`）：神经核心中心 → L 形路径（先垂直后水平，8px 采样）→ TAIL=18 字符尾随（head 每帧 +3，尾节 35% 概率突变 + 抖动）；目标行可视区外先滚动侧栏居中；`CORE.burst()` 700ms 增能。命中 `intrudeRow`：`.breached` 类 900ms 闪烁 + 文件名扰码 620ms 逐字符还原（`.` 不动）；done 回调 → SND.breach + 日志 + `revealEdit(toolCallId)`。
- **diff 卡 reveal-after-hit**：Feed ToolCard 的 DiffCard 渲染受 `revealedEdits` 门控（完整渲染条件见 AGENTS.md 硬约束 3），`glitchIn 0.5s steps(7)` 扫入——语义为"入侵成功后才解密显示"。
- REDUCED：`releaseWorm` 直接命中，跳过动画，done 仍回调。

**diff 数据管线**（store.ts 纯函数）：
- `tryParseOne` 优先级：`patch`（`^[+@ -]` 判定，`@@` 头追踪行号）→ `edits[]` old/new 逐对展开（无行号）→ old/new/oldText/newText/content 公共前后缀朴素 diff → 仅 file 无内容（rows 空，只渲染头部）。
- `upgradeEditFromResult`：仅当该 tool item 已有 `edit` 时生效，`result.patch` 优先于 `result.diff`。
- `MAX_DIFF_ROWS = 200` 截断，防大文件撑爆 feed。

**工具链块参数展开**（toolfmt.ts 纯函数，Feed ToolCard 消费）：
- `.step` 行 `role="button"` + `tabIndex=0` + `aria-expanded`，点击或 Enter/Space 切换 `toggleToolExpand`（store `expandedTools`，toolCallId 键）。
- 展开渲染 `.trace-expand`：`te-title` = `toolExpandTitle`（args.file/path → `工具名 → 路径`，否则仅工具名）+ `<pre>` 全文 = `formatToolArgs`（bash → `command` 全文不截断；batch_execute → `commands[]` 逐行拼接；其余 → JSON 美化 `slice(0, 2000)`）。`pre` 限高 240px 内滚动、`pre-wrap` 防超宽行撑破卡片。

## 接口与依赖

**对外消费**（`window.zion`，ZionAPI，env.d.ts 声明）：`ping` / `prompt`（从不抛错，resolve 为 stopReason）/ `abort` / `steer` / `followUp` / `scanTree` / `listCommands`（命令面板数据，`CommandItem[]`）/ `listSessions` / `getCurrentSession` / `switchSession` / `newSession` / `renameSession` / `deleteSession`（rename/delete 均返回刷新后的完整会话列表）/ `onAgentEvent`（返回退订函数）。

**对外不提供**：无公共导出——本模块是终端 UI。

**内部依赖**：zustand 5（`useFeed`）、React 18（StrictMode）、`shared/protocol.ts`（type-only）、`styles.css`（令牌）。构建：vite root=`src/renderer`、outDir=`dist-renderer/`、`server.host=127.0.0.1`（strictPort 5173，vite 8 只绑 IPv6 的坑）。

## 设计决策与权衡

- **4 态状态机 + 两档 FX**（非连续插值）：ADR 0002 明确"不区分首次/持续 busy"，FX 只有 READY/忙碌两档——勿改回 v3 的 rAF 指数衰减。
- **错误回合不加第 5 态**：红日志 + 中止音 + 回 READY（ADR 0002 已知取舍）。
- **蠕虫同步触发**（事件回调内而非 useEffect）：防快工具的 `tool_end` 先于 React 渲染到达的时序竞争（App.tsx 头注释明示）。
- **revealedEdits 延迟渲染**：把"动画命中"与"diff 可见"绑定；目标缺失时 done 仍回调，卡片照样出现。
- **bash 写操作启发式**：正则提取目标与文本——复杂链式命令可能漏判、纯 echo 到屏幕可能误判，是权衡而非精确解析。
- **stopReason 运行时判定**：strict 下 AgentMessage 联合无法静态收窄到助手分支，用 cast + 可选链按运行时语义读取。
- **tokenCount 近似**：delta 字符数 ×2，非真实 token；`applySession`/`reset` 归零。
- **标题推导收敛为纯函数**（`title.ts` → store re-export 的 `deriveSessionTitle`，App 启动恢复与 Sidebar 会话卡共用）：两处原为各自内联 `slice(0,22)` 截断且行为不一致（App 不补省略号、不清引号），现统一为 name → firstMessage 智能摘要 → `会话 <id 前 4 位>` 兜底。摘要规则：取首行 → 剥含路径/命令特征的内嵌引号对（消除 `为"D:\\...\\..."` 残尾）与成对包裹引号 → 去前导符号（`- # > * · / \`）→ 22 字符截断 + '…'。改规则只动 `title.ts`（node:test 覆盖）。
- **会话堆叠卡 `--h` 测量**（Sidebar effect，deps `[sessions, currentSessionId]`）：每张 `.scard` 置 `--h = scrollHeight + 2`；CSS `margin-bottom: calc(80px - var(--h, 140px))` 使每卡恒定露出 80px 头部（标题 + 2 行摘要），hover 拉直旋转（`rotate(0) translateY(-4px)`）+ 展开摘要/meta。注意：Sidebar.tsx 注释"露出区 88px"与 CSS 实际 80px 不一致（注释过时，行为以 CSS 为准）。
- **`setSessionTitle` 与 `applySession` 分工**：改名当前会话只走 `setSessionTitle`（仅更新 `sessionTitle`，feed/状态机/token 全不动）——`applySession` 会重建 feed，误用会把正在进行的对话内容冲掉。
- **删除是软删除 + 两段确认**：`deleteSession` 为软删（主进程语义，UI 只展示 log），侧栏用「首击确认? + 2.5s 自动复位」防误触；删除当前会话后主进程指针自动落回最近会话，渲染层不自行猜 id，`getCurrentSession` 重拉。
- **日志前端自收集**：`store.logs` 上限 120 行（LOG_MAX），`role="log"`，收起时 `aria-hidden`。
- **交互细节**：mousedown 全局焦点归还 `#cmdline`（v4 §7.5）；Enter 在 STREAMING/CANCELLING 时切换为中断而非发送；面板打开且有候选时 Enter/Tab 插入选中项（不回发）。
- **命令面板只插入、不执行**：选中项仅写入输入框、不触发任何行为，回车后与普通输入同路径 `prompt`；命令执行语义归宿主 TUI 层（InputBar 头注释明示），渲染层不维护命令实现，避免两处命令知识漂移。
- **command 优先 + 字母序**：面板 max-height 320px 截断时命令恒在可见区（命令少、skills 多），字母序给稳定预期。
- **启动预取一次**：`listCommands` 主进程聚合扫描较重，仅 mount 调用一次，打开/过滤面板不再查主进程（代价见「已知限制与技术债」）。
- **本地字体替代 Google Fonts**：styles.css 顶部 `@font-face` 引入 `assets/fonts/ShareTechMono-Regular.woff2`（latin 子集 13.5KB，来源 @fontsource/share-tech-mono，font-display: swap），替代 demo（index-v4.html）的 Google Fonts `@import`——离线/墙内可用，「离线字体」未做项闭环；`--font` 回退链不变，latin 子集无 CJK，中文文案走系统字体回退。

## 不变量、安全边界与失败模式

**不变量**：
- `#rain` 负 z-index 的用途：即使 `#stage` 层叠上下文失效，雨幕也恒在 UI 之下；氛围层均 pointer-events:none，不拦截交互（层级数值见 AGENTS.md 硬约束 6）。
- 状态机终态恒为 READY：`agent_end` / `agent_settled` / `message_end` 错误 / `applySession` / `reset` 均回 READY；busy = `sessionState !== 'READY'`。
- 同一 toolCallId 蠕虫只触发一次（`wormedRef`）；`revealedEdits` 单调累积、永不清空（依赖 toolCallId 全局唯一）。
- `expandedTools` 随 `applySession` 清空（`reset` 不清——items 已清空，残留键不渲染、无害）。
- REDUCED 分支必须在动画路径早期返回且 done 仍执行（蠕虫直接命中）。
- 渲染进程零 Node 访问：所有数据经 ZionAPI 白名单。

**失败模式**：
- 桥未注入（`window.zion` undefined）：`useAgentEvents` 直接 return（空界面）；smoke 经 `window.zion.ping` 自检——开发中先查 preload 注入。
- prompt 错误回合：不抛错（SDK 语义），由 `message_end` stopReason 处理；InputBar 另有 catch 兜底日志。
- `scanTree`/`listSessions`/`switchSession`/`newSession`/`renameSession`/`deleteSession` 失败：各自 catch → `log('err')`，UI 不崩（空列表占位文案）。
- 启动恢复失败：静默 catch，停留在"会话就绪"空态。
- 快速连续工具：`wormedRef` 去重；Feed 每次 items/状态变化自动滚动到底（用户上翻阅读时位置会被拉回）。
- AudioContext 未解锁：`tone()` 静默 no-op，首次手势后恢复。
- 目标行不可见（侧栏 `<900px` 隐藏时）：蠕虫落 `.trace` 兜底行。
- 本地字体加载失败：styles.css 顶部 `@font-face` 引用的 `assets/fonts/ShareTechMono-Regular.woff2` 缺失/损坏时，按 `--font` 回退链走 ui-monospace/Courier New；字体声明只在 styles.css 一处，组件一律 `var(--font)`。

## 已知限制与技术债

- 单元测试仅覆盖纯函数层（`deriveSessionTitle`、`toolfmt`，node:test）；组件、事件管线、store 逻辑无测试（含命令面板键盘交互，smoke 不查 `.palette`），UI 回归依赖 typecheck + smoke + e2e。
- 会话历史恢复仅 user/assistant 文本，工具链块 / diff 卡不恢复。
- conv-head「上下文 12.4k / 128k」、「主控会话 #0047」、状态栏「TLS 1.3」为硬编码装饰，非真实数据。
- `AgentInfo` 类型保留但 Agent 卡片已移除（侧栏改为会话列表），注释注明供未来 agent 注册表。
- 协议提供 `steer`/`followUp`，UI 未接线；事件流中 steer 相关事件被默认分支忽略。
- 命令面板数据仅启动预取一次（`listCommands`），运行中新增/修改 skills 或命令不刷新，需重启应用。

## 人工补充
