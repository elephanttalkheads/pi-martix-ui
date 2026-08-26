# Matrix Power Plant 会话侧边栏：设计与实现说明

## 1. 交付结论

本原型把 280px 侧边栏设计成一条向下延伸的 Power Plant 观察井。固定竖直主轴穿过整个视窗；每个项目占据一层独立的“项目转环”；会话占用环层上的横向培育仓盘位。切换会话时，移动的不是卡片或单张仓体，而是同一盘位总成中的旋转墙段、机械接头、轨道、管线、仓体、阴影与状态灯一起绕主轴运动。

最终空间方案是离线 Canvas 2D 自定义三维投影：场景使用世界坐标和透视投影实时绘制，每帧按深度排序。它不依赖多角度 PNG、CSS billboard、远程库或固定截图坐标。

主文件：

- `ui-demo/power-plant-sidebar-redesign.html`
- `ui-demo/assets/power-plant-sidebar-redesign/power-plant-renderer.js`
- `ui-demo/assets/power-plant-sidebar-redesign/`

本任务没有修改 `src/renderer/` 生产业务代码。

## 2. 最终视觉概念

一句话概念：操作员站在一条无底工业井的狭窄观察窗前，通过驱动某一层项目转环，把另一个载人培育仓送到正面检修位。

画面使用三个稳定深度层：

1. 远景是暗场、稀疏红色生命维持灯、纵向管束和向下重复的层间结构。
2. 中景是可独立旋转的盘位总成。暗红培养液是仓体主视觉，湿蚀钢和细墨线负责机械重量。
3. 近景是固定主轴、轴承遮罩、观察刻度和 DOM 信息层。固定结构始终遮挡远端旋转结构，建立“机器在墙后运转”的证据。

培育仓采用修长横向结构：中央透明液舱占绝大部分宽度，边框、护轨和连接件保持纤细但沉重。人体只作为液体后的暗色轮廓，不承担文字信息。磷光绿只标记生命、焦点和锁止；琥珀表示忙碌；红色只存在于培养液和错误状态。

## 3. 为什么没有继承旧实现

旧原型的固定角度贴图、billboard 和三图淡入无法满足本任务的空间验收：

- 仓体可以变化，但墙段、接头、管线和阴影无法共享同一刚性变换。
- 多张贴图交叉时，观察者更容易理解成卡片或图片切换，而不是一整层机械结构旋转。
- 固定画布坐标不适合多个项目层、不同会话数量和快速连续输入。
- 贴图数量会随角度、状态和层数快速膨胀，离线包体与维护成本不可控。
- 遮挡只能烘焙进图片，难以让固定主轴真实盖住远端转环。

因此，新原型只保留了“Power Plant、暗红培育仓、向下探索”的产品隐喻，没有继承旧素材拆分或旋转算法。

## 4. 探索过的三种技术方向

| 方向 | 旋转空间感 | 素材成本 | 280px 可读性 | Electron 迁移 | 动画性能 | 多层资源占用 |
| --- | --- | --- | --- | --- | --- | --- |
| WebGL / Three.js 环形低多边形结构 | 最强，可使用真实深度缓冲、灯光和相机 | 需要建模、UV、纹理和着色器 | 好，但小尺寸抗锯齿与材质细节需专门优化 | 中等偏高；需引入运行时和 GPU 兼容策略 | 单层好，多层需控制 draw call | 中等；网格、纹理、FBO 常驻 |
| 连续角度预渲染帧＋分层遮挡 | 材质可控，但容易读成帧动画 | 很高；角度、状态和分辨率组合膨胀 | 好，像素结果稳定 | 低到中等；图片序列接入简单 | 解码和显存峰值较高 | 高；多层同时动画时明显 |
| Canvas 自定义 3D 投影 | 足够强；连续透视、深度排序和固定遮罩可提供真实机械证据 | 低；只需少量可平铺材质 | 最适合，可直接按 280px 设计线宽与密度 | 低；浏览器与 Electron 原生可用 | 很好；当前约 1–3ms/帧 | 低；共享三张 256px 纹理 |

