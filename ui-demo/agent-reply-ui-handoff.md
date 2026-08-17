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

### 3.1 消息块 `.msg`（agent 分支，回复正文）—— 亮度波显影（3.1A，已落地）

| 项 | 值 |
|---|---|
| 代码 | Feed.tsx（agent text 分支）；样式 styles.css `.msg` 段 |
| 出现时机 | agent 回合内**每个 text 段**一条（左对齐，头部显示 `sessionTitle`） |
| 内容 | 头部（`.msg-head`：信号源菱形 `.origin` + label + `.m-time` 时间戳 HH:MM）+ 正文（`.msg-body`） |
| 样式 | `.msg` margin-bottom 20px、max-width 820px、`blockIn` 入场；`.msg-head` 12px uppercase 0.14em 字距；`.msg-body` **15px**、行高 1.8、pre-wrap |
| 显影 | 段 mount 播一次亮度波显影（`.develop` 0.85s：暗+微糊就位 → 55% 波峰近白 → 落定磷光绿）；**流式追加不重播**（元素持久，动画只跑一次）；`.origin` 菱形 ping 0.9s 一圈。历史回合（`.turn-agent.historical`）不播 |
| 子元素 | `.hl`（【高亮词】→ `--bright`）、行内 `code`（13px、`rgba(61,255,143,0.08)` 底 + 1px border）、`.msg-code`（``` 围栏代码块：13px、左侧 1px 弱线、无背景无边框） |

### 3.2 思考块 `.think`（agent 思维链）—— 脑波褶（3.2A，已落地）

- 代码 Feed.tsx（thinking 分支，EEG_PATH 常量）；样式 styles.css `.think` 段。
- **出现时机**：agent 回合内每个 thinking 段；`streaming` 且为末段时挂 `.streaming`：summary 显示「· 思考中…」+ 脑波活体化。
- **内容**：`<details>` 折叠——summary「思路 ▸/▾」（默认折叠，12px uppercase）+ EEG 折线（`.eeg` SVG 72×14；streaming 时 `eegflow` 0.8s 流动 + `eegamp` 1.6s 振幅呼吸，accent 色；静止态 `--text-tertiary` 灰线）。
- **沉降梯度**：思考体按 `\n` 切行渲染 `.tl`，末 5 行 `nth-last-child` 反向梯度 1→0.38（越新越亮，旧念头自然变暗），更早行统一 0.38。
- 展开体 `.think-body`：左侧 1px **虚线** border、`--text-tertiary`、13px、行高 1.7；summary 无默认 marker，`::before` 三角 rotate 90°。

### 3.3 工具链块 `.trace`（agent 工具调用记录）—— 机械继电器（3.3C，已落地）

| 项 | 值 |
|---|---|
| 代码 | Feed.tsx `ToolCard`（memo）；样式 styles.css `.trace.track` 段 |
| 出现时机 | agent 回合内每个工具调用（`TurnTool` 条目），**保序**出现在 content 流中 |
| 结构 | DIN 导轨 `.trace.track`（上下 1px 缘线 + 34px 周期凹槽纹理）包一枚继电器单元 `.unit`（每工具卡一条独立导轨，不跨条目合并） |
| 单元 | 触点 LED `.contact` 三态（run 琥珀 `coil` 0.8s 线圈呼吸 / ok 绿 + `clack` 0.3s 冲击波（class 切换即播一次）/ err 红）+ `.urest`（`.tname` `[toolName]` + `.desc` 描述：file/path/command(截60)/text/question 优先）+ `.dur` 数码管读数（边框小窗：run「执行中…」琥珀 / ok「X.Xs」`--accent-muted` / err「失败」`--danger`） |
| 交互 | `.unit` 可点击/Enter/空格展开（`role="button"` + `aria-expanded`）；参数抽屉 `.trace-expand`：标题（toolExpandTitle）+ 参数全文 `<pre>`（13px、max-height 240px 滚动） |
| 挂钩 | `.trace[data-toolcall]` 保留为蠕虫缺省目标（App.tsx triggerWorm 选择器） |
| 已退役 | 液态玻璃背景/角标/凝结涟漪（收尾语义由 clack 冲击波接替；`.corner` 仍供弹层使用） |

### 3.4 diff 卡 `.diff`（agent 编辑结果）—— 烧录显影（3.4A，已落地）

| 项 | 值 |
|---|---|
| 代码 | `DiffCard.tsx`；样式 styles.css `.diff` 段 |
| 出现时机 | 编辑类工具且**蠕虫已命中该卡**（store `revealedEdits[toolCallId]` 为 true 才渲染——**勿改此门控语义**）；edit 的 edits[]/patch、write 的 content、end 事件 result.patch 升级 |
| 内容 | 头部 `.dhead`：`✎ 文件名` + `+N`（`.plus` `--accent-muted`）+ `−M`（`.minus` `--danger`）+ `MODIFIED` 徽标（`.mod` `--warning` uppercase）；正文 `.dl` 行：行号列 `.ln-no`（44px 右对齐 `--text-tertiary`，null 留空）+ 符号列 `.ln-sign`（14px 居中，增 `+` 删 `−` 上下文 `·` 透明）+ 代码列 `.ln-code` |
| 烧录 | 新增行：白热闪光 → 冷却成绿（`burn`/`cool` 0.9s，`both`）；删除行：红闪 → 45% 余烬（`char` 1.1s；**基态即余烬**）；行级阶梯 90ms/行、**封顶 30 行**（长 diff 不惩罚），delay 内联在行元素上 |
| 校验环 | 全部行落定后 `.ring` SVG 边框自绘一周（`viewBox 100×100` + `pathLength=400` + `vector-effect` 与像素尺寸解耦；`ringDraw` 1.2s，delay = `min(行数,30)×90ms + 0.9s` 由 DiffCard 内联） |
| 行色 | 增 `rgba(61,255,143,0.07)` 底 + `--accent` 符号；删 45% 透明度 + `rgba(255,85,85,0.03)` 底 + `--del-text`(#e89a9a) 文本 + `--danger` 符号；上下文 `--text-secondary` |
| 交互 | `.diff-body` 横向滚动（overflow-x: auto）；已退役 `glitchIn` 扫入 |

### 3.5 结算行 `.settle`（回合闭环摘要）—— 封存带（3.5C，已落地）

- 代码 Feed.tsx（settle 分支）；样式 styles.css `.settle` 段。
- **出现时机**：agent 回合闭环时（`turn.settle` 存在），位于回合末尾。
- **内容**：`◆` 锚点（`.seal-glyph`）+ 封存带 `.tape`（上下 1px 缘线文字带：已结算/已中断/错误 + `· N tools` + `· N tok`（seenUsage=false 时省略）+ `· X.Xs`），mount 即 `unroll` 0.65s 自左向右展开（clip-path）；**ok 版**带尾 EOL 方块 `.eol` 闪两下（`eolblink` 0.9s ×2）后隐去。
- **中断/错误版**：`--danger` 红 + 带尾撕裂锯齿（clip-path polygon 静态）、**无 EOL**——「被封存」vs「被撕断」形态一眼可辨。
- 样式：12px、`--text-tertiary`、0.1em 字距。

### 3.6 凝结雨轨 `.rail`（活动回合装饰）—— 迷你数字雨（3.6C 磁带纹曾落地，已退回本形态）

| 项 | 值 |
|---|---|
| 代码 | `TurnRail.tsx`；样式 styles.css `.rail` 段 |
| 出现时机 | 活动（未闭环）agent 回合左侧；回合闭环后卸载 canvas、凝为 `◆`（`.seal`，`sealIn` 0.5s 下落淡入） |
| 内容 | 26px 宽竖轨（左边 1px `--border` 线），内一枚 canvas 迷你数字雨：2 列字符下落、`destination-out` 拖尾（透明消退，不积黑条）、字体 11px Matrix Code、亮头概率 8% `--bright`、帧节流 `90 / fx.speed` ms |
| 交互 | `pointer-events: none`（纯装饰，不拦截拖选/点击） |
| 注意 | 组件卸载即停 rAF（长会话零常驻开销）；reduced-motion 只画一帧静态雨 |

### 3.7 流式光标与中断标记 —— 字形蛾（3.7B，已落地）

| 元素 | 代码 | 时机/内容 | 样式 |
|---|---|---|---|
| 字形蛾 `.caret` | Feed.tsx `MothCaret` | `streaming && entry.id===lastEntry.id` 时正文尾部：120ms 翻滚的 Matrix 字形蛾（JS interval 换字形，字符取 `MATRIX_CHARS`）+ `mothblink` 1.1s 亮度呼吸；闭环/中断即卸载（蛾熄灭） | styles.css `.caret`：Matrix Code 字体（**DOM 例外**，另一处是注入解码乱码帧 `.decoding`）、13px、`--bright` |
| 中断标记 `.aborted` | Feed.tsx `AbortedMark` | `turn.interrupted && entry.id===lastTextId`（末条文本段）尾部追加 ` [已被操作员中断]`——**乱码逐位锁定入场**（约 450ms，与注入解码同语言，reduced-motion 直出） | styles.css `.aborted`：`--danger` |

---

## 4. Agent 回合行为时序（重构不得破坏）

1. **回合创建**：`agent_start` 创建 agent 回合（激活）→ 雨轨挂载走帧。
2. **流式正文**：`message_update` 按到达保序追加 text/thinking 段 → `.msg`/`.think` 即时渲染；text 段 mount 播一次亮度波显影，流式追加直出；字形蛾挂在末段。
3. **工具调用**：`tool_execution_start/end` 生成/更新继电器单元（end 写 `dur`、可升级 `edit`）→ 触点 run→ok/err + clack 冲击波。
4. **diff 卡门控**：`revealedEdits[toolCallId]` 由蠕虫动画（SignalCanvas 一次性写入信号）命中后置 true；**前置 true 不渲染 diff 卡**；命中后烧录显影（逐行阶梯 + 校验环）。
5. **回合闭环**：`agent_end` 写 `settle`、`activeTurnId` 清空 → 雨轨凝 ◆、封存带展开、字形蛾熄灭。
6. **中断**：`interrupted` 时末条 text 段追加 `.aborted` 标记（乱码锁定入场）；封存带撕裂锯齿、无 EOL、`--danger`。
7. **历史重建**（`applySession`）：回合标 `historical` → `.turn-agent.historical` CSS 压掉全部入场编舞，直接终态。
8. **reduced-motion**：全部动画关闭；校验环直接闭合、EOL 常亮、焦化删行保持余烬、雨轨画定格纹（基态即终态原则：压掉动画即最终呈现，仅校验环 dashoffset 与 EOL 透明度需显式补终态）。

---

## 5. 重构自检清单（完成标准）

- [ ] agent 消息流保留回合化 + memo 边界（历史回合不重渲染）
- [ ] `.msg-body` 主文本 **15px**；头部/时间戳/结算行辅助 **12px**；代码块/工具链/思考体 13px
- [ ] 正文子元素齐全：`.hl` 高亮词 / 行内 code / `.msg-code` 围栏代码块
- [ ] 亮度波显影：段 mount 播一次，流式追加不重播；历史回合不播
- [ ] 思考块 `<details>` 折叠默认收起；streaming 末段「· 思考中…」+ 脑波流动；末 5 行沉降梯度
- [ ] 机械继电器：保序、触点三态着色（warning/danger/accent）、clack 冲击波收尾、参数抽屉展开
- [ ] diff 卡：revealedEdits 门控 + 符号/色彩双编码 + `+N −M` + MODIFIED 徽标 + 烧录阶梯（封顶 30 行）+ 校验环
- [ ] 封存带：◆ 锚点 + unroll 展开 + EOL 闪两下；中断/错误撕裂锯齿无 EOL
- [ ] 雨轨：活动态迷你数字雨 / 闭环凝 ◆ / reduced-motion 静态帧
- [ ] 字形蛾：120ms 换字形 + 呼吸；中断标记乱码锁定、仅末条 text 段
- [ ] 历史重建（historical）零入场动画；reduced-motion 无残留动画
