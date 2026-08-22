# ZION ASCII 会话城侧边栏 Demo 设计说明

> 状态：独立视觉原型，尚未接入生产 `Sidebar.tsx`
>
> Demo：[`ui-demo/ascii-cyberpunk-sidebar-prototype.html`](../ui-demo/ascii-cyberpunk-sidebar-prototype.html)
>
> 视觉上位规范：[`DESIGN.md`](../DESIGN.md)
>
> 概念研究：[`research/sidebar-session-redesign-inspiration.md`](../research/sidebar-session-redesign-inspiration.md)
>
> 最后同步：2026-08-22

## 1. 给后续 AI 的一分钟摘要

这个 Demo 把传统的“工作区文件夹 + 会话列表”改写成一座可以前后行走的 ASCII 城市：

- **工作区是城市中的建筑 / District**。
- **会话是建筑立面上的可进入 Portal**。
- **工作区之间的切换是相机沿 Z 轴穿行**。
- **当前选中的会话固定显示在下方 Dock**。
- **City Index 是完整、可读、可键盘访问的二维后备入口**。

它不是把普通侧边栏换成绿色主题。核心设计命题是：

> 能否在严格的 `280px` 宽度内，把多个工作区和全部会话变成一个有方向感、可探索、可记忆的世界，同时不牺牲真实 DOM 语义、中文可读性和 Reduced Motion？

修改这个 Demo 前，先守住五条边界：

1. `.zion-sidebar` 的目标宽度是 `280px`，窄视口下允许收缩到 `100vw`。
2. Canvas 只负责空间和氛围，用户实际点击的工作区和会话必须是 DOM `button`。
3. `selectedWorkspace`、`selectedSessionId` 与相机附近的 `activeWorkspace` 是不同状态，不能合并。
4. `Matrix-Code.ttf` 只允许既定字形，不能把中文或任意 ASCII 文本直接画进该字体的 Canvas。
5. `CINEMATIC / FOCUS / REDUCED` 必须共享同一份数据和交互能力，不能把 Reduced 做成残缺版。

## 2. 设计来源与转译方式

