# 对话区 + 日志抽屉 UI 交接清单

> **用途**：供另一个 AI 对 ZION 的「对话区（主控会话消息流）+ 日志抽屉」做 UI 重构。
> 本清单自包含：每个 UI 区块给出**代码位置 / 出现时机 / 展示内容 / 交互行为 / 关键样式值**。
> 重构目标基准：**主文本 15px（=输入框字号）、辅助文本 12px**（2026-08-15 字体统一已定案）。
> 事实源：`src/renderer/src/`（代码）+ `src/renderer/src/styles.css`（样式）。如与代码冲突，以代码为准。

---

## 0. 布局结构（重构时保持的 DOM 骨架）

```
<section class="console">                    ← 主区右半（styles.css:450 .console，flex:1 竖排）
  ├─ <div class="conv-head">                 ← 会话头部条（styles.css:451）
  ├─ <Feed />                              ← 对话区 #feed（本清单核心）
  └─ <InputBar />                          ← 输入区（不在本次重构范围，勿动）
<LogDrawer open={termOpen} />                 ← 日志抽屉 #term（App.tsx:442，console 的兄弟节点）
<footer class="statusbar">                    ← 状态栏（含日志开合按钮 .st-btn，App.tsx:458-464）
```

- App.tsx 布局装配：`#stage > .main > (sidebar + section.console)`，LogDrawer/statusbar 是 `.main` 的兄弟（`#stage` 直下）。
- 状态：`termOpen` 是 App.tsx 的 `useState`（App.tsx:255），经 prop `open` 传入 LogDrawer；状态栏按钮 `onClick` 切换并写日志（App.tsx:458-464）。
- 样式依赖：`--surface/--surface-2/--text-primary/-secondary/-tertiary/--accent/--accent-muted/--bright/--warning/--danger/--border/--font`（styles.css:29-42，见 §1 令牌表）。**重构不得改动这些变量本身**，只消费。

---

## 1. 设计令牌（styles.css:29-42，重构时直接引用）

| 变量 | 值 | 用途 |
|---|---|---|
| `--surface` | `rgba(2,18,9,0.92)` | 对话区底 |
| `--surface-2` | `rgba(3,26,13,0.94)` | 头部/抽屉/输入区底 |
| `--text-primary` | `#3dff8f` | 正文 |
| `--text-secondary` | `#23c468` | 次级（工具链描述等） |
| `--text-tertiary` | `#1da754` | 弱化（时间戳/标签/空态） |
| `--accent` | `#00ff41` | 强调（光标/符号/当前） |
| `--accent-muted` | `#14b850` | 柔和强调（雨轨封印/成功状态） |
| `--bright` | `#c2ffd9` | 高亮词/亮头 |
| `--warning` | `#ffb000` | 执行中/警告 |
| `--danger` | `#ff5555` | 失败/删除/中断 |
| `--border` | `rgba(61,255,143,0.18)` | 所有描边 |
| `--font` | `"Share Tech Mono", ui-monospace, "Courier New", "Sarasa Term SC", "Microsoft YaHei", monospace` | 全局等宽字体 |

公共视觉语言：拖选高亮 `::selection` = `rgba(0,255,102,0.22)` 底 + 白字（styles.css:483）；`:focus-visible` = 1px accent outline；所有入场动画 `blockIn`（0.2s 上移 6px 淡入，styles.css:491）；`prefers-reduced-motion: reduce` 时关全部动画/过渡（styles.css:791 起，详见 §6）。

---

## 2. 对话区（Feed，`src/renderer/src/components/Feed.tsx`，240 行）

容器 `#feed`：`aria-live="polite"`；滚动逻辑 = 末回合内容或 sessionState 变化时 `scrollTop = scrollHeight`（Feed.tsx:230-234）；空态 `#feed > .feed-empty`。

**渲染架构（重构务必保留）**：回合化（`TurnView` 是 `React.memo` 边界，Feed.tsx:186）。store 只替换活动回合对象 → 历史回合零重渲染。`Feed` 从 store 读 `order: string[]` + `turns: Record<string, Turn>` + `sessionState` + `activeTurnId`，按 order 映射 `<TurnView id active streaming>`（`streaming = sessionState==='STREAMING' && tid===activeTurnId`）。

### 2.1 消息块 `.msg`（Feed.tsx:66-71 operator / 204-222 agent）

