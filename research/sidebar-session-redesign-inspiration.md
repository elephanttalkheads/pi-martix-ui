# ZION 多工作区会话栏：开放式重设计灵感研究

> 日期：2026-08-22
>
> 任务：在不受旧版 `330px / 34px` 模数和纵向列表约束的前提下，为“多个工作区 + 每个工作区的全部会话”寻找大胆、前卫、可实现的空间布局。
>
> 结论：不要继续优化“机柜行”。最有价值的三个 Demo 是 **WIRED PERSPECTIVE WALL / 协议透视墙**、**NEURAL ORBIT / 神经轨道舱** 和 **IRON-CITY MEMORY BUS / 记忆总线**；它们分别验证空间档案、轨道拓扑和生物机械总线三种完全不同的产品轮廓。

## 1. 这次研究与旧方案的边界

本研究以项目视觉宪章 [`DESIGN.md`](../DESIGN.md) 为最高视觉基线。它要求 ZION 先建立可记忆的世界、视觉主角和状态叙事，允许环形、放射、透视、纵深、越界和非对称构图；因此侧边栏不再被视为一个必须塞进窄矩形的普通导航列表。

旧版 [`docs/matrix-drive-vault-sidebar-measurements.md`](../docs/matrix-drive-vault-sidebar-measurements.md) 仍有价值，但只作为**数据密度样本**：其 Demo 曾在一个画面内放入 4 个工作区、11 个会话，并保留标题、相对时间、当前态和工具入口。它不再规定新设计的宽度、行高、滚动方向、材质或空间模型。

已有 [`research/sidebar-scifi-inspiration.md`](sidebar-scifi-inspiration.md) 是历史研究，主要回答“如何在 `330 × 34px` 的纵向列表里换一层科幻皮肤”。本研究刻意超越它：

- 取消固定宽度、固定行高和“工作区标题 + 多行会话”的唯一构图。
- 多工作区必须在同一场景中可辨，不能退化成只看见一个工作区的轮播。
- 会话可以横向滚动、沿轨道旋转、在 Z 轴分层、按拓扑分布或停靠在机械骨架上。
- 3D 只负责表达层级、关系和焦点；文字和关键操作仍是可读、可聚焦的 DOM。
- 科幻作品只提供空间语法、材质反差和动态逻辑，不直接复刻角色、Logo、原画或专有界面。

## 2. 研究方法：事实、观察和推演严格分开

本文使用三种标签：

- **事实**：来源明确说明的作品设定、制作方法、交互规则或设计规范。
- **视觉观察**：基于官方项目页、官方截图或原设计团队展示素材作出的形式观察；不是原作者意图声明。
- **设计推演**：将前两者迁移到 ZION 的建议，仅代表本研究结论。

资料优先级为原设计团队项目页、官方作品站、官方开发者文档、原始论文/项目和源代码。以下没有使用作品台词或大段受版权保护文本。

## 3. 第一方灵感证据

### 3.1 《攻壳机动队》：网络不是背景，而是空间本身

