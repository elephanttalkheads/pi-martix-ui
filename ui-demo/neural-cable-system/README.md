# ZION Neo 脑机接口连接线系统 v2

## 1. 交付范围

本目录和 `src/renderer/src/assets/neural-cables-v2/` 共同构成可落地的动态连接线设计。它替代旧的固定画布 PNG 线路，但不会自动修改当前 React UI。

核心交付：

- `neural-cable-system-demo.html`：使用真实 Neo、培育仓和三槽滚动结构的动态演示；支持 Sidebar 拖拽、六会话滚动重锚、活动脉冲、hover/focus 和开仓独立状态。
- `neural-cable-system.svg`：六条线路独立分组的可编辑 SVG 母版。
- `neo-neural-port.svg`：Neo 左后脑端头。
- `pod-neural-port.svg`：培育仓左侧端头。
- `neural-glyph-texture.svg`：字符神经束纹理。
- `cable-junction-ring.svg`：束线环。
- `neural-cable-current-layout-preview.png`：当前 Sidebar 比例下三条可见线路的透明参考图，只用于视觉验收。
- `neural-cable-anchors.json`：锚点与视觉参数的机器可读版本。

## 2. 从真实实现确认的约束

### Sidebar

- `App.tsx` 通过 `.main` 上的 `--side-w` 直接修改 Sidebar 宽度；拖拽过程中不触发 React 重渲染。
- 宽度范围为 160–480px，且受窗口宽度一半限制。
- 因此线路更新不能依赖 React props 变化，必须依靠 `ResizeObserver` 和 `requestAnimationFrame`。

### Neo

- `.neo-avatar` 实际尺寸固定为 120×120px。
- idle/talking 两帧叠放，连接线不能与现有嘴部蠕虫共用起点。
- 新线路源点位于画面左侧后脑与外露脑部下缘交界。

### SessionPod

- `.pod-frame` 的宽度为 `min(108cqw, 324cqh)`，在宽 Sidebar 中会停止放大并居中。
- 端点必须由实际 `<img class="pod-frame">` 的矩形计算，不能使用 `.scard` 或槽位左边缘。
- `.deck` 每次显示三个固定槽位，第四至第六会话滚入后复用相同屏幕位置。
- `.delete-armed` 只切换 closed/open 图层，不能改变线路 active/dormant 状态。

### 层级

- 全息标题为 Sidebar 的直属共享浮层，当前 `z-index: 30`。
- 名称牌和操作按钮在 SessionPod 内部上层。
- 新连接线层应放在 Sidebar 内部、内容之下：建议 `z-index: 1`；核心、会话区和项目区使用 `position: relative; z-index: 2`。
- SVG 必须设置 `pointer-events: none` 与 `aria-hidden="true"`。

## 3. PNG 实测锚点

坐标均相对于**完整 PNG 画布**，不是 Alpha 有效像素包围盒。

| 锚点 | 原图尺寸 | 像素坐标 | 归一化坐标 |
|---|---:|---:|---:|
| `sourceAnchor` | 256×256 | `(73, 102)` | `(0.28515625, 0.3984375)` |
| `podAnchorClosed` | 1672×941 | `(159, 556)` | `(0.0950956938, 0.5908607864)` |
| `podAnchorOpen` | 1672×941 | `(159, 556)` | `(0.0950956938, 0.5908607864)` |

测量结论：

- `neo-idle.png` 与 `neo-talking.png` 在源点周围 33×33px 的 Alpha 轮廓一致。
- closed/open 两帧在 `(159,556)` 周围保留同一底座外接机械柱，端点无需因开仓切换。
- 仍保留两套 pod 坐标键，方便未来素材重绘后分别校准。

运行时坐标换算：

```ts
function anchorInSidebar(
  imageRect: DOMRect,
  sidebarRect: DOMRect,
  anchor: { x: number; y: number },
) {
  return {
    x: imageRect.left - sidebarRect.left + imageRect.width * anchor.x,
    y: imageRect.top - sidebarRect.top + imageRect.height * anchor.y,
  };
}
```

`sourceAnchor` 使用 `.neo-avatar` 的矩形；pod 锚点使用当前可见 `.pod-frame-closed` 或 `.pod-frame-open` 的矩形。不要使用 `.pod-visual`、`.session-pod` 或 `.deck` 的矩形代替图片矩形。

## 4. 推荐组件结构

新增组件建议命名为 `NeuralCableLayer.tsx`，作为 `Sidebar` 的直接子元素：

```tsx
<aside ref={sidebarRef} className="sidebar">
  <NeuralCableLayer
    sidebarRef={sidebarRef}
    neoRef={neoRef}
    deckRef={deckRef}
    sessions={sessions}
    currentSessionId={currentSessionId}
    hoveredSessionId={preview?.id ?? null}
  />
  <div className="core-wrap">...</div>
  <div className="side-section sessions">...</div>
  {preview && <div className="session-hologram-layer">...</div>}
  ...
</aside>
```

