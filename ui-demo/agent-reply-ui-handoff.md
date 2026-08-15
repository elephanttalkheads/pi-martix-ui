# Agent 回复内容 UI 交接清单

> **用途**：供另一个 AI 对 ZION「**agent 回复用户内容的 UI**」做重构/复刻。
> **来源**：`ui-demo/chat-area-handoff.md`（对话区完整清单）按范围提取，值/行号一致；如需全貌（用户消息/日志抽屉/输入区）请回源清单。
> 本清单自包含：每个 UI 区块给出**代码位置 / 出现时机 / 展示内容 / 交互行为 / 关键样式值**。
> 重构目标基准：**主文本 15px（=输入框字号）、辅助文本 12px**（2026-08-15 字体统一已定案）。
> 事实源：`src/renderer/src/`（代码）+ `src/renderer/src/styles.css`（样式）。如与代码冲突，以代码为准。

---

## 0. 范围界定

**包含**（本文档全部区块）：agent 回合消息流——正文 / 思考 / 工具链 / diff 卡 / 结算行 / 雨轨 / 流式光标 / 中断标记。

**不包含**（属其他清单）：operator 回合（用户输入，右对齐）、注入解码动画（OperatorBody，用户消息入场特效）、日志抽屉 `#term`、会话头 `.conv-head`、空态 `.feed-empty`、InputBar、状态栏。

---

## 1. 布局骨架与设计令牌

### 1.1 位置

```
<section class="console">            ← 主区右半（styles.css:450 .console，flex:1 竖排）
  ├─ <Feed />                      ← 对话区 #feed（agent 回复渲染于此，左对齐）
  └─ <InputBar />                  ← 输入区（不在范围，勿动）
```

- App.tsx 布局装配：`#stage > .main > (sidebar + section.console)`。
- `#feed`：`aria-live="polite"`；滚动 = 末回合内容或 sessionState 变化时 `scrollTop = scrollHeight`（Feed.tsx:230-234）。

### 1.2 设计令牌（styles.css:29-42，重构时直接引用，**不得改动变量本身**）

| 变量 | 值 | 用途 |
|---|---|---|
| `--surface` | `rgba(2,18,9,0.92)` | 对话区底 |
| `--surface-2` | `rgba(3,26,13,0.94)` | 头部/输入区底 |
| `--text-primary` | `#3dff8f` | 正文 |
| `--text-secondary` | `#23c468` | 次级（工具链描述等） |
| `--text-tertiary` | `#1da754` | 弱化（时间戳/标签） |
| `--accent` | `#00ff41` | 强调（光标/符号） |
| `--accent-muted` | `#14b850` | 柔和强调（雨轨封印/完成状态） |
| `--bright` | `#c2ffd9` | 高亮词/亮头 |
| `--warning` | `#ffb000` | 执行中/警告 |
| `--danger` | `#ff5555` | 失败/删除/中断 |
| `--border` | `rgba(61,255,143,0.18)` | 所有描边 |
| `--font` | `"Share Tech Mono", ui-monospace, "Courier New", "Sarasa Term SC", "Microsoft YaHei", monospace` | 全局等宽字体 |

公共视觉语言：`::selection` = `rgba(0,255,102,0.22)` 底 + 白字（styles.css:483）；`:focus-visible` = 1px accent outline；入场动画 `blockIn`（0.2s 上移 6px 淡入，styles.css:491）；`prefers-reduced-motion: reduce` 时关全部动画/过渡（styles.css:791 起）。

---

## 2. 渲染架构（重构务必保留）

回合化：`TurnView` 是 `React.memo` 边界（Feed.tsx:186）。store 只替换活动回合对象 → 历史回合零重渲染。`Feed` 从 store 读 `order: string[]` + `turns: Record<string, Turn>` + `sessionState` + `activeTurnId`，按 order 映射 `<TurnView id active streaming>`（`streaming = sessionState==='STREAMING' && tid===activeTurnId`）。

agent 回合数据形状（store.ts）：

```ts
{ id: string; kind: 'agent'; time: string;
  content: TurnEntry[];            // text/thinking/tool 按到达保序
  interrupted?: boolean; startedAt: number;
  tokens: number; seenUsage: boolean; settle?: TurnSettle }
// TurnEntry = TurnSegment | TurnTool
// TurnSegment = { id, kind:'text'|'thinking', text, time }
// TurnTool    = { id; kind:'tool'; toolCallId; toolName; args?; status:'run'|'ok'|'err'; time; startAt; dur?; edit?: EditInfo }
// TurnSettle  = { tools: number; tokens: number|null; dur: number; outcome:'ok'|'interrupted'|'error' }
```