最终选择 Canvas 自定义 3D 投影。它在 280px 内保留了连续角度和遮挡，又避免了引入 Three.js、模型管线或大量预渲染帧。场景几何全部可由业务状态实时驱动，适合作为 Electron 迁移参考。

## 5. 结构映射

### 项目与项目转环

Demo 数据中沿用 `workspaces` 名称对应需求中的工作区；正式 ZION 迁移时应映射为真实项目。每个项目拥有独立的：

- `angle`：当前物理角度；
- `targetAngle`：目标锁止角；
- `velocity`：弹簧速度；
- `activeIndex`：已经锁止的真实会话；
- `targetIndex`：快速输入后最终要到达的会话；
- `motion`：`locked` 或 `rotating`；
- `lockPulse`：锁止后的短促机械反馈。

项目切换只移动纵向观察位置 `cameraLayer`，不会重置任何项目转环的角度或会话索引。

### 会话与盘位

每层有 6 个物理盘位，间隔 60°。真实会话占用对应盘位；没有真实会话的盘位仍保留墙段、接头和空仓结构，但玻璃为冷暗空仓状态，没有人体、暗红培养液高亮或生命信号。

当前数据包含 4 个项目，分别有 5、3、6、4 个会话。原型因此同时覆盖满环、部分空环和不同回绕距离。

### 向下连续空间

项目层按 `184px` 间隔沿竖直井排列。滚轮、W/S 或上下方向键只改变观察层；背景纵向管束、层间红灯、轴承剖面和深井暗化持续重绘，让滚动读成电梯式下潜，而不是 DOM 列表滚动。

## 6. 场景层级与遮挡顺序

Canvas 每帧按以下顺序绘制：

1. 近黑深井背景和向下重复的管束；
2. 远端层级与环境红灯；
3. 每个项目转环内部按深度排序的盘位总成；
4. 当前项目的暗红观察光域与锁止脉冲；
5. 固定竖直主轴、轴承唇口和前景遮罩；
6. 稀疏空气颗粒；
7. DOM 顶栏、观察读数和底部控制。

盘位总成内部共享同一个 `theta`：

- 可旋转墙段；
- 两组机械管线；
- 环形连接件；
- 上下护轨；
- 玻璃液舱；
- 人体与生命维持管线；
- 阴影、状态灯和点击命中区域。

所有零件通过同一个 `worldPoint()` 和 `project()` 计算屏幕位置，因此不会出现仓体已移动、接头仍停在原位的漂移。

## 7. 相机与投影参数

当前参数：

```text
sidebarWidth  = 280px
cameraDistance = 620
cameraFocal    = 560
cameraX        = 47px
cameraPitch    = 0.11
layerSpacing   = 184px
slotCount      = 6
slotStep       = 60°
podRadius      = 58–242 world units
podHeight      = 56 world units
podDepth       = 25 world units
```

`cameraPitch = 0.11` 是截图复核后的视觉修正。相机略高于环层：远端仓体向上移动、缩小并暗化；近端仓体向下移动、展开并变亮。在切换中段，两个仓体不再完全重叠。墙段、接头、轨道、管线和阴影使用同一投影，所以俯角不会破坏连接关系。

## 8. 旋转状态模型

完整动效使用阻尼弹簧：

```text
velocity += (targetAngle - angle) * 45 * dt
velocity *= exp(-9.4 * dt)
angle    += velocity * dt
```

帧步长上限为 `32ms`，防止窗口恢复或调试暂停后出现大角度跳变。到达角度与速度阈值后进入 `locked`，并触发一次短促 `lockPulse`。

快速连续输入不会排队播放多个动画。每次输入只更新 `targetIndex` 与 `targetAngle`，当前角度继续朝最新目标收敛。目标角使用 `nearestEquivalentAngle()` 选择与当前目标最近的等价旋转角，解决会话数量少于物理盘位时的回绕错位。

`prefers-reduced-motion` 或“动效：精简”模式直接把角度和观察层设置到终态，保留完整构图、锁止状态和可操作性，不播放传播、惯性或回弹。

## 9. 素材清单与生成流程

运行时只加载三张本地纹理和一个本地脚本：

