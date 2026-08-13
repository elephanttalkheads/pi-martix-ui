# src/renderer（ZION 渲染层）设计

## 目标与非目标

**目标**：把 pi SDK 会话事件流渲染为黑客帝国风 UI——v4 四区骨架 + v5 回合化会话区（回合聚合消息流 + 凝结雨轨 / 思考块折叠 / 结算行 / 注入解码 / 液态玻璃）+ 4 态会话状态机 + 三件装饰（单层数字雨 / 轻扫描线 / 蠕虫入侵+Neo 头像）+ WebAudio 程序化音效；会话列表、文件树、历史恢复、项目选择面板（最近项目 / 原生目录浏览 → 切换工作目录与会话上下文）、扩展对话框（`ctx.ui` 的 confirm/select/input → AskDialog 弹层）与扩展通知（notify → toast）走真实 IPC；纯浏览器调试桥（`mockBridge.ts`：无 preload 时注入 mock ZionAPI，prompt 经真实事件派发路径，UI 全功能可演示）。

**非目标**：不定义 IPC 契约（`src/shared/protocol.ts` 类型与主进程是事实源）；不提供 Node/凭据能力（隔离在 preload 白名单之后）；不做真实 context 统计（头部「上下文 12.4k / 128k」与「主控会话 #0047」为硬编码装饰）；不实现扩展对话框的 Promise 表/超时/AbortSignal 兜底（主进程 `src/main/uibridge.mjs` 是事实源）——本模块只消费 `UiAsk`/`UiNotify` 类型与 `uiAnswer`/`onUiAsk`/`onUiNotify` 桥面；不实现项目切换的主进程语义（`WORKSPACE_DIR` 变更、旧会话 dispose、`~/.pi/agent/zion-projects.json` 持久化在 `src/main/main.mjs`）——本模块只消费 `listProjects`/`browseProject`/`switchProject` 桥面；不做完整 markdown 渲染（仅围栏 + 行内 code/高亮子集，语法边界见「正文解析」）。

**边界**：渲染层只消费 `window.zion`（ZionAPI）；事件类型源 `@earendil-works/pi-coding-agent`（经 `shared/protocol.ts` re-export）。主进程/preload 为 JS（`main.mjs`/`preload.cjs`），经 `tsconfig.node.json` checkJs 校验，IPC 通道名字面量在 main/preload 两处，本模块不持有。会话区词条（agent 回合 / 凝结雨轨 / 结算行 / 注入解码）定义以根 `CONTEXT.md` 为准，本文件只记实现语义，不重述定义。

## 架构与主要流程

**布局**（App.tsx）：氛围层（`#rain` / `#signal` / `.scanlines`，fixed）与 `#stage`（z-index 5，四区）同级。
- 区1 标题栏 `.titlebar`（36px）：品牌 + 时钟
- 区2 侧栏 `.sidebar`（`width: var(--side-w, 232px)`，默认 232，可拖拽调宽；整栏不滚动）：`.core-wrap`（Neo 头像，固定）→ `.side-section.sessions`（flex 2：会话堆叠卡 `.deck` 内部滚动）→ `.side-section.projects`（flex 3：`.side-head` 标题行 = 项目 basename（全路径在 title 属性）+「⇄ 切换项目」按钮 + 文件树 `#file-tree` 内部滚动）→ `.side-foot`（固定，workspace 文案）
- 区2.5 `.side-resizer`（8px 拖拽热区，`margin: 0 -4px` 视觉零宽、伸出两侧各 4px 命中区，WAI-ARIA separator，机制见下「侧栏调宽」）——`.main`（flex 行）内位于 Sidebar 与 `.console` 之间
- 区3 对话区 `.console`：`.conv-head`（状态芯片）+ `#feed` + `.inputbar`
- 区4 `.term` 日志抽屉（默认 height:0，展开 150px）+ `.statusbar`（26px，SND 开关 / DEC 开关 / 日志按钮 / `tokens:` 真实 usage 计数）

**侧栏调宽**（App.tsx + styles.css）：热区独立条而非 sidebar 子元素——`.sidebar` 的 `overflow: hidden` 会裁剪伸出边界的子元素，且独立条不盖内部滚动条（styles.css 注释明示）。
- 拖拽：resizer `pointerdown`（仅左键，preventDefault）记 `{startX, startW}` → window 级 `pointermove` 每帧 `applySideWidth(clampSide(startW + dx))`——直写 `.main` 元素 style 的 `--side-w`（不触发 React 渲染），并同步 resizer `aria-valuenow` → `pointerup` 解绑监听 + `persistSideWidth`（localStorage `zion.sidebar-w`，仅松手写一次）。`touch-action: none` 防触屏拖拽触发滚动。
- 键盘（`role="separator"` + `aria-orientation="vertical"` + `tabIndex=0` + `aria-valuemin/max/now`）：←/→ ±8px（Shift ±32px）、Esc 复位默认宽；键盘路径立即 apply + persist。`aria-valuenow` 由 `applySideWidth` 同步，ARIA 值与真实宽度不脱节。
- 双击复位默认宽；启动 useEffect 读 `zion.sidebar-w` 经 `clampSide` 后应用（无键/非数字忽略，回落默认宽）。
- clamp 边界与步进常量在 App.tsx 模块级（`SIDE_*`，值见 AGENTS.md 硬约束 17）；`clampSide` 动态上限取窗口一半与 `SIDE_MAX` 取小——窄窗口侧栏不撑过半屏。

