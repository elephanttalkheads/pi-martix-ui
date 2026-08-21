# 侧边会话栏科幻风 UI 设计灵感调研

> 用途：为 ZION 侧边会话栏（工作区 + 会话列表）提供新设计方向选型。现「机柜顶 + 盘位 + 会话硬盘」机架服务器隐喻（`ui-demo/matrix-drive-vault-sidebar.html`）视觉不被认可，本文调研可替换的科幻视觉语言。
> 调研日期：2026-08-21
> 姊妹篇：`research/matrix-style-references.md`（黑客帝国本体调研，本文不重复其内容，只找新变化）

## 〇、设计约束摘要（一切灵感必须过这道筛子）

来自 `docs/matrix-drive-vault-sidebar-measurements.md` 的硬约束：

- 侧栏宽 **330px**，可用内容宽约 306px；会话行高 **32~34px**，工作区组高 `34 + N × 34px`。
- 必须同时容纳**多个工作区 × 多个会话**（样例：4 工作区 / 11 会话），密度贴近真实 agent 工具，不是海报式 FUI。
- 每行实际信息量很小：1 个图标槽 + 一行标题 + 一个时间戳。装饰元素争夺的是这 34px 内的注意力。
- 项目基调：磷光绿 `#00ff41` 系、等宽字体、CRT 扫描线、数字雨已存在——新方案要么与这套语言共生，要么提供足够强的替代性世界观。
- 现机柜方案的病根（后文多处印证）：**三种材质体系（琥珀顶梁 / 冷青导轨 / 绿黑硬盘）在 34px 行高里互相抢戏**，每个元素都在喊"看我是硬件"，层级反而模糊。

---

## 一、黑客帝国：从"满屏绿"到"克制几何"的新变化

已有调研（`matrix-style-references.md`）覆盖了数字雨与 Zion 控制室 UI，但结论主要落在主控台/卡片组件上。**对侧边栏这个高密度列表，Zion 控制室的克制方向还没被真正用过**——这是 Matrix 方向尚未挖掘的新变化。

### 经典手法