---

## 3. Agent 回复 UI 区块

### 3.1 消息块 `.msg`（agent 分支，回复正文）

| 项 | 值 |
|---|---|
| 代码 | Feed.tsx:204-222（agent 分支）；样式 styles.css:490-519 |
| 出现时机 | agent 回合内**每个 text 段**一条（左对齐，头部显示 `sessionTitle`） |
| 内容 | 头部（`.msg-head`：label + `.m-time` 时间戳 HH:MM:SS）+ 正文（`.msg-body`） |
| 样式 | `.msg` margin-bottom 20px、max-width 820px、`blockIn` 入场；`.msg-head` 11px uppercase 0.14em 字距；`.msg-body` **15px**、行高 1.8、pre-wrap、`text-align: left` |
| 子元素 | `.hl`（【高亮词】→ `--bright`）、行内 `code`（13px、`rgba(61,255,143,0.08)` 底 + 1px border）、`.msg-code`（``` 围栏代码块：13px、左侧 1px 弱线、无背景无边框，styles.css:507-511） |

### 3.2 思考块 `.think`（agent 思维链）

- 代码 Feed.tsx:216-222；样式 styles.css:547-561。
- **出现时机**：agent 回合内每个 thinking 段（SDK thinking_start/delta/end 合并）；`streaming` 且为末段时 summary 后缀「· 思考中…」。
- **内容**：`<details>` 折叠——summary「思路 ▸/▾」（默认折叠），展开显示 `.think-body`（左侧 1px **虚线** border、`--text-tertiary`、13px、行高 1.7）。
- summary 无默认 marker，`::before` 三角 13px。

### 3.3 工具链块 `.trace`（agent 工具调用记录）

| 项 | 值 |
|---|---|
| 代码 | Feed.tsx:101-154 `ToolCard`（memo）；样式 styles.css:585-609（液态玻璃 + 角标） |
| 出现时机 | agent 回合内每个工具调用（`TurnTool` 条目），**保序**出现在 content 流中 |
| 内容 | 头部「工具链 · 1 步」（11px uppercase）；`.step` 行 = `[toolName]` 标签 + 描述（toolDesc：file/path/command(截60)/text/question 优先）+ 右侧状态 `.st`（执行中… `--warning` / 失败 `--danger` / `完成 · X.Xs` `--accent-muted`，耗时 = tool_execution_end 写入的 `dur`） |
| 交互 | `.step` 可点击/Enter/空格展开（`role="button"` + `aria-expanded`）；展开区 `.trace-expand`：标题（toolExpandTitle）+ 参数全文 `<pre>`（13px、max-height 240px 滚动） |
| 液态玻璃 | `.trace/.diff` 共享背景 = 155deg 绿色渐变 + `rgba(2,14,7,0.5)` + 内阴影（顶 1px 亮线/底 1px 暗线/左 1px 微光 + 外 22px 绿辉）；**仅活动回合的卡**开 `backdrop-filter: blur(9px) saturate(1.25) brightness(1.05)`（性能分级） |
| 角标 | `.corner` 共享 8×8 对角定位线（左上/右下各 1px `--accent-muted`，styles.css:578-583） |
| 涟漪 | 工具收尾（run→ok/err）挂载 `.ripple`：1px 亮边圈 0.7s 放大淡出 + blur（styles.css:667-673） |

### 3.4 diff 卡 `.diff`（agent 编辑结果）

| 项 | 值 |
|---|---|
| 代码 | `DiffCard.tsx`（34 行）；样式 styles.css:612-648（+ 玻璃同 3.3） |
| 出现时机 | 编辑类工具（edit/write）且**蠕虫已命中该卡**（store `revealedEdits[toolCallId]` 为 true 才渲染——**勿改此门控语义**）；edit 的 edits[]/patch、write 的 content、end 事件 result.patch 升级 |
| 内容 | 头部：`✎ 文件名` + 统计 `+N −M`（plus=`--accent-muted`/minus=`--danger`）+ `MODIFIED` 徽标（`--warning` uppercase）；正文 diff 行：行号列（44px 右对齐 `--text-tertiary`，null 留空）+ 符号列（14px 居中，增 `+` 删 `−` 上下文空）+ 代码列 |
| 行色 | 增 `rgba(61,255,143,0.07)` 底 + `--accent` 符号；删 `rgba(255,85,85,0.08)` 底 + `#e89a9a` 文本 + `--danger` 符号；上下文 `--text-secondary`（符号透明） |
| 动画 | 入场 `glitchIn` 0.5s steps(7) 从左到右裁切入（`.diff.reveal`，styles.css:639-641） |
| 交互 | `.diff-body` 横向滚动（overflow-x: auto） |