| 文件 | 用途 |
| --- | --- |
| `bio-industrial-metal-256.png` | 固定主轴、旋转墙段、护轨的湿蚀钢纹理 |
| `dark-red-fluid-256.png` | 培育液的暗红流体纹理 |
| `condensation-mask-256.png` | 污玻璃上的水珠与纵向痕迹 |
| `power-plant-renderer.js` | 几何、投影、绘制、物理与交互 |

生成原图、用户参考副本、完整提示词和后处理说明保存在同一素材目录的 `sources/`、`PROMPTS.md` 和 `asset-manifest.md`。运行时不加载参考图或生成原图。

材质后处理由 `generate-textures.py` 确定性执行：中心方形裁切 → 512px 缩放 → 2×2 镜像拼接 → 中心回裁 → 256px 缩放。水珠蒙版使用固定随机种子，可重复生成。仓体、人形、机械接头和轮廓不是图片贴片，全部由 Canvas 实时绘制。

## 10. 交互

- 点击可见的邻近培育仓：选择对应会话；
- A/D 或左右方向键：切换当前项目的会话；
- W/S、上下方向键：切换观察项目；
- 滚轮：一次下潜或上升一层，带 240ms 手势锁；
- 底部五个控件：提供同等的鼠标与键盘入口；
- 动效按钮：手动切换完整／精简模式；
- 当前层、会话、会话数量、忙碌／完成／错误状态通过 DOM 读数表达；Canvas 不作为唯一信息来源。

Canvas 点击层只记录当前观察项目中可见仓体的屏幕包围盒；远离观察窗或被过滤的仓体不会接收点击。

## 11. 浏览器实测与视觉修正

### 测试环境

- 本地静态服务：`http://127.0.0.1:4173/`
- 浏览器内核：Microsoft Edge Chromium，无头模式
- 视窗：`280×900px`
- 验收截图：`deviceScaleFactor = 2`，输出 `560×1800px`

### 已执行的测试

1. 初始页面加载，4 层状态均为 `locked`；Canvas 正常绘制 12 个当前可见总成。
2. 点击第一层的邻近仓体，第一层由会话 01 锁定到会话 02。
3. 用方向键下潜到第二层并点击邻近仓体，第二层锁定到会话 02；第一层仍保持会话 02，证明两层状态独立。
4. 在第二层连续快速执行 7 次向右切换，最终 `targetIndex` 与 `activeIndex` 都收敛到 02，物理对齐误差为 0。
5. 用滚轮从第二层进入第三层，再用向下键进入第四层；观察位置分别为 2 和 3。
6. 开启精简动效后切换第四层会话，状态在一帧内进入 `locked`，物理对齐误差为 0。
7. 控制台 warning/error 为 0，资源请求失败为 0。
8. 实测帧绘制约 `1–3ms`，第四层视图每帧绘制 9 个当前可见总成。

### 截图驱动的修正

首轮截图只显示深井背景，直接读取 Canvas 缓冲却能看到完整仓体。根因是 `desynchronized: true` 让低延迟 Canvas 缓冲和 Chromium/Electron 实际合成帧不同步。最终实现改用标准 2D 合成路径，截图与实际画面一致。

第二轮旋转截图显示 8 个 45°盘位在切换中段高度重合，视觉仍接近一张仓体变形。最终改为 6 个 60°盘位，并加入 `0.11` 的相机俯角，让旧仓体向远端上移缩小、新仓体从近端下方展开。空盘位也改为冷暗无生命状态，避免伪造会话。

验收截图：

- `assets/power-plant-sidebar-redesign/validation-01-initial.png`
- `assets/power-plant-sidebar-redesign/validation-02-workspace-01-rotating.png`
- `assets/power-plant-sidebar-redesign/validation-03-workspace-02-independent.png`
- `assets/power-plant-sidebar-redesign/validation-04-deep-workspace.png`
- `assets/power-plant-sidebar-redesign/validation-rotation-canvas-mid.png`：精确捕获 30°交接中段的 Canvas 证据帧。

## 12. Electron 迁移方式

建议把 Demo 渲染器拆成一个无框架的 `PowerPlantScene` 类，由 React 外壳管理生命周期：

