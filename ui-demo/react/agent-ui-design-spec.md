# ZION Agent 主控台 — 设计规格（纯文本版 · 对应当前真实 UI）

> **本文档的用途**：让没有多模态能力的模型（如 DeepSeek）仅凭文字，就能理解/复刻 ZION 当前的实际 UI。
> 数值与算法参数以**真实实现**为唯一事实源：`src/renderer/src/`（store.ts / components/Feed.tsx / components/TurnRail.tsx / styles.css）。
> 原型对照：`ui-demo/index-v4.html`（v4 极简基线）、`ui-demo/index-v5.html`（会话区 v5：回合/雨轨/玻璃，已落地）。
> **不要自行"优化"任何数值**——亮度、时长、间距的每一个数字都是调过的。
>
> 本次更新主体是**会话区**（v5 落地：回合模型、凝结雨轨、思考块、结算行、液态玻璃、注入解码）；
> 侧栏（Neo 头像/会话列表/文件树）、弹层（命令面板/项目面板/扩展对话框）按真实代码现状同步描述。

---

## 1. 产品定位与视觉风格

- **产品**：黑客帝国风编码 Agent 主控台（Electron + pi SDK）。左侧是 Neo 头像、会话列表与项目文件树，右侧是与 Agent 的回合化会话流，底部有可折叠运行日志和状态栏。
- **风格关键词**：极简 × 黑客帝国 × 辐射 Pip-Boy ×（v5 起）液态玻璃。
  - **单色磷光绿体系**：所有文字、边框、图形都来自同一个绿色家族，层级只靠明度区分，不出现第二个强调色。
  - **琥珀色 `#ffb000` 只用于"执行中/警示"**，红色 `#ff5555` 只用于"危险/删除/中断/错误结算"。
  - 无圆角卡片、无 emoji 图标。**液态玻璃**只给"agent 凝结出的实体"（工具链块/diff 卡）：玻璃感用光表达（背透模糊、顶边镜面高光、底边折射暗线），不引入圆角与彩色——"矩阵的骨 + 玻璃的光"。
  - 装饰清单：数字雨（背景）、Neo 头像（侧栏）、蠕虫入侵（编辑类工具）、凝结雨轨（回合）、扫描线。
- **核心交互叙事**（两条）：
  1. 编辑类工具调用 → Neo 头像张嘴"吐出"字符蠕虫 → 沿 L 形路径爬向文件树目标行 → 命中后文件名 Matrix 式扰码解密 → diff 卡分段扫入回传。
  2. agent 回合左侧一条迷你数字雨（凝结雨轨）随流式输出下落 → 回合闭环时雨停、凝结为 ◆ 并落出结算行——"操作员看着代码雨凝结成可读的思想"。

---

## 2. 设计令牌（Design Tokens）

### 2.1 颜色（CSS 变量，React 中建议放进 `tokens.css` 或 theme 对象）

| 变量 | 值 | 用途 |
|---|---|---|
| `--bg` | `#010a04` | 全局背景（深绿黑，不是纯黑） |
| `--surface` | `rgba(2, 18, 9, 0.92)` | 对话区底 |
| `--surface-2` | `rgba(3, 26, 13, 0.94)` | 标题栏 / 侧栏 / 输入栏 / 日志 / 状态栏底 |
| `--text-primary` | `#3dff8f` | 主文字（磷光绿） |
| `--text-secondary` | `#23c468` | 次级文字 |
| `--text-tertiary` | `#1da754` | 三级文字 / 占位符 / 时间戳 |
| `--accent` | `#00ff41` | 仅用于：输入光标、提示符 `❯`、发送按钮文字、diff 增加行符号、闪烁光标块 |
| `--accent-muted` | `#14b850` | 在线状态点、完成态、选中边框、角标 |
| `--bright` | `#c2ffd9` | 高亮词、命中态文字 |
| `--warning` | `#ffb000` | 执行中状态（Fallout 琥珀） |
| `--danger` | `#ff5555` | 删除行、中断、错误、关闭按钮 |
| `--border` | `rgba(61, 255, 143, 0.18)` | 全部边框 |

**硬约束**：
- 三级文字对 `--bg` 的对比度均 ≥ 4.5:1，不要降低亮度。
- 界面中所有"绿色半透明"统一写作 `rgba(61, 255, 143, α)`（这是 `#3dff8f` 的 rgb 展开），常用 α 值：`0.05`（hover 底）、`0.07`（选中/diff 增加行底）、`0.08`（行内 code 底）、`0.10`（树缩进线）、`0.14`（命中闪烁底）、`0.18`（边框）、`0.35`/`0.4`（hover 边框）。
- 液态玻璃的高光统一写作 `rgba(194, 255, 217, α)`（`--bright` 的 rgb 展开），仅用于：顶边镜面高光 `0.12`、左缘 `0.05`、雨轨亮头 `0.7`、凝结涟漪描边 `0.5`。玻璃色板不得扩散到其他组件。