**文件树实时监听**（Sidebar + store.ts）：mount 时除初始 `scanTree`/`listSessions` 外订阅 `onTreeChanged`（主进程 fs.watch 防抖重扫后推送整树快照，未订阅则消息丢弃——watcher 机制属 src/main 模块，此处只记消费侧）。收到推送 `setTree(mergeTreeOpen(旧树, 新树))`：`mergeTreeOpen` 是 store 纯函数，新树中同路径目录若旧树 `open` → 保持展开，其余以新树为准——实时推送不重置用户展开态；卸载时退订（`offTree?.()`）。

**事件→状态管线**（`useAgentEvents`，App.tsx 单一订阅点；退订函数在 effect cleanup 调用；所有 store 写入经队列 API 入队，见「回合聚合模型与渲染队列」）：
- `agent_start` → `armTurn`（回合起点，队列化保序）+ RUNNING（重置 replyScheduled/errored）
- `message_update`（text_delta / thinking_delta）→ `queueDelta(delta, kind)` + STREAMING
- `tool_execution_start` → `toolStart` 入队 + RUNNING + 编辑类调用触发蠕虫
- `tool_execution_end` → `toolEnd`（写 dur、状态 ok/err、尝试 result.patch 升级）；闭环后到达的迟到事件倒序扫回合回退匹配；err → SND.abort，ok → SND.step
- `turn_end` → `addUsage(usage.totalTokens)`：累积进活动回合（结算行 Σtokens）+ 状态栏真实 token 计数（替代 v4 字符数 ×2 伪计数）
- `agent_end` → `closeTurn()` + READY + SND.reply（replyScheduled 防重复）；`errored` 标记的错误回合不再补 reply 音/「回复完成」日志；`agent_settled` → `closeTurn()` + READY
- `message_end` 中 `stopReason === 'error'` → `closeTurn('error')` + READY + SND.abort + 置 `errored` 标记（错误回合，由 `agent_end` 消费）
- CANCELLING 由 InputBar 本地置位（中断按钮或生成中按 Enter，`setSessionState('CANCELLING')` + `markInterrupted`（入队）+ `window.zion.abort()`），非事件驱动

**回合聚合模型与渲染队列**（store.ts）：feed 数据不再是平铺 FeedItem 数组，而是 `turns`（id→Turn）+ `order`（渲染序）+ `activeTurnId`。Turn 分两类：`operator`（一次用户输入）与 `agent`（agent_start→闭环的执行周期）；agent 回合的 `content` 按到达顺序保序存放内容段（`text`/`thinking`）与工具条目（`tool`）。agent 事件经 IPC 逐条到达（每条一个宏任务），store 把它们攒进模块级 op 队列（`arm`/`delta`/`toolStart`/`toolEnd`/`usage`/`interrupt`/`close`），rAF 时 `_flush` 一次应用：每帧至多一次 `set()`，且只替换活动回合对象（`edit()` 首次访问克隆换引用，`ensureTurn()` 在 armed 或无活动回合时新建）——这是 TurnView 回合级 memo 的前提，历史回合零重渲染。`pushUser` 先同步 `flushNow`（OPERATOR 回合落在正确位置）；`applySession`/`reset` 清队防跨会话污染。

**回合内容与结算行**（Feed.tsx TurnView）：`order.map` 渲染 TurnView（memo），`active`/`streaming` 只对活动回合为真。operator 回合右对齐（OPERATOR 头 + 注入解码）；agent 回合 `.turn-agent`：`TurnRail` + content 逐条渲染——`tool` → ToolCard（工具链块 + diff 卡，revealedEdits 门控）、`thinking` → `<details class="think">` 默认折叠（「思路」摘要，流式中显示「· 思考中…」）、`text` → `.msg.agent`（Body 解析，语法见「正文解析」；中断标记 `[已被操作员中断]` 落最后一个 text 段；caret 落末 entry）。闭环写结算行 `.settle`：`◆ 已结算/已中断/错误 · N tools · Σtokens · 耗时`——tokens 为回合内各 turn_end usage 求和（`seenUsage=false` 时显示 null），耗时为 `agent_start`→闭环的渲染层实测（performance.now，非 SDK 计时）；outcome 判定：`closeTurn('error')` → error，有 `interrupted` 标记 → interrupted，否则 ok；`!cur.settle` 守卫保证每回合至多一条。

