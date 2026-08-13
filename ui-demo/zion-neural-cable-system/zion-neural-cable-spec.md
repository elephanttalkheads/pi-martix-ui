# ZION Neo 脑机接口连接线系统交接说明

## 1. 结论

新系统不再使用整张 Sidebar 尺寸的连接线 PNG。线路长度、曲率和终点均由运行时根据 Neo 与当前可见培育仓图片的真实矩形计算；`cable-01` 至 `cable-06` 只是六个可独立控制的逻辑身份和字符节奏。

主视觉是低亮 Matrix 字符神经束：细线、离散字符、短脉冲和少量束线环。培育仓开／关只改变锚点坐标，不改变线路状态。

## 2. 交付文件

| 文件 | 用途 |
|---|---|
| `zion-neural-cable-system.svg` | 六路可编辑 SVG 设计母版；每条线路含独立分组、路径、端头、机械节点、字符层与信号头层 |
| `zion-neural-cable-preview.svg` | 按当前 `1420×885` 截图比例绘制的三路透明验收叠层 |
| `zion-neural-cable-preview.png` | 透明 PNG 验收图；只用于叠图确认，不进入运行时 |
| `neo-neural-jack.svg` | Neo 左后脑独立机械接口 |
| `pod-neural-receiver.svg` | 培育仓左侧独立接头 |
| `neural-character-tile.svg` | 可沿路径重复的字符神经束纹理样本 |
| `neural-bundle-ring.svg` | 克制的深绿束线环组件 |
| `zion-neural-cable-lab.html` | 使用真实 PNG、ResizeObserver 和动态 SVG 的交互实验台 |
| `brand-spec.md` | 从当前 `styles.css` 提取的视觉令牌 |

`zion-neural-cable-system.svg` 内六行是组件样本，不是 Sidebar 截图坐标。正式接入时必须替换每个 `path[data-runtime-d]` 的 `d`，不要把母版里的样本曲线直接当成运行时布局。

## 3. 图像锚点测量

测量以 PNG 自然像素画布为基准，不使用 Alpha 包围盒。Neo 素材两侧包含字符雨，不能用透明边界自动推导后脑位置。

| 锚点 | 自然像素 | 归一化坐标 `[x, y]` | 说明 |
|---|---:|---:|---|
| `sourceAnchor` | `82, 114` / `256×256` | `[0.3203125, 0.4453125]` | Neo 画面左侧颅骨／耳上交界，避开面部与嘴部；idle/talking 共用 |
| `podAnchorClosed` | `294, 536` / `1672×941` | `[0.1758373, 0.5696068]` | closed 帧左侧圆形机械接口的接入点 |
| `podAnchorOpen` | `293, 536` / `1672×941` | `[0.1752392, 0.5696068]` | open 帧同一接口，结构相对 closed 左移 1px |

如果实现只允许一套仓端坐标，可用平均值 `[0.1755383, 0.5696068]`。在当前仓体最大显示尺寸下，closed/open 的误差低于 `0.2 CSS px`；但推荐仍按当前帧分别取值。

坐标换算：

```ts
type Point = { x: number; y: number };

function imageAnchor(
  imageRect: DOMRect,
  sidebarRect: DOMRect,
  anchor: readonly [number, number],
): Point {
  return {
    x: imageRect.left - sidebarRect.left + imageRect.width * anchor[0],
    y: imageRect.top - sidebarRect.top + imageRect.height * anchor[1],
  };
}
```

必须对实际显示的 `.pod-frame-closed` 或 `.pod-frame-open` 调用 `getBoundingClientRect()`。不要用 `.scard`、`.pod-visual` 或会话槽位矩形代替，因为宽 Sidebar 中仓体会停止放大并居中留白。

## 4. 路径生成规则

每条线路按同一拓扑生成：后脑短距离退出 → 左侧布线廊道 → 向目标高度下行 → 从左向右插入仓体接口。