### 2.2 字体

```
font-family: "Share Tech Mono", ui-monospace, "Courier New", "Sarasa Term SC", "Microsoft YaHei", monospace;
```

- 拉丁字形**只用 Share Tech Mono 这一种等宽字体**（本地 `@font-face` 打包，离线可用）。
- **CJK 回退链**：前三者均无中文字形 → 回退「Sarasa Term SC」（更纱黑体终端版，**GB2312 子集已本地打包** `SarasaTermSC-Regular.subset.woff2`，离线生效）→「微软雅黑」（系统兜底）→ generic `monospace`。无此链中文会落到 Chromium 的 monospace 默认映射（宋体），观感单薄。
- **数字雨/雨轨字形**：canvas 用 `"Matrix Code"`（本地打包 `Matrix-Code.ttf`，Rezmason/matrix，MIT——电影官方镜像片假名字形）。其 cmap 只覆盖全角片假名 34 字 + 数字 `012345789`（无 6）+ `*+<>:|`，**雨的字符集必须落在这个映射内**，否则回退系统字体穿帮。
- 字重全部为 normal，靠颜色和字号分层，不用粗体。
- 大写英文标签必须加字距：品牌 `0.22em`，区块标题 `0.18em`，消息头 `0.14em`，芯片/日志头 `0.16em`，发送按钮 `0.2em`。

### 2.3 字号阶梯（仅 6 档）

| 场景 | 字号 | 行高 |
|---|---|---|
| 正文消息 / 输入框 | 15px | 1.8 |
| 组件主体（卡片、树、trace、diff） | 13px | 1.8 / 1.55(diff) |
| 状态栏 / 卡片辅助 / 快捷指令 | 12px | — |
| 日志正文 | 12.5px | 1.7 |
| 区块标题 / 芯片 / 消息头 / 提示 | 11px | — |
| 标题栏 | 13px | — |

### 2.4 z-index 分层

| 层 | z-index |
|---|---|
| 数字雨 `#rain` | 0 |
| 主舞台 `#stage` | 5 |
| 扫描线 `.scanlines` | 40（pointer-events: none） |
| 蠕虫画布 `#signal` | 60（pointer-events: none） |

---

## 3. 全局布局

```
┌──────────────────────────────────────────────────────┐
│ 标题栏 36px                                           │
├──────────┬───────────────────────────────────────────┤
│          │ 会话头（标题 + 芯片组）                       │
│  侧栏    ├───────────────────────────────────────────┤
│  232px   │                                           │
│ ┌──────┐ │  消息流 #feed（flex:1, overflow-y:auto）     │
│ │Neo   │ │  —— 回合化：OPERATOR 回合 / agent 回合容器   │
│ │头像  │ │     （雨轨 + 正文段/思考块/工具卡/结算行）     │
│ └──────┘ ├───────────────────────────────────────────┤
│ 会话列表 │ 输入栏（快捷指令 + 输入行 + 提示）             │
│ 文件树   │                                           │
│ 底部信息 │                                           │
├──────────┴───────────────────────────────────────────┤
│ 日志抽屉（收起时 height:0，展开 150px）                  │
├──────────────────────────────────────────────────────┤
│ 状态栏 26px                                           │
└──────────────────────────────────────────────────────┘
```

- 根容器 `#stage`：`height: 100vh; display: flex; flex-direction: column`，`body { overflow: hidden }`——整页不滚动，只有 feed / 侧栏 / 日志内部滚动。
- `.main`：`display: flex; flex: 1; min-height: 0`。
- 响应式：`max-width: 900px` 时侧栏整体隐藏（demo 级处理即可）。
- 滚动条（webkit）：宽 8px，thumb `--text-tertiary`，track 透明。作用对象：`#feed`、`.sidebar`、`#term-body`。

---

## 4. 环境层（背景氛围，不可交互）

### 4.1 数字雨 `#rain`（全屏 canvas，招牌之一）

**字符集**（Matrix Code 字体的 cmap 映射内，见 §2.2）：
```
アウエオカキケコサシスセソタツテナニヌネハヒホマミムメモヤヨラリワー012345789*+<>:|
```

**算法**（逐列下落，单层）：
1. 字号 `FS = 18`，列数 = `ceil(屏宽 / 18)`，每列初始 `y = random(-60 * FS, 0)`，`x = i * FS`。
2. 每帧先盖一层半透明背景制造拖尾：`fillStyle = 'rgba(1,10,4,0.035)'` 填充全屏（**这个 0.035 决定拖尾长度，数值越小尾巴越长**）。
3. 帧节流：距上一帧不足 `90 / FX.speed` ms 则跳过（FX.speed 见 §8 派生信号，空闲=1，忙碌=2.2）。
4. 每列随机取一个字符：
   - **12% 概率是"亮头"**：`shadowColor = 'rgba(120,255,175,0.9)'`，`shadowBlur = 8`，`fillStyle = 'rgba(220,255,232,1)'`（近白磷光，带辉光）。
   - 否则普通字符：`shadowBlur = 0`，`fillStyle = 'rgba(61,255,143,0.95)'`。