**正文解析**（markdown.ts `parseBody` 纯函数，Feed Body / OperatorBody 解码完成后共用）：```（或 ~~~）围栏代码块 + 行内 `code` /【高亮词】；围栏开行可带语言标签（`lang` 只解析不展示）、未闭合宽容到文末、代码块内不做行内解析。代码块渲染为 `.msg-code` `<pre>`——简约样式（无边框无背景，唯一锚点是左侧 1px 弱线，与正文区分但保持密度）；markdown.test.mjs 覆盖 8 用例。

**凝结雨轨**（TurnRail.tsx）：活动回合左侧 `.rail`（`pointer-events: none`——纯装饰轨道，不拦截拖选/点击）内 2 列迷你数字雨 canvas，帧节流 `90/fx.speed`（与背景雨同一折算，直接读 `fx`）；回合闭环后组件卸载 canvas、凝为 ◆（`.seal`，rAF 立即停——长会话零常驻开销）；reduced-motion 只画一帧静态雨；`aria-hidden`，纯装饰不承载业务（见 CONTEXT.md「凝结雨轨」）。

**注入解码**（Feed.tsx OperatorBody）：OPERATOR 消息入场时假名乱码逐位还原（时长 `min(700, 240+字符数*6)`ms，空格/换行保留；解码期间纯文本渲染，完成后交 Body 做 code/高亮/围栏解析）；只入场播一次（text/decOn 变化不重播）；DEC 关闭或 reduced-motion 直接 Body；开关 `decOn` 持久化 `zion.dec`（见 CONTEXT.md「注入解码」）。

**液态玻璃分级**（styles.css）：工具卡/diff 卡为「agent 凝结出的实体」——静态态半透明磷光底 + 顶边镜面高光/底边折射暗线（无 blur 开销）；`backdrop-filter: blur(9px) saturate(1.25) brightness(1.05)` 只开 `.turn-agent.is-active` 内的卡（性能分级：长会话任意时刻 blur 卡数 ≤ 活动回合卡数）；工具收尾（run→ok/err）挂载 `.ripple` 凝结涟漪（0.7s 一次性动画，reduced-motion 关闭）。

**FX 派生**：`setSessionState` 同步 `Object.assign` 到模块级 `fx` 对象（READY `{speed:1, energy:0.3}` / 忙碌 `{speed:2.2, energy:0.85}`）；RainCanvas 与 TurnRail（均 `90/fx.speed` 帧节流）直接读取，不触发 React 渲染。侧栏顶部为 Vite import 的透明 Neo 双帧 PNG（120×120，容器无底板/描边）；张嘴仅由蠕虫释放驱动（store `wormActive` 计数 > 0，`releaseWorm` 开始 +1、done -1），CSS 以 300ms `steps(1,end)` 在闭嘴/张嘴间切换，释放瞬间附带 700ms 缩放脉冲，reduced-motion 下停在静态张嘴帧且不脉冲。

**启动恢复**（App useEffect，`window.zion?.getCurrentSession` 守卫——桥未注入直接 return 优雅降级）：`getCurrentSession` → `listSessions` → 标题经 `deriveSessionTitle`（title.ts 纯函数，规则见「设计决策与权衡」）→ `applySession(id, title, items)` 以历史重建回合 feed（仅文本段：user→operator 回合、assistant→agent 回合单 text 段；回合 time 取 `h.ts` 经 `fmtTime` 格式化（HH:MM，无 ts 回落当前时刻）——与实时回合 `msgTime` 同一格式化；无工具卡/结算行，`startedAt=0` 不计时）+ `setSessions` + `getProject` → `setCurrentProject`（侧栏 Project 标题）→ `listProjects` 判空：无最近项目 → `setProjectOpen(true)` 自动打开项目选择面板（启动引导，ADR-0003 决策 3）。

**浏览器调试桥**（mockBridge.ts + main.tsx）：`installMockBridge()` 在 `window.zion` 缺失时（浏览器直开 vite dev、无 Electron preload）注入 mock ZionAPI，有桥（Electron 打包）检测后直接跳过，不影响生产。mock 数据按项目维度写死（`MOCK_SESSIONS`/`MOCK_ITEMS`/`MOCK_TREE`/`MOCK_PROJECTS`/`MOCK_COMMANDS`）；`prompt` 按输入生成模板回复，经 setTimeout 按真实时序派发 `agent_start → tool_execution_start → message_update(text_delta) → tool_execution_end → message_end → agent_end → agent_settled`（`abort` 置位后未触发的派发全部取消）——事件经 `onAgentEvent` 真实派发路径，feed 流式渲染与事件管线零改动。`browseProject` 浏览器无原生对话框，轮换到下一个 mock 项目模拟选择；`onUiAsk`/`onUiNotify` 为空实现（无扩展弹层演示数据）。

**会话切换/新建/重命名/删除**（Sidebar）：`selectSession` → `switchSession`（主进程懒创建实例，可能秒级；`switching` 锁防并发）→ `applySession`；`newSession` 同理；失败走 `log('err')`。重命名：`startRename` 以当前显示标题为草稿，`.s-title-edit` 内联输入 Enter/blur 提交 `commitRename`、Esc 取消；`renameSession` → `setSessions`，当前会话另 `setSessionTitle(name)`（只改标题，不重置 feed）。删除：`askDelete` 两段确认——首击进入「确认?」态（2.5s 自动复位），再击 `doDelete` → `deleteSession`（软删，移入 `.trash` 可恢复）→ `setSessions`；删除的是当前会话时主进程指针已落最近会话，`getCurrentSession` 重拉 + `applySession`（标题取新列表匹配，兜底短码）。点文件树行 → `pushUser` + `window.zion.prompt('读取 <path>')`（真实 prompt，无假动画）。

**项目切换管线**（ProjectPanel，App 顶层 fragment 挂载；store `projectOpen` 控制开合；打开入口：侧栏 `.side-head` 的「⇄ 切换项目」按钮 + 启动无最近项目自动打开）：
- 打开时 `window.zion.listProjects()` 拉最近项目（effect 按 `[open]` 触发，`alive` 活期守卫；失败静默 → 空列表，仅「浏览其他目录…」可用）。
- `pick(path)` / `browse()`：`busy` 锁防并发 → `switchProject(path)` 或 `browseProject()`（主进程 `dialog.showOpenDialog` 原生目录选择，取消返回 null 不切换）→ 成功走 `applySwitch`：`applySession(r.id, '会话 ' + r.id.slice(0, 4), r.items)` 重建 feed（状态机回 READY）→ `setTree([])` → `setCurrentProject(r.path)`（侧栏 Project 标题同步）→ 重拉 `listSessions`/`scanTree` 刷新会话卡与文件树 → `log('ok', '[PRJ] 已切换项目 → ' + r.path)` → `setProjectOpen(false)`。
- 失败：`log('err', '[PRJ] …')`，busy 复位，面板保持打开。
- 关闭条件：`projects.length > 0` 时遮罩 mousedown（`target === currentTarget`）与「取消」按钮可关；无最近项目时必须完成一次选择。
- 主进程切换语义（`zion:switch-project`，main.mjs）：同目录快速路径（仅刷新会话指针）；异目录 → 全部旧会话 `dispose()` + sessions Map 清空 + 指针重置 + 新目录 `continueRecent`/新建 + `saveProject`（`~/.pi/agent/zion-projects.json`，`{path, lastUsed}` 上限 8、最近优先去重）；启动时 `WORKSPACE_DIR` 从 `zion-projects.json[0]` 恢复（重启回到上次项目，无记录/读失败回落默认工作区）——渲染层首屏 `getCurrentSession`/`getProject` 即反映该项目。

**命令面板**（InputBar 本地 state，不入 store；`.palette` 上弹式锚定 `.inputbar`）：
- 数据：mount 预取一次 `window.zion.listCommands()`（`CommandItem[]`；主进程 `zion:list-commands` 聚合扫描 skills+命令，数据源 `skillscan.mjs` 属主进程模块）；失败静默 → 空面板。
- 开合：输入以 `/` 开头且 ≤48 字符时打开；Esc 仅关闭面板（不清输入）。
- 过滤/排序：`name` startsWith 或 includes（不区分大小写）；command 优先 + `localeCompare` 字母序。
- 插入与发送：skill → `运行技能 ${name}：`；command → `/name`。仅改输入框文本，随后与普通输入同路径 `send()` → `window.zion.prompt`。
- 行交互：`role="listbox"/option` + `aria-selected`；↑↓ 循环移动、`onMouseEnter` 同步 active、`onMouseDown` preventDefault 防点击丢焦点；空态 `palette-empty`「无匹配 skill / 命令」。

**扩展 UI 桥管线**（AskDialog.tsx + App.tsx 扩展订阅 effect）：
- 订阅：`onUiAsk` → `setUiAsk`（store 单弹层槽 `uiAsk`，后到覆盖前）；`onUiNotify` → `pushToast` + 3s `setTimeout` 按 message+type 匹配当前队列后 `dismissToast`；effect cleanup 退订两通道。
- 渲染（App 顶层 fragment，fixed 定位）：confirm = 消息 + 确认(`.primary`)/取消；input = placeholder=message，Enter 确定 / Esc 取消（取消=undefined），30ms 延迟聚焦；select = hover 移 active、点击选项即答、无选项显示「（无选项）」，仅取消按钮；遮罩 mousedown（`target===currentTarget`）＝取消。
- 应答：`answer()` 成对执行 `window.zion.uiAnswer(ask.id, result)`（→ `zion:ui-answer` → 主进程 `handleAnswer` 按 id resolve 扩展 Promise）与 `setUiAsk(null)`；取消一律传 undefined。
- 超时兜底在主进程（uibridge.mjs：Promise 表 + timeout/AbortSignal → resolve undefined；`dispatchUi` 于窗口创建时注入，闭包经 `win` 判空）——渲染层不持有任何超时逻辑。

**蠕虫入侵管线**（编辑类工具调用）：
- `tool_execution_start` → `parseEditFromTool`：编辑工具集合 `edit/apply_patch/write/multi_edit/patch/batch_execute`；bash 走写操作启发式（echo/printf 提取文本；目标按重定向 `>>`/`>`（排除 2>&1）→ `sed -i` → `tee` → `cp` → `mv` → `touch` 顺序取，`/dev/null`、`nul` 排除）；`batch_execute` 取首个可解析命令。
- 触发链：`triggerWorm`（同步路径，`wormedRef` 按 toolCallId 去重）→ `normPath`（`\`→`/`、去盘符）→ `matchTreeRow`（`.ft-row[data-path]` 精确或互为后缀）→ 未命中则 `scanTree` 刷新 → `openAncestors` 展开祖先 → 双 rAF 等渲染完成后重试 → 兜底 `.trace[data-toolcall=<id>]` 块行。
- 动画（`releaseWorm`）：Neo 头像嘴部（`.neo-avatar` rect × `MOUTH_X/MOUTH_Y` 比例点）→ L 形路径（先垂直后水平，8px 采样）→ TAIL=18 字符尾随（head 每帧 +3，尾节 35% 概率突变 + 抖动）；目标行可视区外先滚动侧栏居中；开始/结束各调一次 `wormStart`/`wormDone`（含提前返回路径），释放期间 Neo 张嘴。命中 `intrudeRow`：`.breached` 类 900ms 闪烁 + 文件名扰码 620ms 逐字符还原（`.` 不动）；done 回调 → SND.breach + 日志 + `revealEdit(toolCallId)`。
- **diff 卡 reveal-after-hit**：Feed ToolCard 的 DiffCard 渲染受 `revealedEdits` 门控（完整渲染条件见 AGENTS.md 硬约束 3），`glitchIn 0.5s steps(7)` 扫入——语义为"入侵成功后才解密显示"。
- REDUCED：`releaseWorm` 直接命中，跳过动画，done 仍回调。

**diff 数据管线**（store.ts 纯函数）：
- `tryParseOne` 优先级：`patch`（`^[+@ -]` 判定，`@@` 头追踪行号）→ `edits[]` old/new 逐对展开（无行号）→ old/new/oldText/newText/content 公共前后缀朴素 diff → 仅 file 无内容（rows 空）。rows 空时 Feed 门控（`rows.length > 0`）不渲染 diff 卡（DiffCard 空态分支已删，不可达）。
- `upgradeEditFromResult`：仅当该 tool item 已有 `edit` 时生效，`result.patch` 优先于 `result.diff`。
- `MAX_DIFF_ROWS = 200` 截断，防大文件撑爆 feed。

**工具链块参数展开**（toolfmt.ts 纯函数，Feed ToolCard 消费）：
- `.step` 行 `role="button"` + `tabIndex=0` + `aria-expanded`，点击或 Enter/Space 切换 `toggleToolExpand`（store `expandedTools`，toolCallId 键）。
- 展开渲染 `.trace-expand`：`te-title` = `toolExpandTitle`（args.file/path → `工具名 → 路径`，否则仅工具名）+ `<pre>` 全文 = `formatToolArgs`（bash → `command` 全文不截断；batch_execute → `commands[]` 逐行拼接；两者缺 command/commands 时与其余工具一致走 JSON 美化兜底，一律 `slice(0, 2000)`（MAX_JSON））。`pre` 限高 240px 内滚动、`pre-wrap` 防超宽行撑破卡片。（本轮视觉收敛：`.trace-expand` 为 `ui-demo/proto-detail-variants.html` 变体 A——裸文本流，无容器/无边框/无背景，与对话同密度；demo 已折入 styles.css，废弃）

## 接口与依赖

**对外消费**（`window.zion`，ZionAPI，env.d.ts 声明）：`ping` / `prompt`（从不抛错，resolve 为 stopReason）/ `abort` / `steer` / `followUp` / `scanTree` / `listCommands`（命令面板数据，`CommandItem[]`）/ `listSessions` / `getCurrentSession` / `switchSession` / `newSession` / `listProjects`（最近项目 `ProjectInfo[]`）/ `getProject`（当前项目工作目录，`{ path: string }`）/ `browseProject`（原生目录选择，取消返回 null）/ `switchProject`（切换工作目录+会话上下文，返回 `SwitchProjectResult`{path, id, items}）/ `uiAnswer`（扩展对话框应答，取消传 undefined）/ `onUiAsk` / `onUiNotify`（订阅扩展对话框与通知，返回退订函数）/ `renameSession` / `deleteSession`（rename/delete 均返回刷新后的完整会话列表）/ `onAgentEvent`（返回退订函数）/ `onTreeChanged`（工作区文件树变化订阅，Sidebar 经 `mergeTreeOpen` 实时合并展开态）。

**对外不提供**：无公共导出——本模块是终端 UI。

**内部依赖**：zustand 5（`useFeed`）、React 18（StrictMode）、`shared/protocol.ts`（type-only）、`styles.css`（令牌）。构建：vite root=`src/renderer`、outDir=`dist-renderer/`、`server.host=127.0.0.1`（strictPort 5173，vite 8 只绑 IPv6 的坑）。

## 设计决策与权衡

- **4 态状态机 + 两档 FX**（非连续插值）：ADR 0002 明确"不区分首次/持续 busy"，FX 只有 READY/忙碌两档——勿改回 v3 的 rAF 指数衰减。
- **错误回合不加第 5 态**：红日志 + 中止音 + `errored` 标记 + 回 READY（ADR 0002 已知取舍）；`agent_end` 见标记后跳过 reply 音/「回复完成」日志（错误回合不被误报完成）。
- **蠕虫同步触发**（事件回调内而非 useEffect）：防快工具的 `tool_end` 先于 React 渲染到达的时序竞争（App.tsx 头注释明示）。
- **revealedEdits 延迟渲染**：把"动画命中"与"diff 可见"绑定；目标缺失时 done 仍回调，卡片照样出现。
- **bash 写操作启发式**：正则提取目标与文本——复杂链式命令可能漏判、纯 echo 到屏幕可能误判，是权衡而非精确解析。
- **stopReason 运行时判定**：strict 下 AgentMessage 联合无法静态收窄到助手分支，用 cast + 可选链按运行时语义读取。
- **状态栏 token 计数 = 真实 usage**：`turn_end` 的 `usage.totalTokens` 经 `addUsage` 累积（v4 的「delta 字符数 ×2」伪计数已删除）；`applySession`/`reset` 归零。结算行 tokens 同样取该累积（`seenUsage=false` 显示 null），不再有字符近似。
- **标题推导收敛为纯函数**（`title.ts` → store re-export 的 `deriveSessionTitle`，App 启动恢复与 Sidebar 会话卡共用）：两处原为各自内联 `slice(0,22)` 截断且行为不一致（App 不补省略号、不清引号），现统一为 name → firstMessage 智能摘要 → `会话 <id 前 4 位>` 兜底。摘要规则：取首行 → 剥含路径/命令特征的内嵌引号对（消除 `为"D:\\...\\..."` 残尾）与成对包裹引号 → 去前导符号（`- # > * · / \`）→ 22 字符截断 + '…'。改规则只动 `title.ts`（node:test 覆盖）。
- **会话堆叠卡 `--h` 测量**（Sidebar effect，deps `[sessions, currentSessionId]`）：每张 `.scard` 置 `--h = scrollHeight + 2`；CSS `margin-bottom: calc(80px - var(--h, 140px))` 使每卡恒定露出 80px 头部（标题 + 2 行摘要），hover 拉直旋转（`rotate(0) translateY(-4px)`）+ 展开摘要/meta。
- **侧栏分区滚动**（styles.css 注释明示）：`.sidebar` 整栏 `overflow: hidden`，`.core-wrap`/`.side-foot` `flex: none` 固定，会话/项目两区 flex 分割、`.deck`/`#file-tree` 各自 `overflow-y: auto`——列表过长只滚列表区，项目标题行与底部 workspace 行始终可见。
- **统一滚动条**（styles.css）：`*::-webkit-scrollbar` 全局 6px 终端绿胶囊（thumb `#00ff66`/hover `#66ff99`、轨道与角落透明，vision 规格），替代旧 feed/侧栏/term-body 分段 8px 规则——侧栏整栏不滚动，旧 `.sidebar` 规则本就无效；新滚动容器（`.palette`/`.ask-options`/`.pp-list`/`.diff-body` 等）自动同款。
- **对角角标共享 `.corner` 类**（styles.css）：trace/diff/ask-dialog/project-panel 四组件的 8×8 对角角标伪元素收敛为单一 `.corner::before/::after` 规则，组件 JSX 只加 `corner` 类名——新组件要角标只加类名，不复制伪元素块；`.trace`/`.diff` 自身仍需 `position: relative`（类名不复位定位）。
- **`setSessionTitle` 与 `applySession` 分工**：改名当前会话只走 `setSessionTitle`（仅更新 `sessionTitle`，feed/状态机/token 全不动）——`applySession` 会重建 feed，误用会把正在进行的对话内容冲掉。
- **删除是软删除 + 两段确认**：`deleteSession` 为软删（主进程语义，UI 只展示 log），侧栏用「首击确认? + 2.5s 自动复位」防误触；删除当前会话后主进程指针自动落回最近会话，渲染层不自行猜 id，`getCurrentSession` 重拉。
- **日志前端自收集**：`store.logs` 上限 120 行（LOG_MAX），`role="log"`，收起时 `aria-hidden`。
- **交互细节**：焦点归还挂 `mouseup` 而非 `mousedown`（v4 §7.5），且存在非折叠选区（`!isCollapsed`）时跳过归还——mousedown 即抢焦会打断双击选词/单击定位光标，且 focus 可编辑元素会清掉刚建立的选区；mouseup + 选区检测保住拖选/双击选中的文本可复制。豁免 `.ask-mask`/`.project-panel`/`.palette`/`.s-title-edit` 不变；`.side-resizer` 未豁免——点击热区后焦点仍归还 `#cmdline`，键盘调宽须 Tab 聚焦 separator。Enter 在 STREAMING/CANCELLING 时切换为中断而非发送；面板打开且有候选时 Enter/Tab 插入选中项（不回发）。
- **命令面板只插入、不执行**：选中项仅写入输入框、不触发任何行为，回车后与普通输入同路径 `prompt`；命令执行语义归宿主 TUI 层（InputBar 头注释明示），渲染层不维护命令实现，避免两处命令知识漂移。
- **command 优先 + 字母序**：面板 max-height 320px 截断时命令恒在可见区（命令少、skills 多），字母序给稳定预期。
- **启动预取一次**：`listCommands` 主进程聚合扫描较重，仅 mount 调用一次，打开/过滤面板不再查主进程（代价见「已知限制与技术债」）。
- **本地字体替代 Google Fonts**：styles.css 顶部 `@font-face` 引入 `assets/fonts/ShareTechMono-Regular.woff2`（latin 子集 13.5KB，来源 @fontsource/share-tech-mono，font-display: swap），替代 demo（index-v4.html）的 Google Fonts `@import`——离线/墙内可用，「离线字体」未做项闭环；`--font` 回退链不变，latin 子集无 CJK，中文文案走系统字体回退。
- **回合聚合 + 回合级 memo**：TurnView 是渲染边界——流式期间 store 只替换活动回合对象（`edit()` 克隆），历史回合 props/context 全等 → 零重渲染；代价是 store 更新必须遵守「每帧至多一次 + 只换活动回合」纪律（AGENTS.md 硬约束 15）。
- **rAF 合帧队列**：agent 事件每条 IPC 一个宏任务，直接 `set()` 会让长会话下整树重渲染成为主瓶颈；攒 op 队列、rAF flush 把每帧压缩为一次 store 更新。同步路径（`pushUser`）先 drain 保序，`applySession`/`reset` 直接清队防跨会话污染。
- **结算行照常结算**：中断/错误回合也写结算行（标「已中断」/「错误」）——结算行是回合闭环的固定仪式，即使无工具调用/usage 也显示（tokens 显示 null）。
- **thinking 默认折叠**：`<details>` 原生折叠不引入额外状态；「思考中…」由 streaming + 末 entry 判定。
- **注入解码入场一次**：`useEffect` 空依赖（eslint-disable）保证只播一次，OPERATOR 文本更新不重播；DEC 开关与 reduced-motion 都直出原文。
- **液态玻璃分级**：backdrop-filter 昂贵，只开活动回合的卡；历史回合卡静态半透明——长会话 blur 卡数有上界（≤ 活动回合卡数）。
- **凝结雨轨零常驻**：闭环即卸载 canvas、停 rAF，长会话不叠加常驻动画开销；◆ 是卸载后的静态替身。
- **tool_end 迟到回退**：回合闭环后可能仍有迟到 `tool_execution_end`（SDK 时序），`_flush` 在活动回合找不到 run 态 toolCallId 时倒序扫全部回合回退匹配；仍无匹配则丢弃。
- **弹层应答成对（uiAnswer + setUiAsk(null)）**：主进程 `handleAnswer` 按 id 在 Promise 表查找，只关弹层不应答会让扩展阻塞到超时兜底（undefined）才继续——`answer()` 封装了这一对操作，勿拆开。
- **单弹层槽**：`uiAsk` 同时只容一个对话框，新 ask 直接覆盖旧 ask；被覆盖的旧 id 失去应答路径，只能等主进程 timeout 兜底。
- **切换成功后成套刷新（applySwitch，五步见 AGENTS.md 硬约束 14）**：`setTree([])` 先清后拉——不清会残留旧项目文件树；`setCurrentProject(r.path)` 同步侧栏项目名；标题直接用「会话 短码」兜底格式（`SwitchProjectResult` 不含 name/firstMessage，不重推导）。
- **项目面板复用 `.ask-mask` 遮罩**：与 AskDialog 同一模态遮罩类（z-index 90，见 AGENTS.md 硬约束 6）；无互斥逻辑，同时打开时按 DOM 序叠加（ProjectPanel 挂载于 AskDialog 之后，遮罩在上）。
- **最近项目打开时才拉取**：不启动预取、不缓存，每次打开刷新（列表上限 8，代价可忽略）；`listProjects` 失败静默 → 面板退化为仅浏览。
- **侧栏宽度直写 CSS 变量而非 React state**：拖拽期间每帧只改 `.main` 的 style 属性与 aria 值，零组件渲染；持久化只在 pointerup（拖拽）或按键/复位（立即）——拖动过程不写 localStorage。
- **热区独立条而非 sidebar 子元素**：结构原因（`overflow: hidden` 裁剪 + 不盖内部滚动条）见「侧栏调宽」；条自身 `z-index` 须高于 sidebar/console 内容，负 margin 伸出的 4px 命中区才不被邻居压住（数值见 AGENTS.md 硬约束 6 层级表）。
- **键盘调宽补齐可访问性**：WAI-ARIA separator 契约（`role="separator"`/`aria-orientation="vertical"`/`aria-valuenow` 实时同步）+ ←/→（Shift 大步进）/Esc 复位——纯鼠标功能补齐键盘路径（焦点归还未豁免 resizer，见「交互细节」：键盘入口靠 Tab 聚焦）。
- **桥调用点全 `?.` 化**（本批）：所有 `window.zion` 调用点改为可选链或先守卫再直调（App 启动/selectFile、InputBar 预取与 prompt/abort、ProjectPanel 全套、AskDialog `answer`、Sidebar 会话/树）——桥未注入（纯浏览器）时 UI 不崩；与 mockBridge 注入互为双保险（失败模式见下）。

