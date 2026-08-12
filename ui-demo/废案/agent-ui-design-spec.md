# ZION Agent 主控台 — 复刻设计规格（纯文本版）

> **本文档的用途**：让没有多模态能力的模型（如 DeepSeek）仅凭文字，就能把 `ui-demo/index-v4.html` 这个原型复刻成一个可接入真实后端的 Agent UI（React 实现）。
> 所有数值、文案、算法参数均从 `index-v4.html` 原样提取，**不要自行"优化"任何数值**——亮度、时长、间距的每一个数字都是调过的。
>
> 源文件：`D:\pi-martix-ui-dev\ui-demo\index-v4.html`（1222 行，单文件，可直接阅读源码对照）。

---

## 1. 产品定位与视觉风格

- **产品**：多 Agent 主控台。左侧是 Agent 列表与项目文件树，右侧是与 Agent 的对话流，底部有可折叠运行日志和状态栏。
- **风格关键词**：极简 × 黑客帝国 × 辐射 Pip-Boy。
  - **单色磷光绿体系**：所有文字、边框、图形都来自同一个绿色家族，层级只靠明度区分，不出现第二个强调色。
  - **琥珀色 `#ffb000` 只用于"执行中/警示"**，红色 `#ff5555` 只用于"危险/删除/中断"。
  - 无任何渐变背景、无圆角卡片、无阴影堆叠、无 emoji 图标。装饰被压缩到只剩三件：数字雨、神经核心同心环、蠕虫入侵动画。
- **核心交互叙事**：点击左侧文件 → 神经核心"释放蠕虫"沿 L 形路径爬向该文件 → 命中后文件名 Matrix 式扰码解密 → diff 卡片段扫入回传。这是整个 UI 的招牌动效，必须完整复刻。

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

### 2.2 字体

```
font-family: "Share Tech Mono", ui-monospace, "Courier New", monospace;
```

- 全界面**只用这一种等宽字体**（Google Fonts 引入 `Share Tech Mono`）。
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
│          │ 消息流 #feed（flex:1, overflow-y:auto）      │
│ ┌──────┐ │                                           │
│ │核心  │ │                                           │
│ │108px │ ├───────────────────────────────────────────┤
│ └──────┘ │ 输入栏（快捷指令 + 输入行 + 提示）            │
│ Agent列表│                                           │
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

**字符集**：
```
ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEFXYZ<>+*
```

**算法**（逐列下落 + 深度分层，每列携带深度值 `d ∈ [0.45, 1]`）：
1. 字号基准 `FS = 18`，列数 = `ceil(屏宽 / 18)`；每列 `{ x: i*FS, y: random(-60*FS, 0), d: 0.45 + random*0.55 }`。
2. 每帧先盖一层半透明背景制造拖尾：`fillStyle = 'rgba(1,10,4,0.035)'` 填充全屏（**这个 0.035 决定拖尾长度，数值越小尾巴越长**）。
3. 帧节流：距上一帧不足 `90 / FX.speed` ms 则跳过（FX.speed 见 §8 派生信号，空闲=1，忙碌=2.2）。
4. 每列实际字号 `size = FS * (0.65 + d*0.55)`——近处的列字形更大。**深度只影响字号和下落速度，不影响透明度与亮度**（亮度全列统一，见下）。
5. 每列每帧随机取一个字符：
   - **12% 概率是"亮头"**：`shadowColor = 'rgba(120,255,175,0.9)'`，`shadowBlur = 8`，`fillStyle = 'rgba(220,255,232,1)'`（近白磷光，带辉光）。
   - 否则普通字符：`shadowBlur = 0`，`fillStyle = 'rgba(61,255,143,0.95)'`。
6. **45% 概率镜像绘制**：`save → translate(x, y) → scale(-1,1) → fillText(ch, 0, 0) → restore`；否则 `fillText(ch, x + FS/2, y)`（textAlign center）。之后务必 `shadowBlur = 0` 复位。镜像字形是电影原版的标志性细节，不要省略。
7. 深度视差下落：`y += (0.55 + d*0.85) * size`（近处的列下落更快）；落出屏底且 `random() > 0.965` 时重置到 `random(-30 * size, 0)`。
8. 窗口 resize 时重建列数组。

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

