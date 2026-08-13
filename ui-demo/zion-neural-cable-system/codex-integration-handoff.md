# Codex 交接：将 Neo 脑机接口连接线接入 ZION

## 任务

在 `D:\pi-martix-ui` 的真实 Electron Renderer 中接入响应式 Neo 脑机连接线。最终形态是 Sidebar 内常驻的动态 SVG：最多绘制三个当前可见会话，端点跟随 Neo 与培育仓图片的真实位置，六个逻辑会话可独立控制。

完成条件：`160px`、`232px`、`480px` 三档 Sidebar 宽度均精确连接；滚动到会话 04–06 后线路重新锚定当前三个槽位；开／关仓不跳点；线路不遮挡名称、全息层、按钮或滚动条；类型检查、Renderer 构建和 Electron 视觉检查通过。

## 先读这些文件

开始修改前按顺序读取：

1. `D:\pi-martix-ui\AGENTS.md`
2. `D:\pi-martix-ui\ui-demo\react\agent-ui-design-spec.md` 中“Neo 头像”“会话列表”“蠕虫入侵动画”章节
3. `D:\pi-martix-ui\src\renderer\src\components\NeoAvatar.tsx`
4. `D:\pi-martix-ui\src\renderer\src\components\Sidebar.tsx`
5. `D:\pi-martix-ui\src\renderer\src\components\SessionPod.tsx`
6. `D:\pi-martix-ui\src\renderer\src\components\SignalCanvas.tsx`
7. `D:\pi-martix-ui\src\renderer\src\styles.css`
8. 本交付包中的 `zion-neural-cable-spec.md`；锚点、路径公式、颜色、状态数值和验收矩阵以此为唯一视觉事实源
9. 本交付包中的 `zion-neural-cable-lab.html`；仅用于理解动态测量和渲染关系，不能整体复制进 React

完成标准：能指出 Sidebar 宽度如何由 `--side-w` 改变、三槽如何滚动吸附、仓体图片如何在宽槽位中停止放大，以及 `SignalCanvas` 为什么不能承担常驻连接线。

## 源文件与落点

设计交付包当前位于：

`C:\Users\DELL\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\886e8cbe-e0ac-4e9a-91b3-6d3654a1128c\zion-neural-cable-system`

先将整个目录复制到：

`D:\pi-martix-ui\ui-demo\zion-neural-cable-system`

保留目录结构，包括 `assets`。`.artifact.json` 是 Open Design 预览元数据，不进入正式 Renderer 资源目录。

正式运行时只复制下列可复用 SVG 到：

`D:\pi-martix-ui\src\renderer\src\assets\neural-cable-system`

- `neo-neural-jack.svg`
- `pod-neural-receiver.svg`
- `neural-bundle-ring.svg`

`zion-neural-cable-preview.png`、`zion-neural-cable-preview.svg`、`zion-neural-cable-system.svg` 和 `neural-character-tile.svg` 是设计／验收参考，不作为整图覆盖层导入生产代码。

完成标准：完整设计包存在于 `ui-demo`，正式资源目录只包含生产需要的三个 SVG，没有覆盖或删除现有 `neural-cables` 旧素材。

## 实施计划

### 1. 建立安全基线

- 检查 Git 工作区，记录已存在的修改；它们属于用户。
- 本任务只修改 Renderer 相关文件和上述两个新目录。
- 不删除旧连接线素材；新系统稳定后再由用户决定是否清理。
- 不提交、不推送，除非用户另行明确要求。

完成标准：能把本任务的新差异与用户原有差异逐项区分。

### 2. 新增独立的常驻线路组件

新增：

`src/renderer/src/components/NeuralCableLayer.tsx`

组件职责：

- 在 Sidebar 内渲染一个透明 SVG。
- 测量 Neo、deck、Sidebar 和当前可见 SessionPod 图片。
- 为最多三个可见会话生成三次贝塞尔路径。
- 渲染低亮字符神经束、机械端头和当前会话的移动信号头。
- 独立处理 `dormant`、`active`、`hover/focus`、`hidden`、`reduced-motion`。

保持 `SignalCanvas.tsx` 原样。它是“嘴部 → 文件树”的一次性全屏蠕虫；新组件是“左后脑 → 会话仓”的 Sidebar 常驻拓扑，两者生命周期和坐标空间不同。