## 不变量、安全边界与失败模式

**不变量**：
- `#rain` 负 z-index 的用途：即使 `#stage` 层叠上下文失效，雨幕也恒在 UI 之下；氛围层均 pointer-events:none，不拦截交互（层级数值见 AGENTS.md 硬约束 6）。
- 状态机终态恒为 READY：`agent_end` / `agent_settled` / `message_end` 错误 / `applySession` / `reset` 均回 READY；busy = `sessionState !== 'READY'`。
- 同一 toolCallId 蠕虫只触发一次（`wormedRef`）；`revealedEdits` 单调累积、永不清空（依赖 toolCallId 全局唯一）。
- 每回合至多一条结算行（`!cur.settle` 守卫）；`activeTurnId` 闭环即置 null；`armed` 被消费后复位。
- 流式期间历史回合对象引用稳定（`turns[tid]` 不变）、`order` 只在新增回合时换引用——TurnView memo 成立的前提。
- 侧栏宽度恒在 `[SIDE_MIN, min(SIDE_MAX, round(innerWidth/2))]`（`clampSide` 收敛）；`--side-w` 只设在 `.main` 元素上，未设时 CSS 回退 232px。
- `applySession`/`reset` 丢弃未 flush 的流式队列（防跨会话污染）；`pushUser` 先同步 drain（OPERATOR 回合落在正确位置）。
- `expandedTools` 随 `applySession` 清空（`reset` 不清——items 已清空，残留键不渲染、无害）。
- `uiAsk`/`toasts`/`projectOpen` 不随 `applySession`/`reset` 清空：弹层、toast 与项目面板跨会话切换残留，直到应答/取消/计时器到期或切换流程显式 `setProjectOpen(false)`。
- `currentProject` 只在 App 启动（`getProject`）与项目切换（`applySwitch`）时更新：会话切换/`applySession`/`reset` 均不改动——它描述工作目录而非会话。
- REDUCED 分支必须在动画路径早期返回且 done 仍执行（蠕虫直接命中）。
- 渲染进程零 Node 访问：所有数据经 ZionAPI 白名单。