### 5.2 神经核心 `.core-wrap`（侧栏顶部，招牌之二）

- canvas `#core`：宽 100%，高 108px（内部按 clientWidth×2 设置分辨率保证清晰）。
- 下方标签：`NEURAL CORE · <b>NEO-7</b> · <span>IDLE</span>`，11px、大写、字距 0.28em、三级绿；`<b>` 是主绿色但不加粗。
- **绘制算法**（每帧）：
  - 全局旋转角 `rot += 0.006 * FX.speed`。
  - 能量 `e = min(1, FX.energy + burst * 0.6)`，其中 `burst = max(0, 1 - (now - burstAt)/700)`——即释放蠕虫后 700ms 内的增能衰减。
  - **外环刻度**：半径 `R = H * 0.34`，随 `rot` 正向旋转。24 根刻度线，每第 6 根是主刻度（长 9、线宽 2），其余长 5、线宽 1。颜色 `rgba(61,255,143, …)`，主刻度透明度 `0.14 + e*0.35`，副刻度 `0.07 + e*0.15`。
  - **内环虚线弧**：半径 `R * 0.62`，反向旋转 `-rot * 1.6`，`setLineDash([10, 7])`，线宽 1.5，透明度 `0.18 + e*0.45`。
  - **中心点**：半径 `3 + e * 3`，颜色 `rgba(200,255,212, 0.25 + e*0.6)`。
- reduced-motion：`FX.speed = 0`（静止绘制，不清除）。

### 5.3 Agent 卡片 `.agent-card`

- 结构：名字（13px 主绿，字距 0.1em）→ 描述（12px 三级绿）→ 状态行（12px）。
- 状态行格式：`● 在线 — 待命`（圆点 `--accent-muted`）或 `◐ 空闲 — 上次运行 12 分钟前`（符号三级绿）。**状态是符号+文字双编码，不只靠颜色。**
- 边框 1px `--border`，无圆角，背景透明。
- hover：`background: rgba(61,255,143,0.05)`；选中 `.active`：边框 `--accent-muted` + 底 `rgba(61,255,143,0.07)`。
- 可键盘操作：`tabindex="0"` + `role="button"`，Enter/Space 触发，`:focus-visible` 显示 1px `--accent` 外描边（offset 2px）。
- 点击后联动：会话头 `MODEL:` 芯片、神经核心标签、输入框 placeholder 全部换成该 Agent 名，日志记录一行。

Demo 数据三张卡：NEO-7（通用推理 · 工具链调用，在线待命）、TRINITY-2（代码检索 · 漏洞分析，空闲）、MORPHEUS-0（长程规划 · 多步任务编排，在线队列中）。

### 5.4 文件树 `#file-tree`

- 数据结构：`{ name, dir?, open?, size?, children? }`。
- 行 `.ft-row`：flex，目录有 caret `▸`（展开时 rotate 90°，过渡 0.2s），文件行尾部右侧是尺寸（11px 三级绿，`margin-left: auto`）。行内 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`。
- 子级容器 `.ft-children`：默认 `display: none`，父节点 `.open` 时显示；左缩进 13px + 1px 竖线 `rgba(61,255,143,0.10)`。
- hover：底 0.05 + 文字升主绿；选中 `.active`：底 0.08 + 主绿。
- **点击文件 = 触发入侵流程**（§7.3）；点击目录只展开/收起并记日志。
- 命中闪烁态 `.breached`：文字 `--bright` + 底 0.14，`transition: none` 立即呈现，900ms 后移除 class。

Demo 树（原样复刻）：`src/core/{neural-core.js 8.2k, synapse-bus.js 3.1k, memory-bank.js 5.7k}`、`src/agents/{neo-7.js, trinity-2.js, morpheus-0.js}`、`src/ui/{rain.js, core.js}`、`src/main.js`、`assets/glyphs.kf`、`brand-spec.md`、`index-v3.html`、`od.config.json`。src 和 src/core 默认展开。

### 5.5 会话头 `.conv-head`

- 左：会话标题 `主控会话 #0047`（13px 主绿，字距 0.12em）。
- 芯片 `.chip`：11px，边框 1px，padding 2px 10px。
  - `MODEL: NEO-7` —— `.on` 态：`--accent-muted` 文字 + 边框 0.35。
  - 状态芯片 —— READY 时同 `.on`；其他状态 `.warn`：琥珀文字 + 边框 `rgba(255,204,0,0.35)`。
  - 右侧（spacer 后）：`上下文 12.4k / 128k`，静态演示数据。