直接触发这次探索的是 [A Walkable ASCII Cyberpunk City](https://www.youtube.com/watch?v=3YtygAx_C6A) 的“在字符城市中行走”方式。Demo 只借用了“字符构成空间、相机穿过空间”的抽象方法，没有复用视频中的代码、模型或素材。

项目内部有两条更重要的约束：

- [`DESIGN.md`](../DESIGN.md) 要求 ZION 是一个可辨认的世界，而不是通用 IDE 的绿色皮肤；DOM 负责操作，Canvas / SVG / WebGL 负责空间与氛围。
- [`sidebar-session-redesign-inspiration.md`](../research/sidebar-session-redesign-inspiration.md) 要求多工作区可辨、全部会话可达、深度只表达层级与焦点、空间效果不能制造假关系。

ASCII City 对这些要求的转译如下：

| 产品概念 | 城市隐喻 | 视觉职责 | 真实语义 |
| --- | --- | --- | --- |
| Workspace | District / 建筑 | 稳定地标、颜色、X/Z 坐标 | 工作区 ID、名称、会话集合 |
| Session | Portal / 建筑层 | 建筑立面的发光字形带 | 标题、相对时间、状态、当前态 |
| Workspace switch | 沿街区前后移动 | 相机 Z 轴变化、近大远小 | 切换当前浏览的工作区 |
| Session select | 进入 Portal | Portal 高亮、Dock 更新 | 切换真实会话 |
| Current session | Dock 中的接入目标 | 固定前景、状态色主导 | 当前工作区、会话、状态、时间 |
| All sessions | City Index | 覆盖式二维索引 | 完整的工作区与会话树 |

这里的“城市”是信息架构，不只是背景画。建筑之间的距离编码工作区顺序，建筑立面上的 Portal 编码会话归属，Camera 位置编码用户正在浏览的 District。

## 3. 信息架构

### 3.1 页面纵向结构

```text
┌──────────────────────────────┐  280px
│ Header                       │  58px
│ ZION NAVIGATION / LINKED     │
├──────────────────────────────┤
│                              │
│ City Frame                   │  flex: 1
│ Canvas + projected DOM       │  min-height: 335px
│                              │
│ [WASD]           [CITY INDEX]│
├──────────────────────────────┤
│ Selected Session Dock        │  112px
│ path / title / status / time │
├──────────────────────────────┤
│ CIN | FOCUS | RED    01/04   │  49px
└──────────────────────────────┘
```

短窗口（`max-height: 650px`）下，Header 降为 `52px`，Dock 降为 `96px`，但 City Frame 仍承担剩余空间。侧边栏设置 `min-height` 是为了避免关键控制互相覆盖；在正式 Electron 中应由应用外壳决定窗口最小高度。

### 3.2 三类导航入口

1. **空间入口**：点击建筑标牌或建筑立面的会话 Portal。
2. **移动入口**：W/S/A/D、方向键、滚轮、拖拽和画面内方向按钮。
3. **完整索引**：按 `M` 或点击 `CITY INDEX`，在二维列表中直接访问所有工作区和全部会话。

空间入口负责体验和空间记忆；City Index 负责效率、可达性和大数据量兜底。两者不是互相替代的两套产品，而是同一份 `WORKSPACES` 数据的两个视图。

## 4. 渲染架构

Demo 刻意采用混合渲染，而不是把所有内容塞进 Canvas：

```text
WORKSPACES + STATUS
        │
        ├── Canvas atmosphere layer
        │     ├── Matrix rain
        │     ├── street / perspective lines
        │     ├── ASCII building shells
        │     └── haze / depth fog
        │
        ├── Projected semantic DOM
        │     ├── district-marker buttons
        │     └── session-portal buttons
        │
        └── Fixed semantic DOM
              ├── header / controls
              ├── selected-session dock
              ├── experience modes
              └── complete city index
```

### 4.1 Canvas：空间与氛围层

`#city-canvas` 设置 `aria-hidden="true"`。它绘制：

- 深黑到绿黑的城市背景；
- 按列运行的 Matrix 字符雨；
- 透视道路、车道点和纵深线；
- 建筑外壳、侧面深度和建筑字形点；
- 会话所在楼层的状态色字形带；
- 地平线雾与上下景深雾。

Canvas 中没有任何唯一的可点击目标，也不承担会话标题的可访问名称。即使完全关闭 Canvas，完整数据仍能通过 City Index 被访问。

### 4.2 Projected DOM：空间中的真实控件

`#workspace-layer` 和 `#session-layer` 与 Canvas 共用坐标系。每帧调用 `project()` 得到屏幕坐标，再更新 DOM 按钮的 `left / top / transform / opacity`。

- `.district-marker` 是工作区按钮，包含 `code / name / session count`。
- `.session-portal` 是当前活跃工作区的会话按钮，包含真实中文标题、状态色和层位编号；视觉上从建筑立面浮起（`PORTAL_LIFT` 世界单位），由 Canvas 在立面会话带中心绘制的状态色投射口亮线与建筑关联，呈全息投影感；Portal 本体无边框，标题带状态色文字辉光。
- DOM 文字始终正视用户，不随建筑斜面发生难以阅读的透视变形。

这是 Demo 最关键的技术决定：空间几何来自 Canvas，交互语义来自 DOM。

### 4.3 Fixed DOM：稳定操作面

Header、WASD、City Index、Dock 和模式切换器不参与相机投影。它们相当于固定在镜头前的 HUD / Ornament，保证用户在移动后仍知道：

- 自己处于哪个 District；
- 当前接入哪个 Session；
- 如何快速移动或回到完整索引；
- 当前是 CIN、FOCUS 还是 RED 模式。

## 5. 数据模型与状态语义

### 5.1 工作区与会话数据

当前 Demo 使用 4 个工作区、18 个会话的 mock 数据：

```js
{
  id: "deepseek-zion",
  code: "Z-01",
  name: "deepseek-zion",
  color: "#42ff85",
  x: -52,
  z: 230,
  sessions: [
    {
      id: "sidebar-redesign",
      title: "重新设计多工作区会话栏",
      time: "现在",
      status: "streaming"
    }
  ]
}
```

字段职责：

| 字段 | 作用 | 约束 |
| --- | --- | --- |
| `id` | 稳定身份、选中态匹配 | 不随标题重命名而变化 |
| `code` | 空间地址与短标签 | 当前使用 `Z-01` 一类紧凑格式 |
| `name` | 工作区可读名称 | 必须能在 DOM 中完整访问 |
| `color` | District 能量色 | 不能作为唯一状态信号 |
| `x` | 建筑相对街道的横向位置 | 当前约在 `-52 / +54` 间交替 |
| `z` | 建筑沿行走方向的位置 | 必须单调、稳定，不能每次刷新洗牌 |
| `sessions` | 该工作区全部会话 | 不能只保留“最近几条”而无完整入口 |

### 5.2 状态字典

`STATUS` 把真实会话状态映射为文字、颜色和 Matrix 字形：

| Key | Label | Color | Glyph |
| --- | --- | --- | --- |
| `ready` | `READY` | `#42ff85` | `:` |
| `thinking` | `THINKING` | `#ffcf4a` | `*` |
| `streaming` | `STREAMING` | `#68e9dd` | `+` |
| `tool` | `TOOL ACTIVE` | `#a7ff4a` | `>` |
| `error` | `ERROR` | `#ff5364` | `<` |

正式接入时，状态必须来自真实 Agent / Session 数据。禁止添加伪进度、伪资源占用或只为动画服务的假状态。

### 5.3 三套不能混淆的状态

```text
camera / target       相机当前值与希望到达的位置
active workspace      离相机目标位置最近、当前显示 Portal 的建筑
selected session      用户真正选中的工作区与会话，驱动 Dock
```

关键字段：

- `cameraZ / cameraX`：当前渲染位置；CIN 与 FOCUS 中逐帧平滑逼近目标。
- `targetZ / targetX`：键盘、滚轮、拖拽或点击工作区后设置的目标位置；进入新工作区时，`targetX` 自动对准该建筑的 `x`。
- `activeWorkspace`：由 `closestWorkspaceIndex()` 根据相机位置推导，决定建筑上显示哪组 Portal。
- `selectedWorkspace / selectedSessionId`：用户明确选择的会话，决定 Dock 和 City Index 当前态。
- `mapOpen`：City Index 是否覆盖空间场景。
- `experience`：`cinematic / focus / reduced`。

不要为了减少字段而把 `activeWorkspace` 与 `selectedWorkspace` 合并。用户可以经过某栋建筑但仍保持另一个会话为当前选中项；这是“浏览位置”和“操作目标”的必要区分。

## 6. 透视与建筑几何

### 6.1 投影公式

所有 Canvas 点与 Projected DOM 共用同一个 `project(x, y, z)`：

```js
depth = z - cameraZ
focal = min(232, canvasHeight * 0.49)
scale = focal / depth

screenX = canvasWidth / 2 + (x - cameraX) * scale
screenY = canvasHeight / 2 - (y - BUILDING_HEIGHT / 2) * scale
```

约束：

- `depth <= 18` 的点不渲染，避免相机穿过投影平面后翻转。
- 建筑高度 `BUILDING_HEIGHT = 184`。
- `screenY` 以建筑半高为世界锚点，因此每栋建筑的投影中心始终位于 `city-canvas` 的垂直 `50%`。
- `focal` 随矮画布收缩，但最大不超过 `232`，避免高窗口下建筑无限放大。

建筑垂直居中的恒等关系是：

```text
(projectY(0) + projectY(BUILDING_HEIGHT)) / 2 = canvasHeight / 2
```

修改建筑高度时，必须同时通过 `BUILDING_HEIGHT` 修改生成点、建筑壳和投影中心。不要重新引入分散的 `184` 魔法数。

### 6.2 建筑点云

`createBuildingPoints()` 在启动时为每个工作区生成一次静态点云：

- 建筑正面：宽 `100`、高 `184`；X 方向 13 段，Y 方向 22 段。
- 建筑侧面：深 `74`，分成 8 个 Z 切片。
- 边缘字形能量最高，窗口带次之，稀疏填充最低。
- 每条会话在 `y = 127 - sessionIndex * 21` 处生成一条 11 字形宽的状态带。

`stableGlyph(seed)` 使用确定性种子选择字形。建筑不会因为每帧随机重算而闪烁；只有状态 Portal 的呼吸与数字雨随时间变化。

### 6.3 深度与显隐

- 绘制前按投影深度从远到近排序，避免近处字符被远处字符覆盖。
- 建筑字形超出 Canvas `12px` 缓冲边界后跳过。
- 工作区标牌深度大于 `1500` 时隐藏。
- 会话 Portal 只在活跃建筑深度处于 `56–510` 时可交互（Portal 从立面浮起 `PORTAL_LIFT = 26` 世界单位，相机接近投射口时 Portal 会先触及近距裁切）。
- Portal 宽度限制在 `132–174px`，防止突破 280px 侧栏。

这些阈值共同构成镜头语言。修改其中一个阈值时，要同时检查“近景裁切、远景可辨、按钮可点、标题可读”四个结果。

## 7. Matrix 字形与数字雨

Demo 使用 [`ui-demo/font/Matrix-Code.ttf`](../ui-demo/font/Matrix-Code.ttf)。生产资产位于 [`src/renderer/src/assets/fonts/Matrix-Code.ttf`](../src/renderer/src/assets/fonts/Matrix-Code.ttf)。

该字体不是通用字体。它只映射：

- 34 个全角片假名；
- 数字 `012345789`，注意**没有 `6`**；
- 符号 `* + < > : |`。

因此 `MATRIX_GLYPHS` 和 `ARCH_GLYPHS` 是刻意受限的白名单。不要加入中文、拉丁字母、空格或未映射数字，否则浏览器会回退系统字体，城市会出现风格断裂。

数字雨的实现不是每帧生成全新随机文本：

1. `initRain()` 按 `10px` 水平步长创建列。
2. 每列拥有稳定的 `offset / speed / length / seed`。
3. 时间只改变雨头位置与低频字形切换。
4. 雨头使用近白绿，拖尾按距离衰减。
5. FOCUS 把雨能量降至 `0.3`；REDUCED 把时间固定为 `0`。

这延续了 [`DESIGN.md`](../DESIGN.md) 中“固定字符空间，移动能量”的方向，同时保持单文件 Demo 的实现成本。

## 8. 交互模型

| 输入 | 行为 |
| --- | --- |
| `W` / `↑` | 相机沿 Z 轴向前移动 `76` 世界单位；跨入新工作区时自动水平对准建筑 |
| `S` / `↓` | 相机沿 Z 轴后退 `76` 世界单位；跨入新工作区时自动水平对准建筑 |
| `A` / `←` | 相机向左横移 `13` 世界单位 |
| `D` / `→` | 相机向右横移 `13` 世界单位 |
| 滚轮 | 将 `deltaY * 0.32` 映射到 Z 轴，单次限制在 `±105`；跨入新工作区时自动水平对准建筑 |
| 拖拽空白处 | 水平位移改变 X，垂直位移改变 Z |
| 点击 District 标牌 | 移动到该工作区前方约 `230` 世界单位，并水平对准建筑 |
| 点击 Session Portal | 选择会话并更新 Dock / Index |
| `M` | 打开或关闭 City Index |
| `Esc` | City Index 打开时关闭并把焦点还给开关 |

相机范围：

- `targetX` 限制在当前工作区建筑中心的 `±30` 世界单位内；
- `targetZ` 从 `-15` 到最后一个工作区 `z - 128`；
- CIN / FOCUS 通过时间相关 smoothing 逼近目标；
- REDUCED 直接把当前相机设为目标值。

City Index 打开时，空间移动被暂停，避免滚轮或方向键同时操作背景城市。

## 9. 三档体验

### CINEMATIC

- 完整数字雨、扫描材质、状态 Portal 呼吸；
- 相机平滑移动；
- 会话状态字形按时间产生轻微脉冲；
- 作为视觉野心和品牌辨识的默认档。

### FOCUS

- 保留城市轮廓、工作区地标和真实状态；
- 数字雨能量降低到 CIN 的 30%；
- 十字线与地平线标签降低存在感；
- 适合长时间阅读标题和操作索引。

### REDUCED

- 自动响应 `prefers-reduced-motion: reduce`，也可由用户显式选择；
- 相机直接跳到终态，不执行持续镜头运动；
- 数字雨时间固定，Portal 脉冲停止；
- CSS transition 和呼吸 animation 被关闭或压到近零时长；
- 完整保留工作区、会话、City Index、Dock 与键盘操作。

三档模式不改变数据，也不改变哪个会话可达。

## 10. 字体、色彩与材质

字体分工：

- `Matrix Code`：只用于 Canvas 氛围字形。
- `Share Tech Mono`：协议标签、坐标、状态码和模式控制。
- `Sarasa Term SC`：中文会话标题与正文，负责高密度窄栏中的可读性。

主要颜色角色：

| Token | 角色 |
| --- | --- |
| `--void` | 城市黑场与机器内部 |
| `--matrix` | 主能量与可执行路径 |
| `--matrix-hot` | 高能头部、焦点与当前态 |
| `--cyan` | 分析、远程索引与流式状态 |
| `--amber` | 思考、热量与警示 |
| `--error` | 局部故障，不用于全屏告警 |
| `--ink` | 主要可读文字 |
| `--muted` | 次要时间、位置与说明 |

扫描线、暗角、辉光和网格都属于材质层。不要让它们替代层级、状态和选中态，也不要通过继续增加全屏绿色来“增强 Matrix 感”。

## 11. 无障碍与语义保障

- 侧边栏使用 `<aside aria-label="ZION ASCII 多工作区会话栏">`。
- 建筑和会话入口是原生 `<button>`，带中文 `aria-label` 与可见焦点态。
- Dock 使用 `aria-live="polite"`，选中会话后更新标题与状态。
- City Index 通过 `role="tree"` 暴露完整层级，当前会话使用 `aria-current="page"`。
- City Index 打开时把焦点移动到当前会话；关闭时把焦点还给触发按钮。
- 颜色之外还提供状态文字与符号。
- 系统 Reduced Motion 偏好会影响初始体验模式。

当前原型尚未实现完整的 ARIA Tree 方向键 / roving tabindex 模型。正式接入生产前，应补齐上下键、左右键、Home / End 和焦点管理，而不是把现有 `role="tree"` 当作已经完成。

## 12. 性能策略

当前 Demo 面向 4 个工作区、18 个会话：

- 建筑点云只在启动时生成一次。
- Canvas DPR 最大为 `2`，避免高密度屏幕无限扩大像素成本。
- ResizeObserver 只在 City Frame 尺寸变化时重设 Canvas 与雨列。
- 字形按屏幕范围裁剪。
- 每帧只创建一个用于深度排序的 `drawable` 数组。
- Projected DOM 只包含 4 个 District 标牌与当前活跃工作区的会话 Portal。
- 完整的 18 个会话 DOM 位于按需显示的 City Index。

扩大到几十个工作区或数百个会话时，不要直接线性增加所有 Canvas 点与每帧 DOM 写入。优先：

1. 只绘制相机前后有限范围内的建筑点云；
2. 把静态建筑缓存到离屏 Canvas；
3. 只更新发生可见变化的 DOM transform；
4. 在 City Index 中做列表虚拟化，但确保搜索和键盘路径仍能到达所有会话；
5. 保留一个无 Canvas 的静态降级路径。

## 13. 如何修改

### 13.1 添加工作区

1. 在 `WORKSPACES` 追加稳定 `id / code / name / color / x / z / sessions`。
2. 让 `z` 大于前一个工作区，并保持可预测的间距；当前样例间距约 `340`。
3. 让 `x` 在街道两侧交替，避免建筑完全重叠。
4. 检查 `CITY INDEX` 的总数文案与 Footer 的 `01/04`。这两处目前是硬编码，应优先改成从数据派生。
5. 用键盘、滚轮与 Index 分别访问新工作区。

### 13.2 添加会话或状态

1. 会话必须有稳定 ID、可读标题、相对时间和受支持的 `status`。
2. 如果工作区超过 6 条会话，检查 `y = 127 - index * 21` 是否仍落在建筑立面内。
3. 如果新增状态，同步更新 `STATUS` 的文字、颜色和 Matrix 白名单内 glyph。
4. 确认 Portal、Dock 和 City Index 三处表达一致。

### 13.3 调整建筑尺寸

优先把宽、高、深提升为集中常量。高度已经由 `BUILDING_HEIGHT` 统一控制；宽 `100` 和深 `74` 仍分散在 `createBuildingPoints()` 与 `drawBuildingShell()` 中，是下一步可以清理的技术债。

任何几何修改都应验证：

- 建筑仍相对 Canvas 垂直居中；
- Portal 不超出建筑与侧栏；
- District 标牌不遮挡 Header；
- 最近与最远工作区都能辨认；
- REDUCED 下没有中间帧残留。

### 13.4 修改相机节奏

相关入口是 `moveCamera()`、`navigateToWorkspace()`、`animate()` 和 wheel / pointer 监听器。必须同时保留：

- X/Z clamp；
- `activeWorkspace` 改变时把 `targetX` 重置为新建筑的 `x`，保证建筑水平居中；
- Reduced 立即到达终态；
- City Index 打开时停止背景移动；
- `activeWorkspace` 随位置同步；
- DOM 与 Canvas 使用同一相机值。

## 14. 正式接入 Electron 的建议边界

当前文件是单 HTML 原型，包含 mock 数据、样式、渲染和交互。正式接入时不要原样复制成一个巨型 React 组件，建议拆成：

```text
AsciiCitySidebar
├── useWorkspaceCityModel      生产数据 → 稳定空间坐标
├── useCityCamera              camera / target / navigation
├── AsciiCityCanvas            氛围与建筑点云
├── ProjectedWorkspaceLayer    工作区和当前工作区会话按钮
├── SelectedSessionDock        当前真实会话
├── CityIndex                  全部工作区和全部会话
└── ExperienceModeControl      CIN / FOCUS / REDUCED
```

生产数据接口至少需要：

```ts
type WorkspaceGroup = {
  id: string
  title: string
  isCurrent: boolean
  sessions: SessionSummary[]
}

type SessionSummary = {
  id: string
  title: string
  relativeTime: string
  status: 'idle' | 'thinking' | 'streaming' | 'tool' | 'error'
  isCurrent: boolean
  canRename: boolean
  canDelete: boolean
}
```

原型暂未覆盖生产侧边栏已有的搜索、新建、重命名、删除和工作区管理。正式方案必须把这些能力放回固定 DOM 操作层，并保留明确文字、焦点状态和必要确认。

## 15. 已知限制

- 数据全部是 mock，未连接 zustand 或 Electron IPC。
- `CITY INDEX` 中 `ALL 18` 和 Footer 中 `/04` 仍是硬编码。
- 建筑宽与深尚未集中为常量。
- City Index 具备基础语义和焦点返回，但未完成完整 Tree View 键盘模型。
- Canvas 每帧重绘全部可见建筑，尚无离屏缓存或可见区空间索引。
- `pointercancel` 和窗口失焦时的拖拽复位尚未处理。
- 会话立面布局默认最多约 6 行，更多会话应改为楼层分页、语义缩放或只在 Index 展开，而不是继续压缩文字。
- 原型没有生产级错误恢复、重命名、删除和新建会话入口。

这些限制是原型边界，不应在文档中被描述成已完成功能。

## 16. 验证清单

### 视觉与布局

- [ ] 侧栏在桌面视口下精确为 `280px`。
- [ ] 窄于 280px 的视口没有水平溢出。
- [ ] 建筑投影中心位于 `city-canvas` 垂直中线。
- [ ] 当前建筑、当前 Portal 和当前 Dock 有三个不同层级的视觉信号。
- [ ] 中文长标题在 Portal 中单行截断，在 Dock 中最多两行。

### 数据与交互

- [ ] 4 个工作区都可通过空间标牌和 City Index 到达。
- [ ] 18 个会话都存在于 City Index。
- [ ] W/S/A/D、方向键、滚轮和拖拽能移动相机。
- [ ] 点击任意会话后 Dock、Portal 与 Index 当前态一致。
- [ ] `M` 打开 Index，`Esc` 关闭并正确恢复焦点。

### 模式与语义

- [ ] Matrix 字体已加载，Canvas 没有出现系统字体回退字形。
- [ ] FOCUS 降低持续氛围，但不隐藏状态和操作。
- [ ] REDUCED 没有平滑相机、持续脉冲和明显闪烁。
- [ ] 所有会话按钮都可获得键盘焦点并拥有可读名称。
- [ ] 关闭或不渲染 Canvas 后，City Index 仍能访问全部数据。

### 本地预览

```powershell
npx vite ui-demo --host 127.0.0.1 --port 4178
```

打开：

```text
http://127.0.0.1:4178/ascii-cyberpunk-sidebar-prototype.html
```

修改后至少运行一次 JavaScript 语法检查、`git diff --check`，并在常规高度、矮窗口和窄视口下检查布局。

## 17. 不要做什么

- 不要把 Canvas 上的字形当作唯一会话入口。
- 不要为了“城市更丰富”制造不存在的工作区关系、执行路径或活动状态。
- 不要让所有建筑、Portal 和 HUD 同时使用最高亮度。
- 不要把中文标题换成 Matrix 字体。
- 不要让随机算法在每次刷新后重排工作区坐标。
- 不要只保留当前工作区而让其他工作区完全失去身份。
- 不要在增加会话数量时直接缩小到不可读字号。
- 不要移除 City Index，除非另有等价的“全部会话可达”入口。
- 不要把 CINEMATIC 的持续运动复制到 REDUCED。

## 18. 设计判断标准

如果未来 AI 要判断一次修改是否符合这个 Demo，依次问：

1. 它是否让用户更清楚地感到“工作区是一座可记忆的城市地标”？
2. 它是否保持多个工作区有稳定位置，而不是随机的装饰对象？
3. 它是否让会话的真实标题、状态、时间和当前态继续可达？
4. 它是否维持 Canvas 氛围层与 DOM 语义层的边界？
5. 它是否在 280px 内仍然可读、可点、可用键盘操作？
6. 它是否在 FOCUS / REDUCED 中保留同等功能？
7. 它是否来自真实数据，而不是为了画面制造假的 Agent 行为？

前六项通过但第七项失败，仍然是不合格的 ZION 设计。