```ts
function routeD(source: Point, target: Point, sidebarWidth: number, lane: 0 | 1 | 2) {
  // 始终落在 side-section 的 12px 左内边距附近，避开标题、新建按钮和滚动条。
  const busX = clamp(sidebarWidth * 0.04, 8, 14) + lane * 6;
  const exitX = Math.max(busX + 26, source.x - clamp(sidebarWidth * 0.11, 22, 46));
  const bendY = Math.min(target.y - 34, source.y + 46 + lane * 3);

  return [
    `M ${source.x} ${source.y}`,
    `C ${source.x - 16} ${source.y}, ${exitX + 18} ${source.y + 6}, ${exitX} ${source.y + 18}`,
    `C ${busX + 8} ${bendY}, ${busX} ${target.y - 38}, ${busX} ${target.y - 22}`,
    `C ${busX} ${target.y - 8}, ${target.x - 34} ${target.y}, ${target.x} ${target.y}`,
  ].join(' ');
}
```

`lane` 只用于当前三个可见槽位的轻微束线错位。它不是会话编号：会话 04 滚入第一个可见槽时，应使用 `lane = 0`，而不是沿用“第 4 个固定纵坐标”。

推荐几何参数：

- 主线宽：`1.25px`，底层离散引导线 `1px`。
- `vector-effect="non-scaling-stroke"`，侧栏缩放时线宽不变。
- 字符大小：`11px`；沿路径每约 `8px` 一个采样节拍。
- 束线环：`8–10px × 12–14px`；单条可见线路最多两个。
- 末段水平插入长度：至少 `34px`。
- 不使用 blur；当前线路也不添加大范围光晕。

## 5. 六条线路身份

六条线路共享几何算法和状态机，只保留轻微的纹理差异：

| 线路 | 字符节奏 | 节点差异 |
|---|---|---|
| `cable-01` | 假名与十六进制交替 | 束线环相位 `28%` |
| `cable-02` | 两位数字成组 | 束线环相位 `42%` |
| `cable-03` | 稀疏十六进制 | 中段单节点，相位 `52%` |
| `cable-04` | 假名双字组 | 相位 `34%`，字符间歇略密 |
| `cable-05` | `< + * >` 操作符间隔 | 相位 `61%` |
| `cable-06` | 稀疏校验节奏 | 相位 `47%`，留白最多 |

差异只影响字符种子、节点相位和突变节奏；不能给某一路线使用不同色相、不同粗细或不同端头。

## 6. 状态参数

| 状态 | 线体 | 字符 | 动效 |
|---|---|---|---|
| `dormant` | `#1da754 / 0.20` 底线，`#23c468 / 0.30` 神经线 | `#23c468 / 0.42` | 静态，或每 `900–1400ms` 极弱变更一个字符 |
| `active` | `#23c468 / 0.48` | `#3dff8f / 0.62` | 一枚信号头从 Neo 向仓体移动 |
| `hover/focus` | 路径不变，线体最高 `0.36` | 字符最高 `0.58` | 不改变端点、控制点或线宽 |
| `hidden` | 不绘制 | 不绘制 | 对应仓体离开三槽视窗立即隐藏 |
| `reduced-motion` | 保留 dormant 静态线 | 保留低亮字符 | 停止传播、抖动与随机突变 |

活动信号沿用 `SignalCanvas` 语言：

- 头部：`rgba(200,255,212,0.95)`，即现有 `#c2ffd9` 近白绿。
- 尾部：`rgba(61,255,143,alpha)`，18 个字符逐节衰减。
- 速度：约 `180px/s`，等价于现有 `head += 3` 的 60fps 目标速度。
- 尾节随机突变概率：`35%`；垂直于路径方向的抖动幅度不超过 `1.5px`。
- active 信号只在当前会话线路出现；其他可见线路保持低亮静态。

## 7. 推荐组件边界

建议新增独立 `NeuralCableLayer.tsx`，不要扩写现有 `SignalCanvas.tsx`。两者的生命周期不同：