| 项 | 值 |
|---|---|
| 代码 | Feed.tsx `TurnView` 内；样式 styles.css:490-519 |
| 出现时机 | operator 回合：每次用户输入执行即生成一条（右对齐）；agent 回合：每个 text 段一条（左对齐，头显 `sessionTitle`） |
| 内容 | 头部（`.msg-head`：label + `.m-time` 时间戳 HH:MM:SS）+ 正文（`.msg-body`） |
| 样式 | `.msg` margin-bottom 20px、max-width 820px、`blockIn` 入场；`.msg-head` 11px uppercase 0.14em 字距（operator 右对齐）；`.msg-body` **15px**、行高 1.8、pre-wrap、`text-align: right`（仅 user） |
| 子元素 | `.hl`（【高亮词】→ `--bright`）、行内 `code`（13px、`rgba(61,255,143,0.08)` 底 + 1px border）、`.msg-code`（``` 围栏代码块：13px、左侧 1px 弱线、无背景无边框，styles.css:507-511）、`.aborted`（`--danger`，中断标记）、`.decoding`（解码中，Matrix Code 字体）、`.caret`（流式光标） |

### 2.2 注入解码动画（operator 正文入场，Feed.tsx:8-58 `OperatorBody`）

- **出现时机**：operator 消息入场**仅播一次**（约 450ms 内，时长 `min(700, 240+len*6)`ms）；`decOn`（store 的 DEC 开关）关闭或 reduced-motion 时直接渲染正文。
- **行为**：假名乱码逐位还原——按进度 `locked = floor(p * len)` 锁定前缀，未锁字符随机取 `MATRIX_CHARS`（matrixGlyphs.ts）；空格/换行不参与乱码；完成后交给 `Body` 做 code/高亮解析。`decoding` 类 = `"Matrix Code", var(--font)`。
- 重构注意：**不得重播**（text 变化不重置，effect 只挂一次）。

### 2.3 凝结雨轨 `.rail`（TurnRail.tsx，34 行）

| 项 | 值 |
|---|---|
| 代码 | `src/renderer/src/components/TurnRail.tsx`；样式 styles.css:531-542 |
| 出现时机 | 活动（未闭环）agent 回合左侧；回合闭环后卸载 canvas、凝为 `◆`（`.seal`，`sealIn` 0.5s 下落淡入） |
| 内容 | 26px 宽竖轨（左边 1px `--border` 线），内一枚 canvas 迷你数字雨：2 列字符下落、`destination-out` 拖尾（透明消退，不积黑条）、字体 11px Matrix Code、亮头概率 8% `--bright`、帧节流 `90 / fx.speed` ms |
| 交互 | `pointer-events: none`（纯装饰，不拦截拖选/点击） |
| 注意 | 组件卸载即停 rAF（长会话零常驻开销）；reduced-motion 只画一帧静态雨 |

### 2.4 思考块 `.think`（Feed.tsx:216-222）

- **出现时机**：agent 回合内每个 thinking 段（SDK thinking_start/delta/end 合并）；`streaming` 且为末段时 summary 后缀「· 思考中…」。
- **内容**：`<details>` 折叠——summary「思路 ▸/▾」（默认折叠），展开显示 `.think-body`（左侧 1px **虚线** border、`--text-tertiary`、13px、行高 1.7）。
- 样式 styles.css:547-561：summary 无默认 marker，`::before` 三角 13px。

### 2.5 工具链块 `.trace`（Feed.tsx:101-154 `ToolCard`）

| 项 | 值 |
|---|---|
| 代码 | Feed.tsx `ToolCard`（memo）；样式 styles.css:585-609（液态玻璃 + 角标） |
| 出现时机 | agent 回合内每个工具调用（`TurnTool` 条目），保序出现在 content 流中 |
| 内容 | 头部「工具链 · 1 步」（11px uppercase）；`.step` 行 = `[toolName]` 标签 + 描述（toolDesc：file/path/command(截60)/text/question 优先）+ 右侧状态 `.st`（执行中… `--warning` / 失败 `--danger` / `完成 · X.Xs` `--accent-muted`，耗时 = tool_execution_end 写入的 `dur`） |
| 交互 | `.step` 可点击/Enter/空格展开（`role="button"` + `aria-expanded`）；展开区 `.trace-expand`：标题（toolExpandTitle）+ 参数全文 `<pre>`（13px、max-height 240px 滚动） |
| 液态玻璃 | `.trace/.diff` 共享背景 = 155deg 绿色渐变 + `rgba(2,14,7,0.5)` + 内阴影（顶 1px 亮线/底 1px 暗线/左 1px 微光 + 外 22px 绿辉）；**仅活动回合的卡**开 `backdrop-filter: blur(9px) saturate(1.25) brightness(1.05)`（性能分级） |
| 角标 | `.corner` 共享 8×8 对角定位线（左上/右下各 1px `--accent-muted`，styles.css:578-583） |
| 涟漪 | 工具收尾（run→ok/err）挂载 `.ripple`：1px 亮边圈 0.7s 放大淡出 + blur（styles.css:667-673） |

### 2.6 diff 卡 `.diff`（DiffCard.tsx，34 行）

| 项 | 值 |
|---|---|
| 代码 | `src/renderer/src/components/DiffCard.tsx`；样式 styles.css:612-648（+ 玻璃同上） |
| 出现时机 | 编辑类工具（edit/write）且**蠕虫已命中该卡**（store `revealedEdits[toolCallId]` 为 true 才渲染——重构勿改此门控语义）；edit 的 edits[]/patch、write 的 content、end 事件 result.patch 升级 |
| 内容 | 头部：`✎ 文件名` + 统计 `+N −M`（plus=`--accent-muted`/minus=`--danger`）+ `MODIFIED` 徽标（`--warning` uppercase）；正文 diff 行：行号列（44px 右对齐 `--text-tertiary`，null 留空）+ 符号列（14px 居中，增 `+` 删 `−` 上下文空）+ 代码列 |
| 行色 | 增 `rgba(61,255,143,0.07)` 底 + `--accent` 符号；删 `rgba(255,85,85,0.08)` 底 + `#e89a9a` 文本 + `--danger` 符号；上下文 `--text-secondary`（符号透明） |
| 动画 | 入场 `glitchIn` 0.5s steps(7) 从左到右裁切入（`.diff.reveal`，styles.css:639-641） |
| 交互 | `.diff-body` 横向滚动（overflow-x: auto） |