5. `fillText(ch, x + FS/2, y)`（textAlign center），之后务必 `shadowBlur = 0` 复位。
6. `y += FS * 0.9`；落出屏底且 `random() > 0.965` 时重置到 `random(-30 * FS, 0)`。
7. 窗口 resize 时重建列数组。

**reduced-motion 降级**：只画一帧静态雨幕——每列每 `FS*2` 高度画一个 `rgba(61,255,143,0.6)` 的随机字符，然后停止。

### 4.2 扫描线 `.scanlines`

```css
background: repeating-linear-gradient(0deg,
  rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px,
  transparent 1px, transparent 4px);
```
固定全屏覆盖，`pointer-events: none`。就这么轻，**不要加重**。

---

## 5. 组件规格（自上而下）

### 5.1 标题栏 `.titlebar`（36px）

- 左：三个 10×10 圆形窗口点（close=红 / min=`--accent-muted` / max=`--accent`），纯装饰 `aria-hidden`。
- 中：品牌 `ZION://agent-console`，大写、字距 0.22em、13px；后缀 `v4.0-minimal` 用三级绿、字距 0.1em、不大写。
- 右：时钟 `HH:MM:SS`，每秒刷新，二级绿。

### 5.2 Neo 头像 `.neo-avatar`（侧栏顶部，招牌之二）

- 像素风 Agent 头像，两帧 DOM 贴图：`neo-idle.png`（闭嘴）/ `neo-talking.png`（张嘴），绝对定位叠放，切换靠 opacity。
- **仅在蠕虫释放期间张嘴**——蠕虫从口中吐出（`wormActive > 0` → `is-talking`）；释放瞬间带 700ms 脉冲（`is-burst`，`neo-burst` keyframes）；其余任何时候闭嘴。
- reduced-motion：talking 帧常显、burst 关闭（见 §10）。
- （历史说明：v4 demo 的同心环「神经核心」已删除，蠕虫起点从核心中心改为头像口部。）

### 5.3 会话列表 `.scard`（侧栏，真实会话）

- 每张卡 = 一个真实持久化会话（`~/.pi/agent/sessions/` JSONL）：标题（`deriveSessionTitle`：name → 首条消息智能摘要 → 会话短码）、首条消息摘要 `s-summary`（空会话显示「（空会话）」）、meta 行（消息数 / 上次活动时间）。
- meta 行默认收起（`max-height: 0`），hover 展开，内含操作钮：重命名（`.s-title-edit` 内联输入，Enter/blur 提交、Esc 取消）、删除（两段确认：首击进「确认?」态 2.5s 自动复位，再击执行软删）。
- 点击卡片 = 切换会话：主进程懒创建 AgentSession 实例（Map 缓存），事件只发当前会话；feed 以历史重建（只还原 user/assistant 文本，工具链/diff/思考不重建）。
- 当前会话高亮（选中边框+底，同 v4 选中态规则）；新建会话按钮在区块标题行。

### 5.4 文件树 `#file-tree`

- 真实项目文件树：主进程扫描当前工作目录（`zion:scan-tree` IPC）生成，编辑类工具调用后自动刷新。
- 数据结构：`{ name, dir?, open?, size?, children? }`。
- 行 `.ft-row`：flex，目录有 caret `▸`（展开时 rotate 90°，过渡 0.2s），文件行尾部右侧是尺寸（11px 三级绿，`margin-left: auto`）。行内 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`。
- 子级容器 `.ft-children`：默认 `display: none`，父节点 `.open` 时显示；左缩进 13px + 1px 竖线 `rgba(61,255,143,0.10)`。
- hover：底 0.05 + 文字升主绿；选中 `.active`：底 0.08 + 主绿。
- 点击文件行 = 发送 `读取 <path>` 指令给 agent（真实 prompt，非动画演示）；点击目录只展开/收起并记日志。
- 命中闪烁态 `.breached`：文字 `--bright` + 底 0.14，`transition: none` 立即呈现，900ms 后移除 class。**文件树行是蠕虫入侵的命中目标**（§6），新文件命中前会先刷新树并展开祖先目录。

### 5.5 会话头 `.conv-head`

- 左：会话标题（13px 主绿，字距 0.12em）。
- 芯片 `.chip`：11px，边框 1px，padding 2px 10px。
  - `SESS: <会话标题>` —— `.on` 态：`--accent-muted` 文字 + 边框 0.35，跟随当前会话。
  - 状态芯片 —— READY 时同 `.on`；其他状态 `.warn`：琥珀文字 + 边框 `rgba(255,204,0,0.35)`。
  - 右侧（spacer 后）：`上下文 N / 128k`（当前为静态占位，真实上下文用量未接入）。

### 5.6 会话流：回合（turn）结构（v5 落地，本节为全新内容）

feed 不再是无结构消息列表，而是**回合序列**（词汇见 CONTEXT.md「agent 回合」）。数据模型：`turns: Record<id, Turn>` + `order: id[]` + `activeTurnId`；回合边界即 `React.memo` 边界——流式期间 store 只替换活动回合对象，历史回合零重渲染（性能设计的核心，见 §8.2）。

**OPERATOR 回合**（`.msg.user`，右对齐）：
- 结构同 v4 用户消息：`margin-left: auto`，头部 `OPERATOR + HH:MM` 右对齐，正文右对齐。
- **注入解码**（见 CONTEXT.md）：入场时假名乱码逐位还原为文字——字符集 `ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789ABCDEF#$%&@`（与蠕虫扰码同族），总时长 `min(700, 240 + 字符数×6)` ms，逐帧 `locked = floor(p×len)` 前锁后乱；空格/换行不参与扰码。**只播一次**（memo 保证不重播）；解码期间显示纯文本，完成后才交给行内解析（code/高亮）。
- 开关：状态栏 `DEC: ON/OFF`，`localStorage.zion.dec` 持久化，默认开；reduced-motion 直接跳过。

