# ADR-0004: 会话脑机链路采用 Sidebar 本地动态 SVG

- 状态：已实施（2026-08-14）
- 关联：`CONTEXT.md`「神经签名」「会话脑机链路」；`ui-demo/zion-neural-cable-system/implementation-decisions.md`

## 背景

Sidebar 可在 160–480px 内连续调宽；会话培育仓随槽宽缩放，但达到槽高允许的上限后停止放大；会话列表又通过三个固定槽滚动展示任意数量会话。固定尺寸 PNG 或预制整图 SVG 无法在这三种变化下持续对齐 Neo 后脑勺与实际仓体接收点。

## 决策

1. **Sidebar 本地 SVG**：链路层作为 `.sidebar` 的直接子级，以 Sidebar rect 为唯一坐标空间。它不并入全屏 `SignalCanvas`；后者继续只负责 Neo 嘴部到文件树的一次性蠕虫入侵。
2. **运行时真实锚点**：Neo 取 256×256 帧 `(82,114)`；培育仓 closed/open 两帧均取 1672×941 帧 `(159,556)`。组件暴露实际图片元素，resize、image load、deck scroll 后重新测量 rect 并换算归一化锚点。
3. **最多三个可见链路**：只连接当前与 `.deck` 视窗相交且最接近视窗中心的三个仓体。槽位集合变化时旧集合 90ms 淡出、替换、再 90ms 淡入，DOM 从不暂存第四条线。
4. **稳定身份、不限制容量**：会话 id 的稳定 hash 选择六种神经签名；签名不是物理槽位，同一签名可以被多个会话复用，会话总数不设上限。
5. **动画有界**：状态优先级为 `active > hover/focus > dormant > hidden`。仅可见 active 链路运行约 180px/s 的 18 字符信号包，尾部清空后休止 1.2s；hover/focus 只增亮静态线，dormant 完全静止，reduced-motion 关闭脉冲和淡入淡出。
6. **冗余语义**：链路可以呼应当前会话与指向状态，但名称牌、状态文字和 ARIA 仍是权威语义；当前会话滚出视窗时不绘制离屏线，也不自动滚动。

## 结果与权衡

- 端点能随 Sidebar 拖拽、仓体缩放上限、开仓帧和列表滚动保持对齐。
- 增加 ResizeObserver、SVG path 测量和一个 active rAF；通过三线硬上限、单 rAF 合并测量、dormant 零动画控制常驻成本。
- 锚点尚未注册或元素 rect 为 0 时宁可暂不绘制，不回退到猜测像素；后续注册/load/resize 会触发重测。