### 3.5 结算行 `.settle`（回合闭环摘要）

- 代码 Feed.tsx:223-235；样式 styles.css:565-575。
- **出现时机**：agent 回合闭环时（`turn.settle` 存在），位于回合末尾。
- **内容**：`◆` 封印 + 文案（已结算/已中断/已结算·错误…）+ `· N tools` + `· N tok`（seenUsage=false 时 null）+ `· X.Xs`；右侧 1px 横线延伸（`::after` flex:1）。
- 样式：12px、`--text-tertiary`、0.1em 字距、`blockIn` 0.3s；`interrupted/error` 变 `--danger`。

### 3.6 凝结雨轨 `.rail`（活动回合装饰）

| 项 | 值 |
|---|---|
| 代码 | `TurnRail.tsx`（34 行）；样式 styles.css:531-542 |
| 出现时机 | 活动（未闭环）agent 回合左侧；回合闭环后卸载 canvas、凝为 `◆`（`.seal`，`sealIn` 0.5s 下落淡入） |
| 内容 | 26px 宽竖轨（左边 1px `--border` 线），内一枚 canvas 迷你数字雨：2 列字符下落、`destination-out` 拖尾（透明消退，不积黑条）、字体 11px Matrix Code、亮头概率 8% `--bright`、帧节流 `90 / fx.speed` ms |
| 交互 | `pointer-events: none`（纯装饰，不拦截拖选/点击） |
| 注意 | 组件卸载即停 rAF（长会话零常驻开销）；reduced-motion 只画一帧静态雨 |

### 3.7 流式光标与中断标记

| 元素 | 代码 | 时机/内容 | 样式 |
|---|---|---|---|
| 流式光标 `.caret` | Feed.tsx:218-220 | `streaming && entry.id===lastEntry.id` 时正文尾部 8px 宽绿色块，`blink` 0.9s step-end 闪烁 | styles.css:515-517 |
| 中断标记 `.aborted` | Feed.tsx:213-215 | `turn.interrupted && entry.id===lastTextId`（末条文本段）尾部追加 ` [已被操作员中断]`（`--danger`） | styles.css:512 |

---

## 4. Agent 回合行为时序（重构不得破坏）

1. **回合创建**：`agent_start` 创建 agent 回合（激活）→ 雨轨挂载。
2. **流式正文**：`message_update` 按到达保序追加 text/thinking 段 → `.msg`/`.think` 即时渲染；流式光标挂在末段。
3. **工具调用**：`tool_execution_start/end` 生成/更新工具卡（end 写 `dur`、可升级 `edit`）→ `.step` 状态 run→ok/err + 涟漪。
4. **diff 卡门控**：`revealedEdits[toolCallId]` 由蠕虫动画（SignalCanvas 一次性写入信号）命中后置 true；**前置 true 不渲染 diff 卡**（Feed.tsx:149 条件）。
5. **回合闭环**：`agent_end` 写 `settle`、`activeTurnId` 清空 → 雨轨凝 ◆、结算行入场、光标消失。
6. **中断**：`interrupted` 时末条 text 段追加 `.aborted` 标记；结算行 `--danger`。
7. **reduced-motion**（styles.css:797 起）：`.msg/.trace/.diff/.diff.reveal/.settle/.rail .seal/.ripple/.caret` 动画全关；TurnRail 只画静态帧。

---

## 5. 重构自检清单（完成标准）

- [ ] agent 消息流保留回合化 + memo 边界（历史回合不重渲染）
- [ ] `.msg-body` 主文本 **15px**；头部/时间戳/结算行辅助 **12px**；代码块/工具链/思考体 13px
- [ ] 正文子元素齐全：`.hl` 高亮词 / 行内 code / `.msg-code` 围栏代码块
- [ ] 思考块 `<details>` 折叠默认收起，streaming 末段「· 思考中…」
- [ ] 工具链卡：保序、状态着色（warning/danger/accent-muted）、展开参数、涟漪收尾
- [ ] diff 卡：revealedEdits 门控 + 符号/色彩双编码 + `+N −M` + MODIFIED 徽标 + glitchIn 扫入
- [ ] 结算行：◆ 封印 + tools/tok/dur 统计 + interrupted/error 红色变体
- [ ] 雨轨：活动态 canvas / 闭环凝 ◆ / reduced-motion 静态帧
- [ ] 光标 blink + 中断标记仅末条 text 段
- [ ] 液态玻璃只对活动回合卡开 backdrop-filter；reduced-motion 无残留动画