**agent 回合容器**（`.turn-agent`，`position: relative; padding-left: 40px`）：
1. **凝结雨轨** `.rail`（见 CONTEXT.md）：`absolute; left: 0; top: 20px; bottom: 2px; width: 26px; border-left: 1px solid --border`。
   - 活动回合：一枚迷你数字雨 canvas（2 列，字号 11px，假名+`0123456789<>+*`），帧节流 `90 / FX.speed`（与背景雨同一折算规则）；亮头 8% 概率 `rgba(194,255,217,0.7)`，普通 `rgba(0,255,65,0.5)`；拖尾为 `destination-out` 透明衰减（`rgba(0,0,0,0.14)`，不盖实色——canvas 保持透明，可透出背景雨）；尺寸用 ResizeObserver 跟随回合高度。
   - 回合闭环：canvas 立即卸载（rAF 停，零常驻开销），原位凝为 ◆（`.rail.settled .seal`，`sealIn 0.5s` 入场）。
   - reduced-motion：只画一帧静态雨。
2. **正文段**（`.msg.agent`，同 v4：头部 = 会话标题 + `HH:MM`，正文 15px/1.8，行内 `code` / 【高亮词】 / 中断标记 `[已被操作员中断]` → `--danger`）。一个回合可有多个正文段（工具调用前后各一段），各占一个 `.msg.agent`。
3. **思考块** `.think`（thinking 段，SDK `thinking_delta` 干净拆分，不再混入正文）：`<details>` 默认折叠；summary `▸ 思路`（11px 三级绿，流式中显示 `▸ 思路 · 思考中…`）；展开体 13px 三级绿，左 `1px dashed --border` 竖线。不打字机光标。
4. **工具卡 / diff 卡**：见 §5.7 / §5.8（液态玻璃材质）。
5. **结算行** `.settle`（见 CONTEXT.md，回合闭环时落出）：`◆ 已结算 · N tools · Σtokens tok · X.Xs` + 右侧延伸发线。
   - `Σtokens` = 回合内各 LLM turn 的 `usage.totalTokens` 求和（`turn_end` 事件携带；未收到 usage 则不显示 tok 段）；耗时 = `agent_start`→闭环实测；`N tools` = 回合内工具调用数。
   - **中断/错误回合照常结算**：首词变 `已中断` / `错误`，整行（含 ◆）转 `--danger`。
   - 历史恢复的回合无结算行（只重建文本）。
- **流式光标 `.caret`**：8px 宽、1.05em 高的 `--accent` 色块，0.9s 步进闪烁，仅流式期间存在于最后一个正文段末尾。

### 5.7 工具链块 `.trace`（液态玻璃卡）

- 1px 边框 + **对角角标**：`::before` 左上、`::after` 右下各一个 8×8 的 L 形边框（1px `--accent-muted`）。这是全局唯一的"装饰性角标"语言，trace 和 diff 共用。
- **液态玻璃材质**（v5 起，trace/diff 共享）：
  - 静态态：`background: linear-gradient(155deg, rgba(61,255,143,0.05), rgba(61,255,143,0.012) 42%, rgba(0,0,0,0.14)), rgba(2,14,7,0.5)` + `box-shadow: inset 0 1px 0 rgba(194,255,217,0.12)`（顶边镜面高光）`inset 0 -1px 0 rgba(0,0,0,0.4)`（底边折射暗线）`inset 1px 0 0 rgba(194,255,217,0.05)`、`0 0 22px rgba(0,255,65,0.04)`。
  - **性能分级**：仅活动回合（`.turn-agent.is-active`）内的卡开 `backdrop-filter: blur(9px) saturate(1.25) brightness(1.05)`（透出背后的数字雨）；回合闭环即降级为静态态——长会话任意时刻 blur 卡数 ≤ 活动回合卡数。
  - **凝结涟漪**：工具收尾（run→ok/err）时挂载一枚 `.ripple`（`inset:-1px` 描边 `rgba(194,255,217,0.5)`，`rippleOut 0.7s`：scale 0.985→1.035 + 渐隐 + blur 2px），播一次即移除。