### 2.7 结算行 `.settle`（Feed.tsx:223-235）

- **出现时机**：agent 回合闭环时（`turn.settle` 存在）显示，位于回合末尾。
- **内容**：`◆` 封印 + 文案（已结算/已中断/已结算·错误…）+ `· N tools` + `· N tok`（seenUsage=false 时 null）+ `· X.Xs`；右侧 1px 横线延伸（`::after` flex:1）。
- 样式 styles.css:565-575：12px、`--text-tertiary`、0.1em 字距、`blockIn` 0.3s；`interrupted/error` 变 `--danger`。

### 2.8 其他对话区元素

| 元素 | 代码 | 时机/内容 | 样式 |
|---|---|---|---|
| 流式光标 `.caret` | Feed.tsx:218-220 | `streaming && entry.id===lastEntry.id` 时正文尾部 8px 宽绿色块，`blink` 0.9s step-end 闪烁 | styles.css:515-517 |
| 中断标记 `.aborted` | Feed.tsx:213-215 | `turn.interrupted && entry.id===lastTextId`（末条文本段）尾部追加 ` [已被操作员中断]`（`--danger`） | styles.css:512 |
| 空态 `.feed-empty` | Feed.tsx:238 | `order.length===0`：「ZION :: 会话就绪。输入指令开始。」 | 12px `--text-tertiary` 0.08em |
| 会话头 `.conv-head` | App.tsx:430-439 | 「主控会话 #0047」标题 + `SESS:` chip + 状态 chip（READY=on 绿/warn）+ 上下文用量 chip | styles.css:451-462：12px 底条、`.c-title` 13px 0.12em、`.chip` 11px 0.16em 1px border |

### 2.9 markdown 解析（正文渲染依赖，重构时用现成 `parseBody`）

- `src/renderer/src/markdown.ts`：`parseBody(text) → BodyPart[]`，`BodyPart = { k: 'f'|'c'|'h'|'t', v }`（代码块/行内 code/【高亮词】/纯文本），纯函数、单测覆盖（scripts/markdown.test.mjs）。
- `src/renderer/src/toolfmt.ts`：`formatToolArgs(toolName, args)` 参数摘要 + `toolExpandTitle` 展开标题。
- **不要重构这两个纯函数**；重构只消费其输出。

---

## 3. 日志抽屉（`src/renderer/src/components/LogDrawer.tsx`，22 行）

| 项 | 值 |
|---|---|
| 代码 | LogDrawer.tsx；样式 styles.css:750-769 |
| 出现时机 | 默认**收起**（`height:0` 不占位）；状态栏「日志 ▾」按钮展开 → 150px 高 + 1px 顶边（transition height 0.22s ease-out）；`aria-hidden` 随 open 切换 |
| 内容 | 头部条（`.term-head`：11px uppercase「运行日志」+「stdout / stderr 合并」）+ `#term-body`（118px 滚动区）：`[HH:MM:SS] 文本` 逐行，按 level 着色 |
| 数据 | store `logs: LogLine[]`（`{ time, level: 'ok'|'err'|'warn'|'dim', text }`，store.ts:11-15），**前端自收集**（事件流 + 状态变迁 + 蠕虫/命中日志），上限 120 行（`LOG_MAX`，store.ts:131 附近 `slice(-LOG_MAX)`） |
| 自动滚动 | `logs.length` 或 open 变化时 `scrollTop = scrollHeight` |
| 行色 | `.t-ok`=`--accent-muted`、`.t-err`=`--danger`、`.t-warn`=`--warning`、`.t-dim`=`--text-tertiary`；空态「（尚无日志）」 |
| 字号 | `#term-body` 12.5px、行高 1.7（**本次字体统一未动它，重构时可归一到 12px 辅助档**） |