### 5.6 消息 `.msg`

- 每条：`max-width: 820px; margin-bottom: 20px`，入场动画 `blockIn`（0.2s，opacity 0→1 + translateY 6px→0）。
- 消息头：11px 大写字距 0.14em——发送者名 + 时间 `HH:MM`。用户消息整体靠右（`margin-left: auto`，头部 `justify-content: flex-end`，正文右对齐），发送者显示 `OPERATOR`；Agent 消息头部用 `--accent-muted`。
- 正文 15px / 1.8 / 主绿，`white-space: pre-wrap; word-break: break-word`。
- 行内样式：`` `code` `` → 底 0.08 + 边框 + 13px；`【高亮词】` → `--bright`；中断标记 `[已被操作员中断]` → `--danger`。
- **打字机光标 `.caret`**：8px 宽、1.05em 高的 `--accent` 色块，0.9s 步进闪烁（50% 时透明），仅在流式输出期间存在。

### 5.7 工具链块 `.trace`

- 1px 边框 + 底 `rgba(0,12,4,0.3)` + **对角角标**：`::before` 左上、`::after` 右下各一个 8×8 的 L 形边框（1px `--accent-muted`）。这是全局唯一的"装饰性角标"语言，trace 和 diff 共用。
- 头部：`工具链 · N 步`（11px 大写三级绿）。
- 步骤行：`[tag] 描述文字 …… 状态`。tag 三级绿；执行中 `.run` 时 tag 和状态变琥珀，文字 `执行中…`；完成 `.done` 时状态变 `--accent-muted`，文字 `完成 · X.Xs`（真实计时）。
- 步骤节奏：每步间隔 `380 + random*420` ms。

### 5.8 diff 块 `.diff`

- 同款边框 + 对角角标，底 `rgba(0,6,2,0.55)`。
- 头部：`✎ 文件路径`（主绿）+ `+N`（`--accent-muted`）`−N`（`--danger`）统计 + 右侧 `modified`（琥珀大写 11px）。
- 行结构：`[行号 44px 右对齐][符号 14px 居中][代码]`，`white-space: pre`，13px / 1.55。
  - 上下文行 `.ctx`：二级绿，符号是透明占位。
  - 删除行 `.del`：底 `rgba(255,85,85,0.08)`，文字 `#e89a9a`，符号 `−` 红色。
  - 增加行 `.add`：底 0.07，文字主绿，符号 `+` 用 `--accent`。
  - **增删是符号+颜色双编码**。
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
- 右组：`tokens: N`（累计，每输出字符 +2）、`uptime: MM:SS`、`日志 ▾`、`SND: ON/OFF`、状态字（READY 绿 / 其他琥珀）。
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

1. 起点 = `#core` 画布 `getBoundingClientRect()` 的中心。
2. 终点 = 目标文件行：左边缘 +12px、垂直中心。若目标行在侧栏可视区外，先把侧栏滚动到目标居中。
3. **L 形路径**：`(sx,sy) → (sx,TY) → (TX,TY)`——先垂直后水平。按每 8px 一个采样点插值成点列 `pts`。
4. 释放瞬间：`CORE.burst()`（核心 700ms 增能）+ `SND.worm()`。

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
输入 → addMsg('user') → SND.send() → 日志记录
  → 命中 /clear：清空 feed，结束
  → 命中 /edit（或含文件名）：进入入侵流程（7.3）
  → 其他：setState(RUNNING) → 渲染 trace 并逐步执行（每步完成播 SND.step）
       → setState(STREAMING) → addMsg('agent') → 打字机流式输出
       → 完成后 SND.reply() → setState(READY)