不要添加新依赖。用现有 React、SVG DOM、`ResizeObserver` 和 `requestAnimationFrame` 完成。

完成标准：组件可独立挂载，SVG 带 `aria-hidden="true"`、`pointer-events:none`，且没有改动 `SignalCanvas` 的触发链。

### 3. 暴露真实 DOM 锚点

在 `NeoAvatar.tsx` 中增加独立的后脑锚点：

- 锚点属于 `.neo-avatar`，不属于嘴部蠕虫。
- idle/talking 两帧共享同一锚点。
- 可以显示 `neo-neural-jack.svg`，也可以使用不可见 DOM 锚点并由 SVG 层画端头。
- 锚点的图像归一化位置从 `zion-neural-cable-spec.md` 读取。

在 `SessionPod.tsx` 中让父层取得每个会话卡的根元素：

- 推荐 callback ref，以 `session.id` 注册／注销 `.session-pod`。
- 路径测量时从卡内选择当前显示帧的真实 `<img>`：`.pod-frame-closed` 或 `.pod-frame-open`。
- 终点使用图片矩形与规格里的 `podAnchorClosed`／`podAnchorOpen` 换算。
- 不使用 `.scard` 左边缘、`.pod-visual` 边缘或槽位中心作为终点。

DOM 引用保存在 `useRef(Map)` 中，避免为每次尺寸变化写 React 状态。

完成标准：宽 Sidebar 中仓体居中留白时，测得的终点仍停在图片左侧机械接口，而不是卡片边缘。

### 4. 在 Sidebar 中组装状态

在 `Sidebar.tsx` 中：

- 保留现有三槽滚动、重命名、删除、全息预览和会话切换逻辑。
- 在 `.sidebar` 内只挂载一份 `NeuralCableLayer`。
- 向线路层提供 Sidebar、deck、Neo 锚点、SessionPod 元素映射、`currentSessionId`、`confirmId` 和 hover/focus 会话 ID。
- 六个逻辑身份按会话列表顺序映射为 `cable-01` 至 `cable-06`；如果未来会话多于六个，用稳定的 `session.id` 哈希映射纹理种子，不创建固定纵坐标。
- `active` 只由 `currentSessionId` 决定。
- `confirmId` 只决定读取 open 或 closed 的仓端锚点，不改变线路亮度和传播状态。
- 当前进入 deck 的会话按屏幕位置排序，映射到 `lane 0 | 1 | 2`；会话 04 进入第一个可见槽后必须使用 `lane 0`。

滚动过程中按与 deck 中心的距离选最近三项，保证任何时刻最多绘制三条线。滚动吸附结束后结果应与三个完整可见槽位一致。

完成标准：滚动前后组件只保留最多三个可见 `cable-XX` 分组，离开视窗的线路不在 SVG 中绘制或处于 `display:none`。

### 5. 动态测量与路径更新

统一使用一个 `scheduleMeasure()`：所有触发只预约一次 rAF，在该帧内批量读取矩形，再一次更新几何。

必须监听：

- Sidebar、Neo、deck 和当前仓体图片的 `ResizeObserver`
- 图片 `load`
- deck `scroll`
- window `resize`
- 会话增删、排序和项目切换

Sidebar 拖拽通过 `--side-w` 直接改变尺寸，不触发 React 重渲染；必须依赖 `ResizeObserver` 捕获，不能依赖 props 更新。

测量顺序：

1. 一次读取 Sidebar 矩形。
2. 一次读取 Neo 锚点矩形或 Neo 图片矩形。
3. 计算最多三个可见 SessionPod。
4. 一次读取这些 pod 当前显示图片的矩形。
5. 换算为 Sidebar 内部坐标。
6. 按规格中的 `routeD` 规则生成路径。
7. 统一写入 SVG。

完成标准：拖拽 Sidebar 时没有持续强制同步布局循环；一次浏览器帧内不交替执行“读取—写入—读取—写入”。

### 6. 绘制字符神经束

视觉参数全部读取 `zion-neural-cable-spec.md`，并保持以下结构：

- 低亮路径床
- Matrix 字符／短线神经束
- 最多两个克制的束线环
- Neo 后脑端头
- 培育仓端头
- 仅 active 线路存在的 18 字符短尾信号头