**失败模式**：
- 桥未注入（`window.zion` undefined）：调用点 `?.`/守卫不抛错，`useAgentEvents`、扩展 UI 订阅与启动恢复 effect 直接 return（空界面、扩展对话框落空、无项目引导）；纯浏览器直开 vite dev 时 `installMockBridge` 注入 mock（UI 全功能可演示，扩展弹层/toast 为空实现）——Electron 下桥必在，smoke 经 `window.zion.ping` 自检，开发中先查 preload 注入。
- 主进程超时兜底不通知渲染层：timeout 只 resolve 扩展 Promise，弹层保持打开（残留）直到用户点取消/遮罩——无害但可见；单弹层槽被新 ask 覆盖后，旧 Promise 同样只能等超时。
- prompt 错误回合：不抛错（SDK 语义），由 `message_end` stopReason 处理；InputBar 另有 catch 兜底日志。
- `scanTree`/`listSessions`/`switchSession`/`newSession`/`renameSession`/`deleteSession` 失败：各自 catch → `log('err')`，UI 不崩（空列表占位文案）。
- 启动恢复失败：静默 catch，停留在"会话就绪"空态。
- 项目切换失败：`switchProject`/`browseProject` reject（如非法路径）→ `log('err')`、busy 复位、面板保持；`browseProject` 取消 → null → 不切换、面板保持。
- 快速连续工具：`wormedRef` 去重；Feed 只依赖末回合对象 + 状态变化自动滚动到底（用户上翻阅读时位置会被拉回）。
- tool_end 迟到（回合闭环后才到达）：`_flush` 倒序扫全部回合回退匹配，仍无匹配（如 toolCallId 从未入 feed）则丢弃。
- turn_end 迟到（闭环后才到达）：usage 只进状态栏 `tokenCount`，不回溯进结算行（`addUsage` 只查活动回合）。
- AudioContext 未解锁：`tone()` 静默 no-op，首次手势后恢复。
- 目标行不可见（侧栏 `<900px` 隐藏时）：蠕虫落 `.trace` 兜底行。
- `zion.sidebar-w` 读回非数字（`Number.isFinite` 守卫）忽略、回落默认；越界值经 `clampSide` 收敛到区间；拖拽松手在窗口外——监听挂在 window 上，正常收尾持久化。
- 本地字体加载失败：styles.css 顶部 `@font-face` 引用的 `assets/fonts/ShareTechMono-Regular.woff2` 缺失/损坏时，按 `--font` 回退链走 ui-monospace/Courier New；字体声明只在 styles.css 一处，组件一律 `var(--font)`。