```

**打字机参数**：每 tick 输出 1~3 个随机字符；普通字符间隔 `16 + random*22` ms，遇 `\n` 停顿 120ms；每字符 token 计数 +2。

### 7.2 中断

- 生成中点击按钮 / 按 Enter：`abortStream = true` → `setState('CANCELLING')` → `SND.abort()` → 日志 `[INT] 操作员中断当前生成`。
- trace 循环和打字机循环在下一拍检查 `abortStream` 并退出；打字机会追加红色 `[已被操作员中断]`。

### 7.3 文件入侵（点击文件 或 输入 /edit）

```
setState(RUNNING) → trace 三步：
  [locate] 定位目标 <path>
  [inject] 释放蠕虫 · 注入载荷
  [diff]   回读扇区 · 渲染差异
→ trace 完成后 releaseWorm()（6.2–6.4）
→ 命中回调：SND.breach() + 日志 [PWN]
→ addDiffCard() + .reveal 入场 → SND.reply() → setState(READY)
```

日志全程可追溯：`[WORM] 神经核心释放蠕虫 → <path>`（琥珀）→ `[PWN] 蠕虫命中 · 取得写入权限` → `覆写扇区完成 → <path>`。

`/edit` 指令支持从输入中正则提取文件名：`/([\w\-.]+\.(?:js|ts|css|html|json|md))/i`，在树中按文件名定位完整路径，找不到则落到 `src/core/<name>`。

### 7.4 快捷指令（demo 话术，真实接入后由模型生成）

四个按钮：`/status 系统状态`、`/trace 回放链路`、`检索记忆库`、`扫描项目风险`。对应的演示回复脚本见源文件 `REPLIES` 数组（含每条回复的 trace 步骤与全文文案，复刻 demo 时原样搬运即可）。

### 7.5 其他

- 点击页面任意处后自动把焦点还给输入框（`mousedown` 后 `setTimeout(focus)`）。
- AudioContext 在首次 `pointerdown`/`keydown` 时解锁。
- `SND: ON/OFF` 切换音效。

---

## 8. 全局状态机与派生信号

**会话状态**（4 态）：`READY` / `RUNNING` / `STREAMING` / `CANCELLING`。

`setState(state)` 是**唯一状态源**，一次更新全部关联 UI：

| 状态 | 状态栏文字色 | 会话头芯片 | 神经核心标签 | FX.speed | FX.energy |
|---|---|---|---|---|---|
| READY | 绿 | `.on` 绿 | IDLE | 1 | 0.3 |
| RUNNING / STREAMING / CANCELLING | 琥珀 | `.warn` 琥珀 | ACTIVE | 2.2 | 0.85 |

**派生信号 `FX = { speed, energy }`** 驱动所有环境动画：数字雨下落速度、神经核心旋转速度与亮度都随 `FX` 变化——**忙碌时整个界面"活"起来，这是氛围与状态绑定的关键设计，不要做成随机波动。**

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

- `prefers-reduced-motion: reduce` 时：数字雨画静态帧、神经核心静止、蠕虫/扰码跳过、消息/trace/diff 入场动画关闭、光标不闪烁、日志抽屉无过渡。
- **调试/演示覆盖开关**：URL 带 `?fx=1` 时强制开启动效，忽略系统的 reduced-motion 设置。实现：`const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]fx=1/.test(location.search)`。React 版应保留同一语义。
- `:focus-visible`：1px `--accent` 描边 + 2px offset，全局生效。
- Agent 卡片 `tabindex="0" role="button"` + 键盘触发。
- `#feed` 加 `aria-live="polite"`；`#term-body` 加 `role="log"`。
- 所有 canvas（`#rain` / `#signal` / `#core`）和装饰元素 `aria-hidden="true"`。
- 状态全部"符号+文字"双编码，不单独依赖颜色。