### 3.1 触发按钮（状态栏，App.tsx:458-464 + styles.css:783-784）

- `.statusbar` 右侧 `.st-btn`（`font-family: var(--font)` 12px 0.06em、无边框透明底、hover 变 `--text-primary`，styles.css:782-783）：文案「日志 ▴/▾」随 open 切换箭头，`aria-expanded={termOpen}`。
- 点击 → `setTermOpen(!termOpen)` + `log('dim', '[LOG] 日志抽屉 收起/展开')`。
- **重构必须保留这条触发链**（按钮 → termOpen → LogDrawer open prop），否则抽屉无法开合。

---

## 4. 数据模型（store.ts，重构时保持形状）

```ts
// 回合（feed 聚合单元；memo 边界）
type Turn =
  | { id: string; kind: 'operator'; text: string; time: string }        // 用户输入
  | { id: string; kind: 'agent'; time: string;
      content: TurnEntry[];            // text/thinking/tool 按到达保序
      interrupted?: boolean; startedAt: number;
      tokens: number; seenUsage: boolean; settle?: TurnSettle };

type TurnEntry = TurnSegment | TurnTool;   // TurnSegment = { id, kind:'text'|'thinking', text, time }
interface TurnTool { id; kind:'tool'; toolCallId; toolName; args?; status: 'run'|'ok'|'err'; time; startAt; dur?; edit?: EditInfo }
interface TurnSettle { tools: number; tokens: number|null; dur: number; outcome: 'ok'|'interrupted'|'error' }
interface DiffRow  { t: '+'|'-'|' '; n: string|null; c: string }         // diff 卡行
interface EditInfo { file: string; rows: DiffRow[] }                     // 编辑类工具 → diff 卡
interface LogLine  { time: string; level: 'ok'|'err'|'warn'|'dim'; text: string }
```

store 相关订阅：`order` / `turns` / `activeTurnId` / `sessionState` / `sessionTitle` / `decOn` / `expandedTools` / `revealedEdits` / `logs`（`useFeed` selector 按需取，见 Feed.tsx 各组件顶部）。

---

## 5. 行为时序（重构不得破坏）

1. **回合边界**：`agent_start` 创建 agent 回合（激活）→ `message_update` 流式追加 text/thinking → `tool_execution_start/end` 生成/更新工具卡（end 写 `dur`、可升级 `edit`）→ `agent_end` 闭环（写 `settle`、`activeTurnId` 清空）→ 雨轨凝 ◆、结算行入场。
2. **diff 卡门控**：`revealedEdits[toolCallId]` 由蠕虫动画（SignalCanvas 一次性写入信号，目标=文件树行）命中后置 true；**前置 true 不渲染 diff 卡**（Feed.tsx:149 条件）。
3. **注入解码**：仅 operator 入场一次；DEC 关闭/reduced-motion 直接正文。
4. **流式光标**：仅 `streaming && entry.id === lastEntry.id`；中断标记仅末条 text 段。
5. **自动滚动**：Feed 只看末回合对象变化（`lastTurn`）+ sessionState；LogDrawer 看 logs.length + open。
6. **reduced-motion**（styles.css:797 起）：`.msg/.trace/.diff/.diff.reveal/.settle/.rail .seal/.ripple/.caret` 动画全关；`.term` 过渡关；TurnRail 只画静态帧；OperatorBody 跳过解码。

---

## 6. 重构自检清单（完成标准）

- [ ] 对话区保留回合化 + memo 边界（历史回合不重渲染）
- [ ] `.msg-body` 主文本 15px；辅助（头部/时间戳/空态/结算行）12px；代码块/工具链 13px
- [ ] 雨轨活动态 canvas / 闭环凝 ◆ / reduced-motion 静态帧
- [ ] diff 卡：revealedEdits 门控 + 符号/色彩双编码 + glitchIn 扫入
- [ ] 液态玻璃只对活动回合卡开 backdrop-filter
- [ ] 日志抽屉：默认收起、150px 展开、120 行上限、level 着色、状态栏按钮触发链完整
- [ ] reduced-motion 下无残留动画
- [ ] 空态/无日志占位文案保留