## 已知限制与技术债

- 单元测试仅覆盖纯函数层（`deriveSessionTitle`、`toolfmt`、`parseBody`（markdown.test.mjs 8 用例），node:test）；组件、事件管线、store 逻辑无测试（含命令面板键盘交互、AskDialog 三形态与 toast 自动消失，smoke 不查 `.palette`/`.ask-dialog`），UI 回归依赖 typecheck + smoke + e2e。
- AskDialog.tsx 头部注释与实现不完全一致：注释声称的「Esc 取消 / select ↑↓/Enter / confirm danger 强调」实际只有 input 形态的 Esc/Enter 真实存在——select 选项纯鼠标（hover/click，`role="listbox"` 仅是标记），confirm 主按钮为 `.primary`（accent 绿）而非 danger 色；改注释或补实现前先认清现状。
- 会话历史恢复只重建文本回合（无工具卡 / 结算行，`startedAt=0` 不计时）。
- conv-head「上下文 12.4k / 128k」、「主控会话 #0047」、状态栏「TLS 1.3」为硬编码装饰，非真实数据。
- `AgentInfo` 类型保留但 Agent 卡片已移除（侧栏改为会话列表），注释注明供未来 agent 注册表。
- 协议提供 `steer`/`followUp`，UI 未接线；事件流中 steer 相关事件被默认分支忽略。
- 命令面板数据仅启动预取一次（`listCommands`），运行中新增/修改 skills 或命令不刷新，需重启应用。
- Sidebar `.side-foot` 的 `workspace: zion-workspace` 为硬编码文案，切换项目后不随 `WORKSPACE_DIR` 更新（真实项目路径已显示在 `.side-head` 标题，此行待清理）。
- 项目面板无测试覆盖（同组件层现状，smoke 不查 `.project-panel`）。
- mockBridge 是纯演示：回复为模板句，会话/文件树/项目/命令是写死假数据，非真实 agent 行为；`onUiAsk`/`onUiNotify` 为空实现（无扩展弹层演示）；真实交互验证走 smoke + e2e（Electron 环境）。
- 正文 markdown 是极简子集（``` 围栏 + 行内 code/高亮），无标题/列表/链接等扩展——新增语法须同时扩展 markdown.ts 与 markdown.test.mjs。

## 人工补充
