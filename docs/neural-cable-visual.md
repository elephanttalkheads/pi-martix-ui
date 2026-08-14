# 会话脑机链路 —— 视觉实现（Sidebar + NeuralCableLayer + neuralCable.ts）

> 记录脑机链路（neural cable）特效的实现方式。事实源：`src/renderer/src/neuralCable.ts`、`src/renderer/src/components/NeuralCableLayer.tsx`、`src/renderer/src/components/Sidebar.tsx`、`styles.css` 的 `.neural-cable-*` 段。

**隐喻**：侧栏里，从 Neo 头像后脑勺接线口拉出一条条「神经缆线」，接到各会话培育仓左侧的机械柱；当前会话的缆线上跑着双向握手——Neo 发出脉冲包控制培育仓，培育仓收讫后回传应答。

## 锚点与布线（neuralCable.ts）

- 两个归一化锚点：
  - `NEO_SOURCE_ANCHOR` = Neo 头像 256×256 帧的 (82, 114)——后脑勺接线口；
  - `POD_RECEIVER_ANCHOR` = 培育仓 1672×941 帧的 (159, 556)——左侧机械柱。
- `routeNeuralCable(source, target, sidebarWidth, lane)` 生成三段贝塞尔：
  1. 从 Neo 后脑勺水平出线；
  2. 折到左侧「总线」车道（`busX`，lane 0–2，每道错开 3px，最多 3 条并行缆线）；
  3. 沿总线竖直走线，末段短水平接入仓体机械柱。
  全部使用侧栏本地坐标，侧栏调宽 / 素材缩放都能跟随，不写死像素终点。
- `neuralSignatureForSession(sessionId)`：FNV-1a 哈希 → 6 种「签名」之一（字符轮转起点、`ringFractions` 环位置、`staticOffset` 静态偏移），每条缆线纹理稳定且互不相同。

## SVG 图层（NeuralCableLayer.tsx）

- 一张 `absolute inset-0` 的 SVG 盖在侧栏（z-index 1，内容层 z-2，`pointer-events: none`），`viewBox` 跟随侧栏尺寸、`preserveAspectRatio="none"`。
- 可见缆线 = 滚动视窗内距 deck 中心最近的最多 **3 条**（`MAX_VISIBLE_CABLES`）；`ResizeObserver` + deck scroll + `document.fonts.ready` 驱动重测量；缆线集合变化时经 `entering/leaving` 相位做 90ms 淡入淡出，避免滚动跳变。
- 每条缆线五层图元（自下而上）：
  1. `.neural-cable-bed`：3.6px 深绿黑描边线床；
  2. `.neural-cable-nerve`：1.2px 神经线——休眠 `#1da754` / 悬停 `#23c468` / 当前 `#3dff8f`（1.25px）；
  3. `.neural-cable-static`：静态字符流——`textPath` 沿路径铺签名字符串（glyphs 拼两遍），11px、letter-spacing 4px，fill `#23c468`（当前会话升 `#3dff8f`）；active 链路握手循环期间全程隐藏让位；
  4. `.neural-cable-ring` × N + `.neural-cable-receiver`：环与接收器位图（`image-rendering: pixelated`），用 `getPointAtLength(长度 × ringFractions)` 定位；
  5. `.neural-cable-pulse`：脉冲包（见下节）。

## 五段握手动画（仅当前会话、非 reduced-motion）

- 信号字符为 SVG `<text>` 池：脉冲相只用前 4 个（`PULSE_TAIL_LENGTH=4`），回传相铺满全缆，池大小按 `ceil(路径长/8)+2` 随路径重测量动态分配（`PULSE_STEP=8px`）。slot 0 恒为「亮端」：头字符近白 `#c8ffd4`（600 字重），其余 `#3dff8f`，透明度按 slot 1→0.18 梯度衰减。
- 一个回合 = 五段状态机（L = 路径长度）：
  1. **脉冲出站**：4 字符短脉冲（24px），Neo → 仓体，320px/s（`PULSE_SPEED_PX_PER_SECOND`），`anchor = t·v`、slot 距离 `anchor − k·step`；
  2. **回传生长**：脉冲尾端到达仓体后同帧触发——尾部锚定仓体、头部以 140px/s（`RETURN_GROW_SPEED_PX_PER_SECOND`）伸向 Neo，`anchor = L − t·v`、slot 距离 `anchor + k·step`，直至铺满全缆；
  3. **维持传输**：1s（`RETURN_HOLD_MS`）——两端锚定，字符位置固定铺满全缆，内容按 slot 异相突变（不同步，读作数据噪声）；一道连续亮度波（±40px 高斯衰减增亮至多 +0.8）在维持期内从仓体端扫到 Neo 端恰好一次，读作「一整批数据倒入 Neo」；
  4. **回传收缩**：头部锚定 Neo、尾部以 240px/s（`RETURN_SHRINK_SPEED_PX_PER_SECOND`）脱离仓体追向 Neo，可见尾界 `tailLimit = L − t·v`，长度减至 0；
  5. **休止**：0.6s（`PULSE_REST_MS`）——链路只剩 bed/nerve/ring，无任何字符。
- 两个方向的信号永不同屏；active 期间 `.neural-cable-static` 静态字符流全程隐藏。SVG path 始终按 Neo→仓体定义，dormant 静态线路不反转。
- 每帧逐字符 `getPointAtLength` 定位 + 沿切线 `rotate` + 法向 ±1.5px 正弦抖动；每 120ms 约 1/3 字符突变换字（`mutationStep`），形成数据流动感。
- reduced-motion：脉冲与回传整体不渲染（`display: none`），回退静态线。

## 字体与字符集（Matrix Code 统一后）

- 字符集一律取 `src/renderer/src/matrixGlyphs.ts` 的 `MATRIX_CHARS`（Matrix Code 字体 cmap 全集：全角镜像片假名 34 字 + 数字 `012345789`［无 6］+ `*+<>:|`）。
- `.neural-cable-static` / `.neural-cable-pulse text` 的 `font-family: "Matrix Code", var(--font)`——缆线字符是电影官方镜像片假名字形。
- 同一字形还覆盖：背景数字雨、凝结雨轨、蠕虫（WORM_CHARS）、文件名扰码（SCRAMBLE_CHARS，`.ft-row.breached` 期间套用）、注入解码乱码帧（`.decoding` 期间套用）。数字 6 不在 cmap 内，任何场景不得使用。