- `SignalCanvas`：全屏、一次性、从嘴部到文件树，用于入侵事件。
- `NeuralCableLayer`：Sidebar 内常驻、从左后脑到会话仓，用于会话拓扑。

建议数据输入：

```ts
type CableState = 'dormant' | 'active' | 'hover' | 'hidden';

type VisibleCable = {
  cableId: `cable-${'01'|'02'|'03'|'04'|'05'|'06'}`;
  sessionId: string;
  slot: 0 | 1 | 2;
  state: CableState;
  podImage: HTMLImageElement;
  frame: 'closed' | 'open';
};
```

接入点：

1. `NeoAvatar.tsx`：在 `.neo-avatar` 内放置独立后脑锚点或 `neo-neural-jack.svg`；idle/talking 不改变锚点。
2. `SessionPod.tsx`：为 closed/open `<img>` 保留可取到的 ref；目标坐标来自当前可见帧的真实图片矩形。
3. `Sidebar.tsx`：持有 Sidebar、deck、Neo 锚点和可见 SessionPod refs；将当前可见会话映射到 `lane 0–2`。
4. `NeuralCableLayer.tsx`：只负责测量、生成路径、绘制字符与状态动画。
5. `styles.css`：SVG 层 `position:absolute; inset:0; pointer-events:none; aria-hidden:true`。

不要把 `deleteArmed` 映射为 active/dormant。它只决定使用 `podAnchorOpen` 还是 `podAnchorClosed`。

## 8. 重算与合帧

所有变化只调用同一个 `scheduleMeasure()`：

```ts
let measureRaf = 0;
function scheduleMeasure() {
  if (measureRaf) return;
  measureRaf = requestAnimationFrame(() => {
    measureRaf = 0;
    measureAndUpdatePaths();
  });
}
```

触发源：

- `ResizeObserver`：Sidebar、Neo、deck、每个当前可见的 pod `<img>`。
- `load`：closed/open 图片加载完成。
- `scroll`：deck 滚动与吸附结束。
- `resize`：窗口尺寸变化。
- 会话增删、排序、切换项目。
- `--side-w` 拖拽期间：ResizeObserver 会捕获实际 Sidebar 尺寸，无需 React 重渲染。

可见判断使用仓体卡与 deck 的相交矩形。只为交集高度大于卡片高度 `50%` 的三项绘制；滚动中可暂时允许 4 条处于过渡，但吸附结束后必须收敛为 3 条。若验收要求任何时刻最多三条，则按与 deck 中心距离选最近三项。

## 9. 层级与交互

推荐层级：

```css
.sidebar { position: relative; isolation: isolate; }
.neural-cables-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.core-wrap,
.side-section.sessions { position: relative; z-index: 2; }
.pod-nameplate { position: absolute; z-index: 4; }
.session-hologram-layer { z-index: 30; }
```

SVG 必须设置 `aria-hidden="true"`。线路不承担点击、悬停或键盘焦点；状态由会话 DOM 传入。线路在内容层之后，因此不会挡住名称牌、全息标题、编辑／删除按钮、滚动条或 Sidebar 拖拽热区。

## 10. 验收矩阵

1. `160px`：线路从后脑向左退出后仍保留至少 `8px` 布线廊道；不穿过新建按钮。
2. `232px`：三条可见线路各自分流，末段水平接入机械口。
3. `480px`：仓体停止放大并居中后，终点继续跟随 `<img>`，不落在卡片左边缘。
4. closed/open：按两套归一化坐标切换，端头位移低于肉眼可见阈值，线路状态不变。
5. 滚到 04–06：01–03 隐藏，04–06 使用当前三个可见槽位重新生成路径。
6. hover/focus：只提高可读性；全息层出现时线路始终在其后。
7. reduced-motion：无传播、抖动或随机突变，但连接关系完整。
8. 开发者工具检查：SVG 背景透明，六个 `cable-XX` 可分别隐藏，所有层 `pointer-events:none`。