- 头部：`工具链 · 1 步`（11px 大写三级绿；真实实现一卡一调用）。
- 步骤行：`[toolName] 描述文字 …… 状态`，点击展开/收起完整参数（`.trace-expand`：标题 + `pre`，最大高 240px 内部滚动；展开态存 store `expandedTools`）。描述从 args 提取（file/path/command(60 字）/text/question）。
- 状态：执行中 `.run` 琥珀 `执行中…`；完成 `.done` `--accent-muted` `完成 · X.Xs`（真实计时 `performance.now()` 差值）；失败 `.err` 红 `失败`。**状态是符号+文字双编码。**
- 数据由真实 `tool_execution_start/end` 事件驱动（无假步骤节奏）。

### 5.8 diff 块 `.diff`（液态玻璃卡）

- 同款边框 + 对角角标 + 液态玻璃材质（§5.7）。
- 头部：`✎ 文件路径`（主绿）+ `+N`（`--accent-muted`）`−N`（`--danger`）统计 + 右侧 `modified`（琥珀大写 11px）。
- 行结构：`[行号 44px 右对齐][符号 14px 居中][代码]`，`white-space: pre`，13px / 1.55。
  - 上下文行 `.ctx`：二级绿，符号是透明占位。
  - 删除行 `.del`：底 `rgba(255,85,85,0.08)`，文字 `#e89a9a`，符号 `−` 红色。
  - 增加行 `.add`：底 0.07，文字主绿，符号 `+` 用 `--accent`。
  - **增删是符号+颜色双编码**。
- **渲染时机**：仅当 `revealedEdits[toolCallId]` 登记后渲染（蠕虫命中完成才回传，见 §6）；`tool_execution_end` 的 `result.patch/diff` 可升级行数据；行数上限 200。
- **回传入场 `.reveal`**：`animation: glitchIn 0.5s steps(7) both`，从 `clip-path: inset(0 100% 0 0)` 到全显——7 段阶梯式从左扫入，像解密出的数据。

### 5.9 输入栏 `.inputbar`

- 快捷指令 `.qcmd`：普通矩形按钮（**不要切角**），12px 三级绿文字，1px 边框；hover 升主绿 + 边框 0.4 + 底 0.05。
- 输入行：提示符 `❯`（`--accent`，15px）+ 输入框（无边框无背景，15px 主绿，光标色 `--accent`，placeholder 三级绿）。
- **发送按钮（全屏唯一主动作，唯一切角元素）**：
  ```css
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  ```
  12px 大写字距 0.2em，`--accent` 文字 + 底 0.08 + 边框 `--accent-muted`，min 36×88px。
  hover：反色——底变 `--accent`、文字变黑（**前景背景同一规则内互换**）。
  生成中切换为 `中断`：红色系（文字/边框 `--danger`，底 `rgba(255,85,85,0.07)`），hover 底变 `--danger` 文字黑。
  disabled：opacity 0.35。
- 底部提示 11px 三级绿：`Enter 发送 · 支持 /status /trace /clear · 生成中按钮切换为「中断」`。

### 5.10 日志抽屉 `.term`

- 默认 `height: 0; overflow: hidden; border-top: 0`；`.open` 时 `height: 150px; border-top: 1px`。过渡 0.22s（高度和边框宽度一起动）。
- 头部：`运行日志` + `stdout / stderr 合并`（11px 大写）。
- 正文 `#term-body`：高 118px，12.5px / 1.7 二级绿，最多保留 120 行。每行前缀 `[HH:MM:SS]`（三级绿）。级别配色：`.t-ok` 绿 / `.t-err` 红 / `.t-warn` 琥珀 / `.t-dim` 三级绿。
- 状态栏的 `日志 ▾` 按钮切换（展开变 `日志 ▴`），带 `aria-expanded`。

### 5.11 状态栏 `.statusbar`（26px）

- 左组：`● 已连接 zion 主网`（点 `--accent-muted`）+ `TLS 1.3`（三级绿）。
- 右组：`tokens: N`（**真实累计**：各 `turn_end` 的 `usage.totalTokens` 求和，切换会话清零）、`uptime: MM:SS`、`日志 ▾`、`SND: ON/OFF`、`DEC: ON/OFF`（注入解码开关，§5.6）、状态字（READY 绿 / 其他琥珀）。
- 12px，组内间距 18px。

---

## 6. 蠕虫入侵动画（招牌之三，必须精确复刻）

两层 canvas：`#signal` 全屏（z 60）负责蠕虫本体；扰码直接改 DOM 文本。

### 6.1 字符集

```
蠕虫 WORM_CHARS:     ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789ABCDEF<>+*
扰码 SCRAMBLE_CHARS: ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ0123456789ABCDEF#$%&@
```

### 6.2 释放与路径

1. 起点 = Neo 头像嘴部：`.neo-avatar` 的 `getBoundingClientRect()` × 嘴部相对位置（`MOUTH` 比例，按 256×256 源图估算，可目测微调）。
2. 终点 = 目标文件行：左边缘 +12px、垂直中心。若目标行在侧栏可视区外，先把侧栏滚动到目标居中；树中无匹配时先刷新工作区树 + 展开祖先目录，再等两帧重匹配。
3. **L 形路径**：`(sx,sy) → (sx,TY) → (TX,TY)`——先垂直后水平。按每 8px 一个采样点插值成点列 `pts`。
4. 释放瞬间：Neo 头像张嘴（`wormActive+1` → `is-talking is-burst`，700ms 脉冲）+ `SND.worm()`。

### 6.3 蠕虫渲染（每帧）

- 头部索引每帧 `head += 3`（约 180px/s 的爬行速度），尾长 `TAIL = 18` 节。
- 字体 11px monospace，居中绘制。
- 头部（i=0）：`rgba(200,255,212,0.95)`（近白）。
- 尾节：`rgba(61,255,143, (1 - i/18) * 0.7)` 逐节衰减。
- **爬行感**：尾节每帧 35% 概率随机突变成另一个字符；x 方向加 `sin((idx+head)*0.9) * 1.5` 的抖动（头部不抖）。
- 预生成整条路径的字符数组 `glyphs`，突变直接改数组。
- 当 `head >= pts.length + TAIL`（整条虫完全进入目标）：清空画布 → 触发命中。

### 6.4 命中：文件名扰码解密

1. 目标行加 `.breached`（900ms 后移除）。
2. 扰码总时长 **620ms**：进度 `p = (t-t0)/620`，已"解密"字符数 `locked = floor(len * p)`。
3. 每帧重建文本：前 `locked` 个字符用原文，其余位置逐字符随机取 `SCRAMBLE_CHARS`——**`.` 号永远保持不动**（保证扩展名锚点）。
4. 结束后还原原文，回调进入 diff 回传。
5. 配套 `SND.breach()` 低音命中音 + 日志 `[PWN] 蠕虫命中 · 取得写入权限`。

**reduced-motion 降级**：跳过蠕虫和扰码，直接 `breached` 高亮 + 完成回调。

---

## 7. 交互流程

### 7.1 发送消息

```
输入 → pushUser（OPERATOR 回合 + 注入解码）→ SND.send() → 日志记录
  → window.zion.prompt（真实 pi agent 会话）
  → 事件流驱动：
    agent_start          → armTurn()（下一内容开新回合）+ RUNNING
    message_update       → text_delta → queueDelta(text)；thinking_delta → queueDelta(thinking)；+ STREAMING
    tool_execution_start → toolStart + RUNNING；编辑类调用 → 蠕虫入侵（§6，同步路径触发）
    tool_execution_end   → toolEnd（写 dur/状态，result.patch 升级 diff）
    turn_end             → addUsage(usage.totalTokens)（结算行与状态栏 token 的真实来源）
    agent_end / agent_settled → closeTurn()（写结算行）+ READY + SND.reply()
```

**无打字机**：真实流式"收到多少吐多少"，事件进 op 队列、rAF 合帧一次 flush（§8.2），保持 caret/中断/token 语义。

### 7.2 中断

- 生成中点击「中断」/ 按 Enter：`setSessionState('CANCELLING')` + `markInterrupted()`（活动回合打中断标记）+ `SND.abort()` + `window.zion.abort()` → 日志 `[INT] 操作员中断当前生成`。
- 中断回合照常闭环：雨轨凝为 ◆，结算行首词 `已中断`、整行转红。

### 7.3 编辑类工具调用入侵

```
tool_execution_start（同步路径，不依赖 React 渲染时序——bash 等快工具的
  tool_end 可能先于 useEffect 到达）：
  parseEditFromTool(toolName, args) → EditInfo（bash 写操作启发式 / edit 的 edits[] / write 的 content / patch）
→ 日志 [WORM] 释放蠕虫 → 定位文件树目标行（无匹配则刷新树 + 展开祖先目录）
→ releaseWorm()（6.2–6.4）
→ 命中回调：SND.breach() + 日志 [PWN] + revealEdit(toolCallId)
→ DiffCard(.reveal) 扫入回传
```

日志全程可追溯：`[WORM] 释放蠕虫 → <path>`（琥珀）→ `[PWN] 蠕虫命中 · 取得写入权限` → `覆写扇区完成 → <path>`。

### 7.4 命令面板（palette）

输入栏以 `/` 开头触发弹出清单：聚合本机全部 skills（用户级/共享/项目/扩展包）与命令（主进程 `skillscan.mjs` 扫描、`zion:list-commands` 传输）；↑↓/Enter/Tab/Esc 操作，选中 skill 插入「运行技能 X：」、命令插入 `/name`（执行语义属宿主层，面板只做插入）。

### 7.5 其他

- 点击页面任意处后自动把焦点还给输入框（豁免弹层：AskDialog/项目面板/命令面板/重命名输入）。
- AudioContext 在首次 `pointerdown`/`keydown` 时解锁。
- `SND: ON/OFF` 切换音效；`DEC: ON/OFF` 切换注入解码（§5.6）。

---

## 8. 全局状态机与渲染管线

### 8.1 会话状态（4 态）：`READY` / `RUNNING` / `STREAMING` / `CANCELLING`

`setSessionState(state)` 是**唯一状态源**，一次更新全部关联 UI：

| 状态 | 状态栏文字色 | 会话头芯片 | FX.speed | FX.energy |
|---|---|---|---|---|
| READY | 绿 | `.on` 绿 | 1 | 0.3 |
| RUNNING / STREAMING / CANCELLING | 琥珀 | `.warn` 琥珀 | 2.2 | 0.85 |

**派生信号 `FX = { speed, energy }`** 驱动所有环境动画：背景数字雨、凝结雨轨的下落速度都随 `FX` 变化（帧节流 `90 / FX.speed`）——**忙碌时整个界面"活"起来，这是氛围与状态绑定的关键设计，不要做成随机波动。**FX 是模块级可变对象，动画循环每帧直读，**不进 React 渲染路径**。

### 8.2 回合生命周期与渲染管线（v5 性能设计的核心）

- **op 队列**：agent 事件（arm/delta/toolStart/toolEnd/usage/interrupt/close）不直接 set state，进 `opQueue`，rAF 时一次 `_flush`——每帧至多一次 store 更新，长会话流式不丢帧。
- **不可变粒度 = 回合**：flush 只克隆被触及的回合对象（`turns[id]` 换引用），`order` 仅在新增回合时变。`TurnView = memo()`，props 只有 `id/active/streaming`——**历史回合零重渲染**。
- **回合开闭**：`agent_start` → `arm`（下一内容开新回合）；`agent_end`/`agent_settled`/`message_end(error)` → `close`（写结算行）。`turn_end` → `usage`（Σtokens 累积）。非流式动作（pushUser/applySession/reset）先同步 drain 队列保证全局顺序。
- **自动滚动**：只订阅末回合对象变化（`scrollTop = scrollHeight`，不用 `scrollIntoView`）。

---

## 9. 音效系统（WebAudio，全部程序化合成，无音频文件）

振荡器 + Gain 包络：`gain` 从 0 线性升到峰值（6ms），再指数衰减到 0.0001。默认音量 0.03。

| 名称 | 触发时机 | 参数 |
|---|---|---|
| `send` | 发送消息 | 660Hz 方波 0.06s；延迟 0.05s 后 1320Hz 0.09s |
| `step` | trace 每步完成 | 1250Hz 正弦 0.03s，音量 0.018 |
| `reply` | 回复完成 | 523Hz 正弦 0.08s；延迟 0.07s 后 784Hz 0.1s |
| `abort` | 中断 | 220Hz 锯齿 0.16s，滑音至 90Hz，音量 0.04 |
| `worm` | 释放蠕虫 | 1800Hz 锯齿 0.06s，滑音至 380Hz，音量 0.016 |
| `breach` | 蠕虫命中 | 140Hz 方波 0.12s 音量 0.035；延迟 0.1s 后 880Hz 0.08s 音量 0.022 |
| `toggle` | 开启音效时 | 880Hz 0.06s |

滑音用 `frequency.exponentialRampToValueAtTime`。

---

## 10. 可访问性（不可省略）

- `prefers-reduced-motion: reduce` 时：数字雨画静态帧、凝结雨轨只画一帧静态雨、蠕虫/扰码跳过、注入解码跳过、消息/trace/diff/结算行入场动画关闭、凝结涟漪关闭、光标不闪烁、日志抽屉无过渡、Neo 头像 burst 关闭。
- `:focus-visible`：1px `--accent` 描边 + 2px offset，全局生效。
- 会话卡 / 工具卡步骤行可键盘操作（`tabindex="0" role="button"` + Enter/Space 触发）。
- `#feed` 加 `aria-live="polite"`；`#term-body` 加 `role="log"`。
- 所有 canvas（`#rain` / `#signal` / 雨轨）和装饰元素 `aria-hidden="true"`。
- 状态全部"符号+文字"双编码，不单独依赖颜色。

---

## 11. demo → 真实实现映射（已落地情况）

| 原型（demo） | 真实实现 | 状态 |
|---|---|---|
| `REPLIES` 正则脚本回复 | pi SDK 真实事件流（主进程 `createAgentSession` 原样透传） | ✅ 已落地 |
| `runTrace` 假步骤节奏 | `tool_execution_start/end` 驱动（真实计时 dur） | ✅ 已落地 |
| `EDIT_DEMOS` 写死 diff | `parseEditFromTool` 解析真实 args / `result.patch` 升级 | ✅ 已落地 |
| `FILE_TREE` 静态数组 | 主进程 `zion:scan-tree` 真实扫描工作目录 | ✅ 已落地 |
| `tokenCount += chunk*2` 假计数 | `turn_end` 的 `usage.totalTokens` 真实求和 | ✅ 已落地 |
| 点击文件 → 固定入侵演示 | 点击文件 = 真实 `读取 <path>` prompt；蠕虫改由编辑类工具调用触发 | ✅ 已落地 |
| Agent 卡片静态状态 | 会话列表（真实持久化会话，切换/新建/重命名/软删） | ✅ 已落地 |
| 神经核心同心环 | Neo 头像（蠕虫从嘴部释放） | ✅ 已替换 |
| v5 会话区（回合/雨轨/思考块/结算行/玻璃/注入解码） | 见 §5.6–5.8、§8.2 | ✅ 已落地 |
| `上下文 N / 128k` 静态芯片 | 真实上下文用量 | ⬜ 未接（占位） |
| 打字机 | 无——真实流式 + rAF 合帧 | — 已废弃 |

**接入约束**：流式响应到达时按"收到多少吐多少"进 op 队列（§8.2），保持 caret、中断、token 计数语义不变。

---

## 12. React 实现结构（对应当前真实代码）

### 12.1 组件拆分

```
<App>
  <RainCanvas />            // §4.1 数字雨（useEffect + rAF，直读模块级 fx 对象）
  <SignalCanvas />          // §6 蠕虫画布（导出 releaseWorm 供事件层同步调用）
  <Scanlines />             // §4.2 纯 div
  <AskDialog /> <ToastHost /> <ProjectPanel />
  <TitleBar clock />        // §5.1
  <Sidebar>
    <NeoAvatar />           // §5.2 两帧贴图，wormActive>0 张嘴
    <SessionList />         // §5.3 .scard 真实会话卡
    <FileTree />            // §5.4（蠕虫目标定位经 store.normPath/matchTreeRow）
  </Sidebar>
  <Console>
    <SessionHeader />       // §5.5
    <Feed aria-live>        // §5.6–5.8
      <TurnView memo>       // 回合边界：历史回合零重渲染
        <TurnRail />        // 凝结雨轨（活动回合 canvas，闭环卸载凝 ◆）
        <OperatorBody />    // OPERATOR 正文 + 注入解码
        <details.think />   // 思考块（thinking 段，默认折叠）
        <ToolCard memo>     // .trace + 玻璃 + 收尾涟漪
          <DiffCard reveal />
        <SettleLine />      // 结算行（◆ 已结算/已中断/错误）
    <InputBar />            // §5.9（busy 时发送钮变「中断」）
  </Console>
  <LogDrawer open lines />  // §5.10
  <StatusBar />             // §5.11（tokens 真实 usage / SND / DEC / 状态字）
</App>
```

### 12.2 关键实现注意

- **canvas 动画循环绝不走 React state**：背景雨/蠕虫/雨轨各用 `useEffect` + rAF，`fx` 等共享信号是模块级可变对象，每帧直读。
- **store 不可变粒度 = 回合**（§8.2）：`turns: Record<id, Turn>` 只克隆被触及的回合；`order` 仅新增回合时换引用；`TurnView`/`ToolCard` 均 memo。
- `expandedTools` / `revealedEdits` 等按 id 选择（`useFeed(s => !!s.xxx[id])`），避免整表订阅。
- 蠕虫的 DOM 测量（`getBoundingClientRect`）在事件回调里做，不在渲染期做；蠕虫触发走 `tool_execution_start` 的同步路径，不等 useEffect。
- reduced-motion 用 `matchMedia('(prefers-reduced-motion: reduce)').matches` 在模块加载时读一次。
- 判别联合收窄用**正向判定**（`kind === 'tool'` 分支在前）——tsgo（TypeScript 7）下对"排除双分支后剩余"的反向收窄不生效。
- CSS 为单文件 `src/renderer/src/styles.css`，令牌值与本文档 §2 一致，**一个都不要改**。

---

## 附：一句话风格摘要

> 深绿黑底上的单色磷光绿终端：背景一层低速数字雨，侧栏一枚像素 Neo 头像，对话流是回合序列——OPERATOR 消息带注入解码，agent 回合左侧凝结雨轨随流式下落、闭环凝为 ◆ 并落出结算行（真实 tokens/耗时），思考折叠成块，工具链与 diff 用细线对角角标 + 液态玻璃框住（仅活动回合开背透模糊），修改文件时 Neo 张嘴吐出字符蠕虫沿 L 形路径入侵文件名并扰码解密、diff 分段扫入——全部氛围动画由会话状态（READY/RUNNING）统一驱动，琥珀色只在执行中出现。