---

## 11. 从原型到真实 Agent UI 的替换点

复刻成"真正的 Agent UI"时，以下 mock 层是唯一需要替换的部分，UI 层原样保留：

| Mock（原型） | 替换为（真实实现） |
|---|---|
| `REPLIES` 数组的正则匹配脚本回复 | 真实 LLM API 的 SSE/WebSocket 流式响应，喂给 `streamReply` |
| `runTrace` 的 `setTimeout(380+random*420)` 假步骤 | 真实工具调用事件流（tool_call / tool_result）驱动步骤状态 |
| `EDIT_DEMOS` 写死的 diff 数据 | 模型产出的 unified diff，解析成 `{n, t, c}` 行结构 |
| `FILE_TREE` 静态数组 | 真实项目文件树 API |
| `tokenCount += chunk * 2` 假计数 | 真实 token usage 上报 |
| `上下文 12.4k / 128k` 静态芯片 | 真实上下文用量 |
| 点击文件 → 固定入侵演示 | 保留蠕虫动画，作为"agent 正在修改该文件"的可视化反馈 |
| Agent 卡片静态状态 | 真实 agent 注册表 + 心跳 |

**接入约束**：流式响应到达时按"收到多少吐多少"驱动打字机（或直接把 chunk 追加进 `streamReply` 的缓冲），保持 caret、中断、token 计数语义不变。

---

## 12. React 实现建议

### 12.1 组件拆分

```
<App>
  <RainCanvas />            // §4.1 数字雨（useEffect + rAF，读 FX context）
  <SignalCanvas />          // §6 蠕虫画布（暴露 releaseWorm 给外部）
  <Scanlines />             // §4.2 纯 div
  <TitleBar clock />        // §5.1
  <Sidebar>
    <NeuralCore agent state />   // §5.2 canvas + CORE.burst()
    <AgentList onSelect />       // §5.3
    <FileTree onBreach />        // §5.4
  </Sidebar>
  <Console>
    <SessionHeader model state context />  // §5.5
    <Feed messages />                      // §5.6–5.8，aria-live
      <Message /> <TraceBlock /> <DiffCard reveal />
    <InputBar onSend streaming onAbort />  // §5.9
  </Console>
  <LogDrawer open lines />    // §5.10
  <StatusBar ... />           // §5.11
</App>
```

### 12.2 关键实现注意

- **三个 canvas 各用一个 `useEffect` + `requestAnimationFrame` 循环**，`FX` 和 `CORE.burstAt` 用 `useRef` 保存——动画循环里绝不走 React state，避免每帧重渲染。
- `FX` / `SND` / `REDUCED` 做成模块级单例或 Context（只读广播，不触发渲染）。
- 消息列表、`tokenCount`、会话状态走 state；`feed` 滚动用 ref 直接操作 `scrollTop`（**不要用 `scrollIntoView`**）。
- 蠕虫的 DOM 测量（`getBoundingClientRect`）在事件回调里做，不在渲染期做。
- 打字机用 ref 持有定时器，中断时 clear；reduced-motion 按 §10 的写法（matchMedia + `?fx=1` 覆盖）在模块加载时读一次即可。
- CSS 直接搬 `index-v4.html` 的 `<style>` 内容（转成 CSS Module / global css 均可），**令牌值一个都不要改**。

---

## 附：一句话风格摘要

> 深绿黑底上的单色磷光绿终端：背景一层深度分层、快慢错落的数字雨，侧栏一枚同心环神经核心，对话流里工具链与 diff 用细线对角角标框住，修改文件时神经核心释放字符蠕虫沿 L 形路径入侵文件名并扰码解密、diff 分段扫入——全部氛围动画由会话状态（READY/RUNNING）统一驱动，琥珀色只在执行中出现。