建议由 `SessionPod` 注册以下数据，而不是向连接线层传递固定像素：

```ts
type PodCableTarget = {
  sessionId: string;
  cableIndex: 1 | 2 | 3 | 4 | 5 | 6;
  root: HTMLElement;
  closedImage: HTMLImageElement;
  openImage: HTMLImageElement;
  deleteArmed: boolean;
};
```

可用 Context/注册表或回调 ref 保存为 `Map<string, PodCableTarget>`。线路只读取 DOM，不应改变 SessionPod 的会话选择、重命名、删除或全息预览逻辑。

## 5. 可见性与重算调度

### 当前可见三条

用 `.deck` 与每个 `.session-pod` 的 `getBoundingClientRect()` 求交集。建议可见高度大于槽位高度的 55% 才绘制，避免 scroll-snap 过渡中同时出现四条线路。

```ts
const visible = Math.min(pod.bottom, deck.bottom) - Math.max(pod.top, deck.top);
const shouldDraw = visible > pod.height * 0.55;
```

按屏幕顺序排序后只取前三条。逻辑线路编号始终跟随会话身份，不跟随屏幕槽位；例如第 04 会话滚到第一个可见槽时仍使用 `cable-04` 的纹理配置。

### 合帧函数

所有事件只调用同一个 `scheduleLayout()`：

```ts
let pending = 0;
function scheduleLayout() {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    measureVisibleTargets();
    updateSvgPaths();
  });
}
```

触发来源：

1. `ResizeObserver`：Sidebar、Neo、deck、所有当前 pod 图片。
2. Sidebar 拖拽：无需额外 React state；`ResizeObserver` 会捕获 CSS 变量宽度变化。
3. `window.resize`。
4. `.deck` 的 `scroll` 与滚动吸附结束。
5. 会话新增、删除、排序和切换项目。
6. closed/open 图片的 `load`。
7. `document.fonts.ready`，避免字符尺寸首次绘制变化。

组件卸载时必须断开 observer、移除监听并取消全部 rAF。

## 6. 动态路径生成规则

线路由三段三次贝塞尔曲线组成：源点退出、左侧布线、目标插入。只使用当前测量坐标，纵坐标不来自会话编号。

```ts
const phase = (cableIndex - 1) % 3;
const sourceExit = {
  x: source.x - clamp(sideWidth * 0.055, 9, 22),
  y: source.y + phase * 1.5,
};
const laneX = clamp(sideWidth * 0.032 + phase * 3, 7, 23);
const targetEntry = {
  x: Math.max(laneX + 9, target.x - clamp(sideWidth * 0.045, 8, 20)),
  y: target.y,
};
const bendY = source.y + clamp((target.y - source.y) * 0.22, 30, 68);
```

建议路径：

```ts
const d = [
  `M ${source.x} ${source.y}`,
  `C ${source.x - 8} ${source.y}, ${sourceExit.x} ${source.y + 2}, ${sourceExit.x} ${sourceExit.y}`,
  `C ${laneX} ${bendY}, ${laneX} ${target.y - 28}, ${targetEntry.x} ${targetEntry.y}`,
  `C ${targetEntry.x + 7} ${target.y}, ${target.x - 5} ${target.y}, ${target.x} ${target.y}`,
].join(' ');
```

这套规则具有以下性质：

- 160px 时布线区域收紧到左边缘 7–16px，不穿过名称牌。
- 232px 时保留短束线段和清楚的三路分流。
- 480px 时 pod 达到高度上限并居中，`target.x` 会跟随真实图片向右移动。
- closed/open 只替换目标图片和锚点键，不改变线路状态。
- 每条 `<path>` 使用 `vector-effect="non-scaling-stroke"`，线宽不会随 SVG viewBox 改变。

## 7. SVG 分层协议

`neural-cable-system.svg` 中每条线路均具有以下结构：

```text
cable-01 … cable-06
├─ cable-XX-control-path
├─ cable-XX-character-signal
└─ cable-XX-mechanical-endpoints
```

集成时建议保留相同 id，以便调试和设计工具检查。每次重算只更新：

- guide/spine path 的 `d`；
- textPath 的 `href` 与 `startOffset`；
- Neo 端头、pod 端头和束线环的 `transform`；
- 根分组的 `data-state`。

不要把六条线路栅格化成一张覆盖 Sidebar 的图片。

## 8. 视觉参数