- **事实**：Production I.G 对 1995 年作品的官方介绍把世界设定为全球网络、电子信息、电脑犯罪和记忆操控共存的时代；SAC 的官方介绍进一步明确公安九课擅长电脑战。[Production I.G：1995 电影](https://www.production-ig.co.jp/works/ghost-in-the-shell/)；[Production I.G：SAC](https://www.production-ig.co.jp/works/ghost-in-the-shell-sac/index.html)
- **事实**：电影版界面原设计团队 Territory Studio 说明，他们被要求避开普通平面屏幕，探索从小球体到大型交互环境的 3D 全息产品，并把技术、有机、审美与功能融合。[Territory Studio：Ghost in the Shell](https://territorystudio.com/project/ghost-in-the-shell/)
- **视觉观察**：全息核、粒子、环面和由局部显影的记忆图形，比“每个会话一个矩形卡片”更接近电脑网络的空间感。
- **设计推演**：工作区应成为可持续辨认的“子网络核”，会话是围绕它的记忆节点；选择会话时，连接路径、祖先工作区和目标节点同时显影，而不是只给一行加背景色。

### 3.2 *Serial Experiments Lain*：Layer 是天然的信息架构

- **事实**：当前官方站把世界描述为 `Real_World` 与 `Wired` 的连接，并把 13 集直接组织为 `Layer : 01–13`。[Serial Experiments Lain 官方站](https://www.serial-experiments-lain.com/)
- **视觉观察**：Layer 编号、断续字距和协议式命名天然带有“信号层 / 记忆层”的感觉；工作区之间不必靠文件夹分隔，可以靠深度、频段和干扰边界分隔。
- **设计推演**：工作区可以是多张固定视点的半透明平面，会话是嵌在平面中的数据切片；当前平面向前对焦，其余平面仍保留边缘标题、会话数和活动状态。
- **版权边界**：NBCUniversal 的 Lain 二创许可有适用主体、地域和期限等条件，不能当作通用素材授权。[Lain TTL 权利方条款](https://www.nbcuni.co.jp/rondorobe/anime/lain/ttl/)。新设计只提炼 `Layer / Wired / 信号噪声` 的抽象机制。

### 3.3 《赛博朋克 2077》：大胆效果必须能被关闭

- **事实**：CD PROJEKT RED 在 2.0 更新中把任务日志按类型分标签、简化重要信息比较，并让小地图随速度动态缩放。[Cyberpunk 2077 Update 2.0](https://www.cyberpunk.net/en/news/49060/update-2-0)
- **事实**：2.1 的无障碍选项允许增大字体/HUD、移除 HUD 视觉特效、减少装饰、移除镜头畸变。[Cyberpunk 2077 Accessibility Features](https://www.cyberpunk.net/en/news/49591/update-2-1-accessibility-features)
- **设计推演**：侧边栏可以默认拥有强烈色差、视差、扫描、信号污染和镜头感，但必须由同一数据结构提供 `CINEMATIC / FOCUS / REDUCED` 三档表现；“净信号”不是另做一套产品。

### 3.4 《铳梦》：垂直世界和可替换身体

- **事实**：讲谈社的官方作品介绍明确了“空中都市 Zalem—下方废铁镇”的垂直世界，以及从废料中找到头部、重建机械身体的核心设定。[讲谈社《銃夢（1）》](https://www.kodansha.co.jp/comic/products/0000048448)；[Kodansha：Battle Angel Alita](https://kodansha.us/series/battle-angel-alita/)
- **视觉观察**：粗粝工业外壳、机械骨架与精密生命核心之间的反差，比当前“柜顶、柜体、硬盘都像同一种盒子”更有层级。
- **设计推演**：工作区可成为粗大的脊柱、平台或接口站；会话则是轻薄、精密、可抽换的记忆片。层级通过结构尺度和材质反差表达，不靠重复套框。

### 3.5 *TRON: Legacy*：环形数据和可折叠竞赛拓扑

- **事实**：原图形设计负责人 GMUNK 说明，数据提取画面把混乱数据包组织成同心解码环；计分板用可折叠的赛程结构承载多轮、多名对象。[GMUNK：TRON: Legacy](https://gmunk.com/TRON-Legacy)
- **视觉观察**：黑场、发光细线、环面、分区刻度和大尺度负空间可以让高密度数据仍拥有清楚轮廓。
- **设计推演**：工作区映射为不同半径/倾角的环，会话映射为环上的扇区或节点；工作区和会话可以同时存在，而不必互相遮盖。

### 3.6 *Blade Runner 2049*：把数据库变成物理档案

- **事实**：原屏幕图形团队 Territory Studio 使用光学镜片、投影、microfiche、卡片档案和有机组织实验；Denabase 被设计成机械式 DNA 卡片数据库。[Territory Studio：Blade Runner 2049](https://territorystudio.com/project/blade-runner-2049/)
- **视觉观察**：不同技术阶层使用不同的表面、精度和故障程度；一张被检索出来的实体卡片可以成为焦点，其余卡片只需露出索引边缘。
- **设计推演**：工作区可成为一面透视档案墙；会话卡从墙里被机械式抽出并翻正。所有工作区仍露出固定索引条，既有戏剧性又能保持中文标题正视可读。

### 3.7 NASA：大量真实对象可以靠轨道、缩放和时间组织

- **事实**：NASA Eyes 是运行在普通浏览器中的实时 3D 数据可视化套件，可探索大量行星、卫星、小行星和任务，并支持时间前进/后退。[NASA Eyes](https://science.nasa.gov/eyes/)
- **事实**：NASA Open MCT 把对象暴露为左侧层级树中的 Domain Object，并通过 Time Conductor 让多个视图共享时间上下文。[Open MCT](https://github.com/nasa/openmct)；[Open MCT API](https://github.com/nasa/openmct/blob/master/API.md)
- **设计推演**：空间布局不应意味着随机漂浮。每个工作区需要稳定的“轨道 / 地标 / 方位”，会话位置需要可预测；相对时间可以成为所有布局共享的外圈刻度、底部导轨或前景标尺。

### 3.8 空间 UI 官方规范：少量有效深度，而不是 3D 文字灾难

- **事实**：Apple 建议用深度表达层级，但避免给文字增加深度；过多窗口会造成拥挤。Ornament 会相对窗口固定并略微浮在前方，内容滚动时仍保持位置。[Apple Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout/)；[Apple Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments)
- **事实**：Microsoft Mixed Reality 建议在多对象场景中使用持久地标、外围提示和注意力引导，并把控件贴近其所控制的内容。[Microsoft Holographic frame](https://learn.microsoft.com/en-us/windows/mixed-reality/design/holographic-frame)
- **设计推演**：侧边栏最多使用三层有效深度：固定控制层、当前工作区层、背景工作区层。搜索、新会话、视图切换等工具固定在前景；会话标题永远正视，不沿极端透视变形。

### 3.9 真实交互模型：图、树、横向滚动都已有可验证基础

- **事实**：GitHub Actions 为每次运行生成实时图，用于监控和调试作业进度。[GitHub Actions：Visualization graph](https://docs.github.com/en/actions/how-tos/monitor-workflows)
- **事实**：D3 的力导向模拟提供节点和作用力的确定接口，可在初始化完成后停止模拟。[D3 Force Simulation](https://d3js.org/d3-force/simulation)
- **事实**：CSS Scroll Snap 允许横向/纵向滚动容器在逻辑区段上停靠；W3C 也提醒不能用强制停靠造成内容不可达。[W3C CSS Scroll Snap](https://www.w3.org/TR/css-scroll-snap-1/)
- **事实**：WAI-ARIA Tree View 把父子层级、展开/收起、焦点与选中态明确区分，并定义了方向键键盘模型。[W3C ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- **设计推演**：视觉层可以是环、轨道、卡墙或拓扑，但语义层始终可以实现为两级树或嵌套列表；焦点与当前会话必须用不同视觉信号表示。

## 4. 九个完全不同的布局概念

### 4.1 NEURAL ORBIT / 神经轨道舱

**一句话**：Neo 是稳定的电脑地标，多个工作区是围绕神经核排列的不同轨道，会话是轨道上的记忆节点。

- **多工作区与会话**：每个工作区拥有独立颜色偏移、轨道倾角和文字标牌；全部轨道同屏可辨。每个会话在所属轨道上显示短标题、状态形状和相对时间微标。
- **交互**：上下键切换轨道，左右键沿轨道切换会话；滚轮旋转整座星仪，选中节点转到正面，但其他轨道不消失。
- **电影时刻**：工具调用脉冲从 Neo 的后脑接口穿过粗线缆进入某条轨道，目标会话亮起，轨道出现一次环形校验波。
- **技术路线**：DOM 按钮 + SVG 极坐标连接线；第一版不需要 WebGL。轨道动画用 CSS/SVG transform，所有按钮保留真实命中区。
- **风险**：会话过多时会碰撞。应使用多个同心子环或分段扇区，不能靠隐藏标题解决。
- **依据**：[Territory GITS](https://territorystudio.com/project/ghost-in-the-shell/)、[GMUNK TRON](https://gmunk.com/TRON-Legacy)、[Apple Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout/)。

### 4.2 WIRED PERSPECTIVE WALL / 协议透视墙

**一句话**：多个工作区是固定视点下的协议层/档案墙，当前工作区正视，左右工作区向纵深折叠但持续露出身份与会话切片。

- **多工作区与会话**：中央平面显示一个工作区的全部会话；两侧各至少露出两个工作区的斜面，斜面上仍显示每个会话的标题首段、状态点和时间。并非“只显示当前工作区的 Carousel”。
- **交互**：横向滚动让整面墙移动一个工作区；点会话时卡片从档案墙中抽出、翻正并连接到 Neo。搜索和新增按钮作为固定前景控制轨。
- **电影时刻**：切换工作区时，旧 Layer 发生 200ms 双重曝光并退入深处，新 Layer 像 microfiche 被机械推入焦平面。
- **技术路线**：CSS 3D `perspective` + DOM `button`；使用 3 个深度层即可，避免自由摄像机。适合先做独立 HTML Demo。
- **风险**：斜面中文不可读。解决方案不是放大透视文字，而是将背景工作区的会话文本保持正视 billboarding，或让其采用较浅透视。
- **依据**：[Lain 官方](https://www.serial-experiments-lain.com/)、[Blade Runner 2049 原设计](https://territorystudio.com/project/blade-runner-2049/)、[Apple Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments)。

### 4.3 IRON-CITY MEMORY BUS / 记忆总线（数据编组场）

**一句话**：每个工作区是横向工业总线上的粗大接口站，会话是沿总线排列的轻薄记忆片；纵向看多个工作区，横向浏览各自全部会话。

- **多工作区与会话**：工作区纵向堆叠，每条轨道左侧有固定站名、会话数和状态汇总；右侧包含该工作区全部会话并可独立横向滚动。画面始终同时显示多个工作区和每条轨道的一段会话序列。
- **交互**：纵向滚轮跨工作区，Shift+滚轮或触控板横向浏览当前轨道；CSS Scroll Snap 让会话车厢停在稳定位置。键盘上下切工作区、左右切会话。
- **电影时刻**：新会话像记忆片从黑场装入；当前会话接入时，轨道道岔转换，磷光脉冲沿真实路径抵达该模块。
- **技术路线**：纯 DOM/CSS + SVG 轨道，最容易接入 Electron、虚拟化与键盘导航。
- **风险**：每个轨道独立横向滚动可能让用户迷失。保留工作区站牌、轨道缩略条和“回到当前会话”按钮作为地标。
- **依据**：[W3C CSS Scroll Snap](https://www.w3.org/TR/css-scroll-snap-1/)、[讲谈社《銃夢》](https://www.kodansha.co.jp/comic/products/0000048448)、[Open MCT 层级对象](https://github.com/nasa/openmct/blob/master/API.md)。

### 4.4 SCRAPYARD SPINE / 废铁城脊柱

**一句话**：整个会话栏是一座从废铁镇向 Zalem 生长的垂直机械脊柱；工作区是平台，会话是停靠在平台两侧的精密义体模块。

- 多个工作区沿竖直主梁同屏排列；各自会话向左右错位停靠，形成不规则但可追踪的轮廓。
- 滚动像升降机沿脊柱移动；右侧小型总览始终显示所有平台的位置和活动状态。
- `ERROR` 是局部模块断电/冒出琥珀热量，不能让整屏红闪；`TOOL END` 是模块重新锁合。
- 优点是彻底拉开工作区骨架与会话记忆片的尺度差；风险是非对称停靠可能浪费窄屏空间。
- 依据：[讲谈社《銃夢》](https://www.kodansha.co.jp/comic/products/0000048448)、[`DESIGN.md`](../DESIGN.md) 的 Zion 物理层与生物机械链路。

### 4.5 DENABASE ROTARY / 机械卡库

**一句话**：每个工作区是一组机械滚筒式档案库，会话是 microfiche 卡片；选中时目标卡被推杆抽到前景。

- 多个工作区以多组窄滚筒并列，所有工作区名称固定可见；滚筒侧缘显示会话卡索引和状态分布。
- 点选后只移动目标卡，空间位置保持稳定，有利于形成“我记得它在第三组靠下”的空间记忆。
- 活跃会话不是整卡发光，而是卡片内部的精密扫描线工作；失败时卡片卡住并出现明确错误文字。
- 风险是大量卡片只露卡脊会损失标题；必须给每张卡保留一行横向索引，而不是只显示编号。
- 依据：[Blade Runner 2049 Denabase](https://territorystudio.com/project/blade-runner-2049/)、[Microsoft Data Mountain 原论文页](https://www.microsoft.com/en-us/research/publication/data-mountain-using-spatial-memory-for-document-management/)。

### 4.6 MISSION CONSTELLATION / 任务星座

**一句话**：工作区是稳定星系中心，会话是卫星；状态、最近访问与父子关系分别用轨道、明暗和距离表达。

- 所有工作区都在固定方位，所有会话都围绕所属中心；当前会话放大但不挤走其他工作区。
- 平移/缩放只调整观察尺度，节点不会在每次打开时随机洗牌。力导向算法只用于初次求解，随后冻结位置。
- 相对时间映射为轨道刻度，而不是把旧会话随意推远；标题、状态和 time 至少保留两项常显、第三项在固定详情条显示。
- 风险是拓扑图很容易伪造关系。连线只表达真实 `workspace → session` 归属或真实执行依赖，禁止用装饰线制造不存在的流程。
- 依据：[NASA Eyes](https://science.nasa.gov/eyes/)、[D3 Force](https://d3js.org/d3-force/simulation)、[GitHub Actions Graph](https://docs.github.com/en/actions/how-tos/monitor-workflows)。

### 4.7 EXECUTION METRO / 执行地铁图

**一句话**：工作区是不同线路，会话是站点，当前任务和工具调用沿真实线路运行。

- 多条工作区线路同屏纵横穿过，站点标签显示会话标题；线路末端可继续横向滚动。
- 当前会话的祖先线路持续高亮；失败会话是中断站，恢复后线路闭合。状态变化由真实 Agent 事件驱动。
- 适合会话之间确有分支、派生或共享任务的未来模型；如果当前只有归属关系，则只画从工作区到会话的短支线。
- 风险是图形语言会诱导用户把相邻节点理解为依赖关系，因此语义必须比装饰优先。
- 依据：[GitHub Actions Graph](https://docs.github.com/en/actions/how-tos/monitor-workflows)、[`DESIGN.md`](../DESIGN.md) 的“无假遥测”。

### 4.8 NEURAL CABLE LOOM / 神经织机

**一句话**：Neo 后脑是一台活体交换机；每个工作区是一束粗主干线缆，会话是从主干分出的神经端点。

- 多束工作区线缆以不同编织节奏横穿画面；会话按钮像标记牌固定在真实端点上。当前工作区整束进入呼吸态，当前会话只激活其中一根纤维。
- 拖动或滚动不是移动卡片，而是让织机送带；工作区标题和端点标签始终在固定标尺上对齐。
- 可以直接继承项目的 Neo、神经线缆和脉冲资产，但必须把当前“最多连接视窗内 3 个会话”的实现扩展为按工作区分束、按可见端点渲染。
- 风险是线缆密度极易遮文字；线床走背景层、可交互标签走前景层，且 Focus 模式只保留归属主干和当前路径。
- 依据：[`DESIGN.md`](../DESIGN.md) 的生物机械链路，以及 [Microsoft Holographic frame](https://learn.microsoft.com/en-us/windows/mixed-reality/design/holographic-frame) 对地标和注意力引导的建议。

### 4.9 VOLUME HARBOR / 全息泊位

**一句话**：工作区是停靠在黑场中的半透明体积窗口，会话是附着于窗口前方的二维诊断片，控制条像 Ornament 固定在最前景。

- 多个工作区体积以固定扇形泊位排列，全部保留名称、会话数和最近活动；当前泊位靠前，但其他泊位不离场。
- 会话文本永远在正视平面，只有工作区外壳和连接桥使用深度；避免把字放进旋转立方体表面。
- CINEMATIC 可有玻璃折射、体积雾和空间声；FOCUS 保留三层位移但取消折射；REDUCED 直接平铺为多列工作区。
- 风险是视觉上容易变成通用 visionOS 卡片，应加入 Zion 机械锚、线缆接驳和状态损伤，保持品牌世界观。
- 依据：[Apple Windows/Volumes](https://developer.apple.com/design/human-interface-guidelines/windows)、[Apple Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments)。

## 5. 候选筛选标准

| 标准 | 必须满足的含义 |
| --- | --- |
| 多工作区同屏可辨 | 至少 3 个工作区同时保留可读身份；选中工作区不能把其余工作区完全移出场景。 |
| 全部会话可达 | 每个工作区的数据结构中保留全部会话；可通过本工作区的轨道、滚动、空间缩放或连续变形访问，不能只显示“最近 3 条”且无入口。 |
| 语义不因风格丢失 | 标题、状态、相对时间在任何语义缩放级别都不能同时消失；至少保留可辨标题 + 状态，时间放在固定详情轨。 |
| DOM 与键盘 | 每个会话仍是 DOM `button`/链接；工作区与会话遵守两级导航。焦点和当前会话必须视觉区分。[W3C Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) |
| 深度服务信息 | 3D/透视只表达祖先、焦点和密度，不遮蔽文字、不制造不存在的依赖。 |
| 三档体验 | `CINEMATIC` 完整；`FOCUS` 降低持续运动、噪声和背景对比；`REDUCED` 直接显示稳定终态并保留完整功能。 |
| 真实状态 | 只使用真实 title/time/status/current/tool/error 数据；不做假进度、假活动和纯装饰依赖线。 |
| Electron 可实现 | 优先 DOM + CSS + SVG；WebGL/Canvas 只承载空间/氛围层，并有静态退化路径。 |

## 6. 最值得做 Demo 的三个方向

### 第一名：WIRED PERSPECTIVE WALL / 协议透视墙

这是创新、中文可读性和实现风险之间最好的平衡。

- **为什么值得做**：它真正推翻纵列，却仍能把每个工作区当作完整可理解的平面。背景工作区的斜面和索引边缘形成强烈空间轮廓，当前会话翻正的瞬间也足够成为“电影时刻”。
- **如何同时展示**：中心工作区全展开；左右各至少两个工作区保持斜面可见；每个斜面展示所有会话的压缩索引行，而不是只显示数量。
- **建议 Demo 规模**：用现有基线的 4 个工作区 / 11 个会话，再补一个 12 会话的压力组。画布提供窄、宽、全屏三档，不固定 330px。
- **要验证的未知数**：斜面中文能否在 0.75 缩放下读清；横向换工作区时是否丢失空间方位；键盘焦点是否与 3D 动画同步。
- **首选技术**：CSS 3D + DOM；不先上 Three.js。

### 第二名：NEURAL ORBIT / 神经轨道舱

这是最符合 ZION 世界观、最可能产生标志性截图的方向。

- **为什么值得做**：Neo、神经线缆、Agent 状态和多工作区拓扑可以成为一个统一系统，不再是头像旁边挂一条装饰线。
- **如何同时展示**：每个工作区是一条独立轨道；全部轨道同屏；全部会话是轨道扇区/节点。选中只改变角度、亮度和局部尺度，不隐藏其他轨道。
- **建议 Demo 规模**：先做 4 个轨道、每轨 3–8 个会话；加入长标题、中文标题、错误/运行/空闲三种真实状态样本。
- **要验证的未知数**：20–30 个节点时标签碰撞；轨道旋转是否让相对时间难读；Reduced 模式如何平坦化但保持“星仪”轮廓。
- **首选技术**：SVG 极坐标与路径动画；节点仍是覆盖在 SVG 上的 DOM button。

### 第三名：IRON-CITY MEMORY BUS / 记忆总线

这是最容易继承现有 Neo 与线缆资产、同时与旧机柜方案拉开距离的方向。

- **为什么值得做**：工作区使用粗骨架，会话使用薄记忆片，层级差异一眼可见；横向总线也天然支持“多个工作区 + 各自全部会话”。
- **如何同时展示**：多条工作区主干纵向排列或共享一根脊柱；每条主干的会话记忆片沿横向总线排列并可滚动。所有工作区站点始终留在屏幕内。
- **建议 Demo 规模**：保持 4 个工作区；每条总线分别放 2、4、8、12 个会话，以验证独立横向滚动与定位。
- **要验证的未知数**：线缆和文字是否争夺前景；多条横向滚动轨是否易用；工业材质在 Focus 模式下是否仍有辨识度。
- **首选技术**：DOM/CSS + SVG 线束 + 少量程序化噪声；可直接复用当前 Neo 资产，但不复用机柜三件套几何。

### 三个 Demo 不应过早混合

第一轮应保持三个方向互斥：透视墙验证“空间档案”，轨道舱验证“环形拓扑”，记忆总线验证“横向工业信息架构”。若一开始把三者揉在一起，就无法判断用户喜欢的是空间结构、动效还是材质。第二轮才根据可读性、定位速度和品牌辨识度组合优点。

## 7. 面向正式接入的数据与语义前提

当前生产 `Sidebar.tsx` 仍以 `currentProject + sessions` 表达单工作区；现有 `NeuralCableLayer` 只连接视窗内最多 3 个会话。因此上述概念可以先使用独立 Demo 和 mock 数据，但正式接入必须先引入工作区分组数据，例如：

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

视觉概念不能删掉现有真实语义：`title / time / status / current / rename / delete / new-session`。工作区切换、会话切换、重命名、删除和新建仍要有明确文字、键盘路径、焦点状态和必要确认。

对于空间渲染，推荐三层实现：

1. **语义层（DOM）**：工作区标题、会话按钮、时间、状态、菜单、可访问名称。
2. **关系层（SVG）**：轨道、线缆、连接、选中路径、状态脉冲。
3. **氛围层（Canvas/WebGL，可选）**：数字雨、粒子、体积雾、故障和材质；关闭后不影响导航。

当会话量增大时，可以虚拟化氛围对象，但不能让键盘和搜索结果不可达。空间节点需要稳定 ID 和稳定坐标，避免每次刷新重新洗牌，破坏用户的空间记忆。

## 8. 状态编舞基线

| 真实状态 | 空间表现 | 禁止事项 |
| --- | --- | --- |
| READY / SETTLED | 工作区地标稳定，只有低频呼吸；当前会话保持清晰。 | 不让所有节点持续抢亮。 |
| THINKING | 当前会话所在轨道/Layer/总线局部聚能，祖先工作区同步响应。 | 不生成伪百分比。 |
| STREAMING | 字形波或数据纹理沿真实路径进入当前会话。 | 不把全栏变成不可读噪声。 |
| TOOL START | 脉冲从源端沿真实连接抵达目标会话。 | 不画不存在的依赖线。 |
| TOOL END | 校验环闭合、卡片锁入或道岔归位，并保留短暂余辉。 | 不用无限循环庆祝动画。 |
| CANCELLING | 路径反相、能量安全抽离，目标恢复可操作状态。 | 不让动画终止后遗留高亮。 |
| ERROR | 只在故障节点/局部结构上断裂或越界，并显示明确错误文字和恢复入口。 | 不用整屏红闪替代信息。 |

## 9. 不要做什么

- 不要把 3D 理解成“把普通卡片倾斜 20 度”；深度必须编码工作区归属或焦点。
- 不要只让中心工作区可见、把其他工作区变成无名圆点；这违反多工作区同屏可辨。
- 不要让标题、状态和时间在缩小时全部消失；空间美学不能以语义为代价。
- 不要为好看制造假的 Agent 流程、资源占用、进度或依赖。
- 不要全屏持续抖动、色差和扫描；CDPR 的官方无障碍实践说明这些效果需要可独立关闭。
- 不要直接复制 Lain、Ghost in the Shell、TRON、Alita 或 Blade Runner 的 Logo、角色、原画和专有界面素材。
- 不要再把工作区、容器和会话做成三层相似盒子；新方案必须先建立明显不同的结构尺度。

## 10. 推荐下一步

先制作三个彼此隔离的静态/低交互 Demo，不直接改生产侧边栏：

1. `Perspective Wall`：优先验证空间关系、中文文字和键盘焦点。
2. `Neural Orbit`：验证 20–30 节点的标签碰撞、真实状态脉冲与 Reduced 平坦化。
3. `Memory Bus`：验证多工作区纵向并列 + 各工作区会话横向滚动的效率。

每个 Demo 使用同一份 4–5 工作区 mock 数据和相同会话状态，分别截图 `CINEMATIC / FOCUS / REDUCED`，再比较：首次定位当前会话的速度、多工作区辨识、长标题可读性、滚动/键盘路径、状态表达准确度、静态截图的 ZION 辨识度。只有通过这轮对比后，才选择生产方向。