- Zion 控制室 UI（Reloaded）：环形透明显示屏、**细黑线几何图形、单色、抽象、分层纵深**，与"满屏绿光"相反方向。来源：[HUDS+GUIS: The Matrix Reloaded UI Design](https://www.hudsandguis.com/home/2012/05/16/the-matrix-reloaded-ui-design)。
- Matrix code 的绿色本是 1970-80 年代绿色磷光 CRT 的余辉色，标准值 `#00FF41`；字符集含镜像翻转片假名。来源：[befores & afters: Secrets of the Matrix code](https://beforesandafters.com/2019/03/27/secrets-of-the-matrix-code/)。

### 映射到 330px × 34px 列表

- **去掉雨、去掉材质填充**。工作区行 = 一条 1px 细线 + 行首 12px 环形刻度弧（圆环刻 4~8 道缺口，暗示"节点"）；会话行 = 纯文本，行首一截 2px 竖线段表示隶属于上方工作区（树状缩进的 Matrix 式表达）。
- 层级全靠**线宽和留白**区分：工作区 1px 亮绿线，会话 1px 暗绿 hairline；当前会话用单行反白（黑字绿底）而不是发光盒子。
- 镜像片假名只出现在 hover/激活瞬间的字形扰动里（项目已有 `matrixGlyphs.ts` 字符集），平时列表完全干净——"雨"退到触发式动效层。

### 可落地技法

- 全部 CSS：`border-bottom: 1px solid rgba(0,255,65,.18)` 分隔线；工作区环形刻度用 SVG `<circle stroke-dasharray>` 12×12px；反白用 `background: var(--energy); color: #000`。
- 行扰动：对标题文字做一次性 glyph 洗牌动画（替换字符再还原，`steps()` 逐帧），成本极低且已有先例（Feed 的注入解码）。
- **风险**：克制方向与品牌行已有的重型像素 Logo、Neo 头像同框时可能显得"上面很吵下面很静"，需要同时收敛品牌行。

---

## 二、攻壳机动队：公安九课战术终端

### 经典手法

- 1995 剧场版：**screen-green 单色**、多层半透明绿色剖面叠加（scifiinterfaces 明确批评"过多透明叠层造成混淆"——这是给我们的反面教训）、武器准星与目标准星**双括线分离**、监控画面左上 `REC` 闪烁标 + 右下时间码。来源：[scifiinterfaces.com: Ghost in the Shell (1995) 总评](https://scifiinterfaces.com/category/ghost-in-the-shell-1995/)。
- 《Innocence》(2004)：**亮橙单色 on 纯黑**、形状利落、动画极紧（tight animation）。来源：[HUDS+GUIS: UI Design — Ghost in the Shell 2](https://www.hudsandguis.com/home/2011/10/17/ui-design-ghost-in-the-shell-2)。
- 共同语言：**目标括线（corner brackets）**、同心弧表示"置信度/锁定进度"、十字细准星、单色 + 最多一个强调色、英文大写小字号军事标注。

### 映射到 330px × 34px 列表

- 会话行 = 一条"战术行"：左侧 4px 竖排刻度（3 道 tick 像标尺），右侧时间戳降级为 10px 大写英文式标注（`21H AGO`）。
- **当前会话 = 目标括线**：四角 L 形括线框住整行（不填充），配一段同心弧"锁定"扫过动画（`steps()`，400ms 完成即静止，不循环）——比现在的发光 LED 盒更"锁定目标"而非"硬件通电"。
- hover = 次级小括线（只有左右两条竖括），形成 1995 年电影里"武器准星 vs 目标准星"的两级体系。
- 工作区行 = 顶部一条 HUD 标头带：`SEC.01 ▸ deepseek-zion —— 03 SESSIONS` 式编号，行尾用细线延伸到右缘。
- 反面教训落地：透明叠层最多两层（行底纹 + 括线），绝不像电影那样叠到看不清。

### 可落地技法

- 括线：一个 SVG `<path>` 画四角 L 形，`stroke-width:1.5`，定位 `inset:1px`；或用 `clip-path: polygon()` 裁出一个只有四角的边框 div。
- 同心弧锁定动画：SVG 圆弧 `stroke-dashoffset` 从满到零，`animation: ... steps(12) forwards`。
- 单色调色板：全部 `--energy` 系 + 一个强调色（警告/正在运行的会话用琥珀 `#e97b4c`，与 Innocence 橙黑传统呼应）。

---

## 三、玲音（Serial Experiments Lain）：NAVI 与 Wired 的层叠美学

### 经典手法

来源：[SatchiiKoma: Serial Experiments Lain — 20 Years of "Present Day, Present Time"](https://satchiikoma.wordpress.com/2018/12/18/serial-experiments-lain-20-years-of-present-day-present-time/)（制作组访谈综合，中村隆太郎/安倍吉俊/小中千昭）。

- **负空间即世界观**：大量留白、长镜头空镜；"空洞"本身就是 Wired 渗出的暗示。导演自述灵感来自"翻绘本时页与页之间的间隔"。
- **戈达尔式屏上排印**：超大字号标题文字直接压在画面上（每话标题卡 `Layer:01` 式编号是标志性语言）。
- **不完整/破碎的图层**：Wired 侧的头像是残缺的、边缘被裁掉的；数字与模拟混合合成产生脏边缘。
- **红色斑块阴影**（splotchy red shadows）：在黑白灰画面里用不规则红色块暗示"另一层现实"。
- NAVI 本体：玲音自己攒的超规格机器——裸线、外露零件、层层堆叠的设备。是"个人机器"美学，不是机房美学。

### 映射到 330px × 34px 列表

- 工作区 = 一张 `LAYER:01` 编号卡：超大编号（28px）压在小字工作区名上，**编号与名字重叠**（层叠，而非分栏），大量行内留白。
- 会话行 = 打字机式纯文本，不用任何盒子；**当前会话用"双重曝光"**：标题文字渲染两层、错位 1px（一层绿一层白），像信号串扰，而不是发光。
- 层级用"渗透"表达：工作区之间的分隔不是线，而是一块 6px 高的噪点/斑块带（红改绿），像 Wired 从缝隙渗出。
- 列表静止时异常安静（负空间），动作全集中在切换会话的 300ms 里：整列轻微 vertical jitter + 色差错位一闪而过。

### 可落地技法

- 色差错位：`text-shadow: 1px 0 rgba(0,255,65,.8), -1px 0 rgba(255,255,255,.35)`（chromatic aberration），仅 active 行启用。
- 层叠编号：工作区行内 `<b>LAYER:01</b>` 绝对定位、`z-index` 压在名字下方、`opacity:.25`、字号放大 2 倍。
- 斑块分隔带：`background` 用 `radial-gradient` 多点位随机斑 + `filter: blur(1px)`，或 6×N 的 Canvas 噪点条。
- **风险**：这是五部必选项里最"艺术片"的方向，密度表达力最弱；适合会话数量少时惊艳，量大时可能显得乱。

---

## 四、赛博朋克 2077：功能色纪律与切角面板

### 经典手法（以及官方翻车教训）

来源：[Interface In Game: Cyberpunk 2077 — UX/UI Critique](https://interfaceingame.com/articles/cyberpunk-2077-ux-ui-critique/)（60+ 小时实机 UX 长评）；色彩分析：[知乎：《Cyberpunk 2077》UI 有话好好说](https://zhuanlan.zhihu.com/p/338397354)。

- **技能树的排线连接线**：主界面用排线（ribbon cable）风格的斜向连接线把大块面板连起来，一眼传达"在给设备接线升级"——与项目已有的 NeuralCable 神经线缆直接同源，是最值得偷的一手。
- **功能色纪律（正面教训的反面）**：2077 的黑客界面把可用 quickhack、RAM、目标数据全用同一种红+黄混在纯装饰元素里，被批评"装饰与功能不分层"；解法是**装饰元素独占一个低亮度色系，功能元素独占高亮色**。
- **状态动态隐藏**：血量满时不显示血条——映射到列表：没有活动的会话行不显示任何状态装饰，装饰只在需要传达信息时出现。
- 面板语言：切角矩形（右下/左上斜切）、互补霓虹色板（黄/红/蓝对撞）。
- 地图单色红导致区域不可分——教训：**多工作区之间必须有可区分的编码**（色相微差、纹理或编号，不能只靠位置）。

### 映射到 330px × 34px 列表

- 会话行 = 切角条：`clip-path` 左上/右下各切 4px（现硬盘 clip-path 已有此基因），但**行背景分三级透明度**：装饰底纹 5% 亮度、可点击行 10%、当前会话 20%+亮边框——装饰永远比功能暗一档。
- 工作区 = 分区标头：斜切角标头 + 编号 + 一条向右渐隐的排线束（3 条平行细线，呼应技能树排线），天然衔接 Neo 神经线缆的视觉语言。
- 当前会话触发一次**扫描线扫过**（一条 2px 亮线从上往下扫过该行一次即停），而不是常亮 LED。
- 工作区编码：每个工作区分到一个色相偏移 ±20° 的状态点颜色（绿系内偏移，不破世界观），行首 3px 色点贯穿该组所有会话——列表扫读时靠色点列分组。

### 可落地技法

- 切角：`clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)`。
- 扫描线扫过：行内伪元素 `animation: sweep 500ms steps(16) forwards`，重放时重新挂载。
- 排线束：SVG 三条 `<path>` 平移 3px，`stroke-dasharray` 流动（复用现有 `cable-flow` 动画）。

---

## 五、铳梦 Gunnm：废铁镇的工业铭牌

### 经典手法

- 木城雪户的极密机械背景：受墨比斯（Moebius）影响的精密排线与堆积机械细节。来源：[Halcyon Realms: Gunnm — The Manga Behind Alita: Battle Angel](https://halcyonrealms.com/animation/gunnm-the-manga-behind-alita-battle-angel/)；画集评论：[Halcyon Realms: ARS MAGNA — Yukito Kishiro Art Book Review](https://halcyonrealms.com/illustration/ars-magna-yukito-kishiro-art-book-review/)；作者自述世界观构成：[fullfrontal.moe: Gunnm — Yukito Kishiro Panel in Paris](https://fullfrontal.moe/gunnm-yukito-kishiro-panel-in-paris/)。
- 废铁镇视觉词汇：**冲压金属铭牌、铆钉、序列号丝印、管道桥架、工厂警示条纹**。物件的身份靠"钉上去的牌子"表达，而不是靠发光。
- 组织密度的方式是**堆叠**：管线一层压一层、标牌一块挤一块，乱中有工业秩序。

### 映射到 330px × 34px 列表

- 会话行 = 一块**冲压铭牌**：标题文字做内凹刻蚀效果（暗色文字 + 下方 1px 亮色描边模拟刻痕高光），四角各一颗 2px 铆钉，行尾一块 6×10px 的序列号丝印区（`SN-0042` 式，可用会话 ID 哈希生成）。
- 工作区 = **管线桥架标签**：比铭牌更粗的横条，绿黑警示斜纹收边 3px，名字用丝印大写 + 工厂编号。
- 与现机柜方案的关系：**这是机柜隐喻的"正确打开方式"**——现有方案三种材质（琥珀/冷青/绿黑）互相打架，Gunnm 路线只有一种材质（黑铁）+ 一种信息工艺（冲压/丝印），密度感来自铭牌的重复堆叠而不是材质变化。若用户其实喜欢硬件感、只是嫌现在的不够好，这条是增量改良路线。

### 可落地技法

- 刻蚀文字：`color: #06110b; text-shadow: 0 1px 0 rgba(200,255,212,.25)`（暗字亮底边）。
- 铆钉：四颗 2px 圆点用 `box-shadow` 一次画出，或用四点 `radial-gradient` 背景。
- 警示条纹：`repeating-linear-gradient(45deg, var(--energy) 0 3px, transparent 3px 6px)`，只出现在工作区行的 3px 边缘。
- 全部可用纯 CSS 渐变完成，不需要位图素材——比现在的"CSS + SVG + 生成图集 screen 混合"三层方案简单得多。

---

## 六、补充方向 A：《异形》MU/TH/UR 货单终端

### 经典手法

来源：[Typeset in the Future: Alien](https://typesetinthefuture.com/2014/12/01/alien/)。

- **"Foreshadowing Inventory"**：《异形》片头用一张纯文字清单交代全部世界观——"商用拖船诺史莫号 / 船员：七名 / 货物：两千万吨矿石"。一张打字机货单就是一个界面。
- **Ron Cobb 的符号标准（Semiotic Standard）**：为全船设计的一套圆角矩形象形图标（压力、重力、咖啡……），比 iPhone 圆角图标早 28 年；特点是**粗几何、单色、无文字也能读**。
- 飞船上一切皆可考：开机画面直接打序列号 `NOSTROMO 180924609`；MU/TH/UR 的交互就是绿字逐行打字。

### 映射到 330px × 34px 列表

- 侧边栏 = 一张**舱单（manifest）**：无卡片、无盒子、无发光。工作区 = 舱段标题行（`CARGO BAY 01 — deepseek-zion`），上下各一条 hairline；会话 = 舱单条目，三列等宽对齐：`状态符号 │ 标题 │ 时长`。
- 图标槽不用文件夹/硬盘图，用 Cobb 式符号标准：一个 16×16 圆角方框内的粗几何符号（会话=横三行、运行中=三角、错误=叉）。
- 当前会话 = **整行反白**（绿底黑字），像老终端的光标行；这是所有方向里选中态成本最低、可读性最高的方案。
- 序列号细节：侧栏底部常驻一行 `ZION SIDEBAR 330×870 // REV 0.2`，呼应 Nostromo 开机序列号。

### 可落地技法

- 几乎是全项目成本最低的方向：`font-family` + `border-bottom: 1px hairline` + `display:grid; grid-template-columns: 20px 1fr auto` + `active { background: var(--energy); color:#000 }`。
- Cobb 符号：16×16 内联 SVG，`stroke-width:2.5`，圆角方框 `rx:3`。
- 可叠加现有 CRT 扫描线层（manifest 本来就是 CRT 时代的产物），氛围无损。

---

## 七、补充方向 B：真实服务器机架 / Blinkenlights 美学

### 经典手法

- 前面板指示灯（blinkenlights）传统从 PDP-11 延续至今——一排小灯本身就是信息密度极高的界面。来源：[The Register Forums: Das blinkenlights are back](https://forums.theregister.com/forum/all/2018/05/21/raspberry_pi_pdp_11_revival/)。
- 真实机架的好看来自三件事：**严格模数网格（1U 步进）、单一信息载体（灯 + 丝印）、大量重复**。参考素材检索入口：[Dreamstime: Server Rack Lights 图库](https://www.dreamstime.com/illustration/server-rack-lights.html)。

### 映射：这是"为什么机柜方案不好看"的诊断书

现有 demo 其实踩中了真实机架的每一条反面：

- 真实机架全机柜**同一种漆色**，信息全靠灯和丝印；demo 用了琥珀顶梁/冷青导轨/绿黑硬盘三套材质。
- 真实机架的 1U 设备**高度一致**；demo 顶梁 34px、盘位 34px、硬盘 32px 嵌套，视觉上每行有三层框。
- 真实机架的灯**小而多**；demo 每行只有一颗 LED，信息载体太单薄。

若要救机柜（而不是换掉它）：把 34px = 1U 的模数保留，**全列表统一为一种黑铁漆**，每行信息压缩为"丝印标题 + 一列 4~6 颗小灯（活动/工具/错误/时间片轮换）"，灯列用 `steps()` 做非同步闪烁。此路线与第五章 Gunnm 铭牌路线可以合并执行。

---

## 八、综合方向建议（三个互斥方向，供选型）

### 方向 A：舱单终端（MU/TH-UR Manifest）

- **一句话**：侧边栏是一张会呼吸的飞船货单——纯文字、细线、反白选中，科幻感来自 Cobb 符号与序列号细节，而不是任何"硬件感"。
- **关键元素**：hairline 分隔线 / 三列等宽网格 / 16×16 Cobb 式圆角符号 / 当前会话整行反白 / 底部常驻序列号行 / `BAY 01` 式编号。
- **与机柜隐喻的关系**：**彻底放弃**。机柜顶/盘位/硬盘三层结构全部删除，34px 模数保留但不再解释为"机架单位"。
- **成本**：最低（纯 CSS + 少量 SVG 图标）；**风险**：最"不 Matrix"，与现有重型品牌行反差最大，需同步收敛品牌区。来源基底：第六章 + 第一章克制路线。

### 方向 B：九课战术栏（Section-9 Rail）

- **一句话**：侧边栏是公安九课的战术索引面板——单色荧光、目标括线锁定当前会话、排线束连接工作区，功能色与装饰色严格分层。
- **关键元素**：四角 L 形目标括线（选中）/ 双侧竖括（hover）/ 同心弧锁定扫过动画 / 工作区斜切角标头 + 排线束 / 状态色纪律（装饰 ≤5% 亮度，功能独占高亮绿，警告用琥珀）/ 行首工作区色点列。
- **与机柜隐喻的关系**：**替换**。LED 与刻度的"仪表感"保留，材质皮肤全部砍掉；NeuralCable 神经线缆自然融入排线语言（2077 技能树排线与 NeuralCable 同源）。
- **成本**：中（SVG 括线 + clip-path + 既有 steps 动画体系可复用）；**风险**：括线 HUD 是科幻 UI 最常见套路，辨识度靠执行精度。来源基底：第二章 + 第四章。

### 方向 C：Wired 层叠（Layer Stack）

- **一句话**：侧边栏是 Wired 渗透进现实的一层——负空间、超大编号与名字层叠、选中态是双重曝光色差错位，安静到反常，动效只在切换的 300ms 里爆发。
- **关键元素**：超大 `LAYER:XX` 编号压在名字下 / 会话纯文本无盒子 / 当前会话 1px 色差双影 / 工作区之间 6px 噪点斑块渗出带 / 切换时整列 vertical jitter 一闪 / 大量留白。
- **与机柜隐喻的关系**：**摧毁**。这是三个方向里世界观替换最彻底的——从"你在操作一台机器"变成"你在凝视一个网络的横截面"。
- **成本**：中低（text-shadow / 绝对定位层叠 / 噪点 Canvas 条）；**风险**：密度表达力最弱、可读性最依赖动效克制，会话一多容易显乱；但辨识度最高，也最契合"玲音式孤独终端"的情绪。来源基底：第三章。

> 备注：若用户其实仍想要硬件感、只是嫌现方案不够好，第五章（Gunnm 铭牌）+ 第七章（blinkenlights 诊断）构成第四条"机柜强化"增量路线：统一黑铁单材质、冲压铭牌化会话行、灯列化状态。它不与 A/B/C 并列，而是现方案的修复手术。

---

## 引用来源

1. HUDS+GUIS — The Matrix Reloaded UI Design: https://www.hudsandguis.com/home/2012/05/16/the-matrix-reloaded-ui-design
2. befores & afters — Secrets of the Matrix code: https://beforesandafters.com/2019/03/27/secrets-of-the-matrix-code/
3. scifiinterfaces.com — Ghost in the Shell (1995) 分类总评: https://scifiinterfaces.com/category/ghost-in-the-shell-1995/
4. HUDS+GUIS — UI Design, Ghost in the Shell 2 (Innocence): https://www.hudsandguis.com/home/2011/10/17/ui-design-ghost-in-the-shell-2
5. SatchiiKoma — Serial Experiments Lain: 20 Years of "Present Day, Present Time": https://satchiikoma.wordpress.com/2018/12/18/serial-experiments-lain-20-years-of-present-day-present-time/
6. Interface In Game — Cyberpunk 2077 UX/UI Critique: https://interfaceingame.com/articles/cyberpunk-2077-ux-ui-critique/
7. 知乎专栏 — 《Cyberpunk 2077》UI 有话好好说: https://zhuanlan.zhihu.com/p/338397354
8. Halcyon Realms — Gunnm, The Manga Behind Alita: Battle Angel: https://halcyonrealms.com/animation/gunnm-the-manga-behind-alita-battle-angel/
9. Halcyon Realms — ARS MAGNA, Yukito Kishiro Art Book Review: https://halcyonrealms.com/illustration/ars-magna-yukito-kishiro-art-book-review/
10. fullfrontal.moe — Gunnm: Yukito Kishiro Panel in Paris: https://fullfrontal.moe/gunnm-yukito-kishiro-panel-in-paris/
11. Typeset in the Future — Alien: https://typesetinthefuture.com/2014/12/01/alien/
12. The Register Forums — Das blinkenlights are back (PDP-11): https://forums.theregister.com/forum/all/2018/05/21/raspberry_pi_pdp_11_revival/
13. Dreamstime — Server Rack Lights 图库（机架素材检索入口）: https://www.dreamstime.com/illustration/server-rack-lights.html
14. 项目内部基线 — docs/matrix-drive-vault-sidebar-measurements.md；research/matrix-style-references.md；ui-demo/matrix-drive-vault-sidebar.html