```ts
type PowerPlantProject = {
  id: string;
  name: string;
  sessions: Array<{
    id: string;
    title: string;
    state: "ready" | "busy" | "done" | "error";
  }>;
};

type PowerPlantSceneOptions = {
  canvas: HTMLCanvasElement;
  projects: PowerPlantProject[];
  activeProjectId: string;
  activeSessionId: string;
  reducedMotion: boolean;
  onSelectProject(id: string): void;
  onSelectSession(id: string): void;
};
```

迁移步骤：

1. 将三张 256px 纹理复制到正式 renderer 资源目录，由 Vite 静态 import；不要使用绝对磁盘路径。
2. 把世界坐标、投影、绘制和物理循环移入 `PowerPlantScene`，提供 `updateData()`、`resize()`、`destroy()`。
3. React 组件只渲染 Canvas、DOM 读数和真实按钮；在 `useEffect` 中创建／销毁场景实例。
4. 把生产项目和真实 session ID 映射到稳定盘位，不使用数组下标作为跨重载身份。
5. 项目切换更新 `focusIndex`；会话切换只更新对应项目转环的目标，不重置其他转环。
6. 用 `ResizeObserver` 和设备像素比更新 Canvas；生产侧栏仍锁定 280px 时保持当前相机参数。
7. 将 ZION 的真实会话状态映射到状态灯和 DOM 文本；未知状态不得生成假指标。
8. 为 Canvas 仓体提供 DOM 等价列表或 roving tabindex，使键盘和读屏用户能够直接选择每个会话。
9. Electron 冒烟测试必须在实际 GPU 合成链中复查标准 Canvas 提交，不要重新启用 `desynchronized`。

## 13. 性能控制

- DPR 上限为 2，避免高分屏把 280px 场景放大到不必要的纹理和像素开销。
- 只绘制垂直视窗附近的项目层；屏幕外层直接跳过。
- 每层只绘制观察窗角度范围内的盘位总成。
- 三张 256px 纹理全层共享，不为每个仓体创建位图。
- 远端层通过 alpha、光照与可见角过滤降级，不使用离屏 FBO 或昂贵模糊。
- `requestAnimationFrame` 是唯一循环；快速输入只改目标值，不创建并行动画定时器。
- Reduced 模式直接到达终态并停止惯性视觉计算。

## 14. 本地启动

PowerShell：

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory E:\pi-martix-ui\ui-demo
```

打开：

```text
http://127.0.0.1:4173/power-plant-sidebar-redesign.html
```

页面没有远程 CDN、在线字体、在线接口或构建步骤。通过本地静态服务器打开即可；不要直接双击后依赖浏览器对 `file://` 资源策略的差异。

## 15. 已知限制

- 当前是 Canvas 2D 自定义投影，不支持运行时自由相机或真实体积光；它针对 280px 观察窗定向优化。
- 每层当前有 6 个物理盘位。生产数据超过 6 个会话时，需要定义分页、二级环或动态盘位策略，不能静默丢弃会话。
- Canvas 仓体目前通过包围盒点击，DOM 读数和按钮可访问，但每个仓体尚未拥有独立的原生焦点节点；正式迁移必须补 DOM 等价控件。
- 原型没有声音。若生产加入锁止声，应绑定真实 `locked` 事件，并受全局 SND 设置控制。
- 浏览器实测覆盖 Chromium 合成与交互；最终迁移后仍需在目标 Electron 版本、Windows DPI 和实际 GPU 上完成一次冒烟截图。
- 素材是原创纹理与程序化几何，但用户提供的两张参考副本仅用于设计追溯，不应进入生产包。

## 16. 最终判断

达标。隐藏文字和按钮后，初始画面仍能看见连续主轴、重复轴承剖面、横向培育仓和向下层叠的机械井；在 30°交接中段，旧仓体与连接总成向远端上移、缩小和暗化，新仓体连同墙段、接头、轨道、管线与阴影从近端展开，固定主轴继续遮挡后方结构。动作读作“项目转环绕竖直主轴旋转并换仓”，不再是图片横移或单仓自转。