| 参数 | 推荐值 |
|---|---|
| 主干线宽 | `1.2px` |
| 字符字号 | `11px` |
| 静态字符间距 | `8–13px`，按线路配置 |
| 活动信号尾长 | `18` 个字符 |
| 信号尾步距 | `7px` |
| 横向抖动 | `±1.5px`，仅活动尾部 |
| dormant opacity | 根组 `0.30–0.36` |
| hover/focus opacity | 根组 `0.58–0.66` |
| active opacity | 根组 `0.82–0.90` |
| 信号速度 | `80–105px/s` |
| 机械束线环 | 每条 `1–2` 个，尺寸约 `8×14px` |

只允许使用：

- 暗部：`#010a04`
- 活动脉冲：`#3dff8f`
- 字符：`#23c468`
- 主干：`#1da754`
- 束线环：`#14b850`
- 信号头：`#c2ffd9`

连接线中不使用删除红色，也不使用培育仓素材自身的青蓝高光作为线缆颜色。

## 9. 六条逻辑线路差异

| 线路 | 差异 | 不变项 |
|---|---|---|
| 01 | 均衡字符节奏，单束线环 | 路径规则与状态协议 |
| 02 | 起始相位后移，靠近目标增加第二束线环 | 同上 |
| 03 | 十六进制字符更密，字符步距略短 | 同上 |
| 04 | 脉冲相位偏移，静态片段更长 | 同上 |
| 05 | 两个克制的信号节点，尾部突变稍频繁 | 同上 |
| 06 | 字符更稀疏、间距更长，整体最低亮度 | 同上 |

差异只能影响字符序列、相位、节点与静态密度，不能影响锚点、可见性或 active 语义。

## 10. 状态映射

```ts
type CableState = 'dormant' | 'active' | 'hover' | 'hidden';
```

- `dormant`：可见但不是当前会话；静态低亮度。
- `active`：`session.id === currentSessionId`；提高根组亮度并运行一枚 Neo→pod 的 18 字符信号头。
- `hover`：hover 或 focus 的非当前会话；只提高字符可读性，不改变路径。
- `hidden`：未进入三槽有效视窗；不创建或设置 `display:none`。
- `reduced-motion`：所有可见线都渲染静态 dormant/active 明度，但不运行信号、突变与抖动。

`deleteArmed` 不参与状态映射。

## 11. 与 SignalCanvas 的边界

不要把常驻线路塞进现有 `SignalCanvas`：

- `SignalCanvas` 是全屏、一次性、嘴部→文件树的事件动画，完成后清屏。
- 新线路是 Sidebar 内部、常驻、后脑→会话仓的布局系统。
- 二者可以复用字符集、颜色、尾长和抖动算法，但必须拥有不同的画布/SVG 层和生命周期。

推荐使用 SVG 作为常驻层，原因是六条线路可以独立分组、独立状态、设计工具可编辑，且 DOM 锚点变化时只更新 `d`。活动信号可通过 `getTotalLength()` / `getPointAtLength()` 在同一个 SVG 内绘制，不需要再增加全屏 Canvas。

## 12. 接入顺序

1. 新建 `NeuralCableLayer.tsx`，先只画一条静态路径。
2. 给 `NeoAvatar` 暴露根元素 ref，或在 `.neo-avatar` 上加稳定的 `data-neural-source`。
3. 给 `SessionPod` 的 closed/open `<img>` 增加回调 ref，并向注册表登记。
4. 将连接线层插入 Sidebar，设置绝对定位和层级。
5. 接入 ResizeObserver 与 rAF 合帧。
6. 接入 `.deck` 可见性与滚动更新。
7. 接入 active、hover/focus、hidden、reduced-motion。
8. 最后加入字符纹理、束线环和活动信号头。

每一步都不应修改现有 Neo、SessionPod、Sidebar 的尺寸或会话业务逻辑。

## 13. 验收清单

- 在 160、232、480px 三档宽度各检查一次源点和目标点。
- 480px 下确认线路连接实际居中的 pod 图片，而不是槽位左边缘。
- closed/open 快速切换十次，端头不得跳动。
- 从 01–03 滚到 04–06，只保留当前可见三条。
- hover/focus 不改变路径；打开共享全息层时线路仍处于其后方。
- 名称牌、操作按钮、滚动条均可正常点击或拖动。
- 当前会话只有一枚活动信号；非当前线无传播动画。
- reduced-motion 下无信号移动、字符突变与抖动。
- SVG 背景透明，所有端头素材紧裁且无黑/白底。
- 现有嘴部蠕虫行为不受影响。

## 14. 建议验证命令

接入 React 后运行：

```powershell
npm run typecheck
npm run build:renderer
```

若当前 Electron 实例已占用单实例锁，不要为了 smoke test 强制关闭用户窗口；可以先依靠现有 Vite 热更新检查 160/232/480px 三档和滚动重锚。