字符集与 `SignalCanvas.tsx` 的 `WORM_CHARS` 同族。可抽出共享常量，但不能改变现有蠕虫的速度、嘴部起点或行为。

活动信号的动画可以用 `SVGPathElement.getPointAtLength()`；每帧直接更新信号头节点属性，避免每帧重渲染整个 Sidebar。路径几何只在布局变化时重算，信号传播不重测 DOM。

`prefers-reduced-motion: reduce` 下停止信号传播、字符抖动和随机突变，只保留静态连接关系。

完成标准：普通线路保持低亮，当前会话只有一枚向仓体传播的信号头；无红色、蓝绿色高光、工业软管、blur 或大范围 glow。

### 7. 设置层级和避让

在 `styles.css` 中建立：

- `.sidebar`：保留 `position:relative`，增加或确认 `isolation:isolate`
- `.neural-cables-layer`：`position:absolute; inset:0; z-index:1; pointer-events:none`
- `.core-wrap`、`.side-section.sessions`：内容层至少 `z-index:2`
- `.pod-nameplate`：继续位于线路上方
- `.session-hologram-layer`：继续保持最高的共享信息层

线路从 Neo 左后脑先向左退出，沿 Sidebar 最左侧留白区向下；进入仓体前才从左向右水平插入。检查实际矩形，避开：

- Neo 面部和嘴部
- “会话／新建会话”标题行
- 培育仓中央名称牌
- 编辑／删除按钮
- 全息标题与摘要
- deck 滚动条
- Sidebar 拖拽热区

完成标准：所有交互元素都可点击、可聚焦，文字不被线路穿过，线路层的命中测试始终为空。

## 验证顺序

### 静态验证

在 `D:\pi-martix-ui` 运行：

```powershell
npm run typecheck
npm run build:renderer
```

完成标准：两个命令均以退出码 0 完成，Vite 构建产物包含新增 SVG 资源。

### Electron 视觉验证

必须在真实 Electron Renderer 中验证，不能只依据此前的 Open Design HTML 导出；该导出曾因缺少 workspace context 在启动渲染前被拒绝，HTML 本身没有报告运行错误。

逐项检查：

1. Sidebar 宽度 `160px`：端点正确，左侧束线不压标题。
2. `232px`：三条线路分流清楚。
3. `480px`：仓体停止放大并居中后仍连接图片机械口。
4. closed/open 连续切换：线路只发生亚像素级端点修正，没有肉眼跳动。
5. 滚动 01–03 → 04–06：旧线路隐藏，新线路在相同三个屏幕槽位重新连接。
6. hover/focus：线路只增亮，全息层与名称始终在前。
7. active 切换：只有当前会话出现移动信号头。
8. reduced-motion：信号停止，静态连接仍清晰。
9. 重命名、删除两段确认、新建、会话切换和蠕虫入侵仍正常。

如果当前已有开发版 Electron 实例并持有单实例锁，不要擅自关闭用户窗口。优先使用现有 Vite 热更新窗口验证；只有不存在活动实例时再运行：

```powershell
npm run smoke
```

完成标准：上述九项均有真实界面结果；不能以静态代码检查替代动态宽度、滚动和 open/closed 验收。

## 交付报告格式

完成后向用户报告：

- 新增和修改的文件
- 三档 Sidebar 宽度结果
- 04–06 滚动重锚定结果
- closed/open 端点结果
- reduced-motion 结果
- `typecheck`、`build:renderer`、`smoke` 的实际状态
- 任何因单实例锁或环境条件未执行的检查

如果某项未验证，明确写“未验证”和原因，不把静态通过表述为动态通过。

## 硬性边界

- 连接线是动态 SVG／Canvas 路径，不是覆盖整个 Sidebar 的固定 PNG。
- 端点跟随实际 `<img>`，不是会话卡边缘。
- 最多三条可见线路；六条是逻辑身份，不是六条同时出现。
- open 只表示删除待确认；连接状态与 open/closed 解耦。
- 后脑线路与嘴部蠕虫互不复用起点或状态。
- 保留当前 Neo、培育仓、Sidebar 尺寸和三槽布局。
- 保留用户现有修改，不清理无关 Git 差异。
