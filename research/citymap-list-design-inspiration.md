# CITY INDEX 会话列表：极简风格设计灵感调研

> 日期：2026-08-28（网络抓取同日）
>
> 对象：`ui-demo/city-map-dvd-menu-proto.html`（280px 侧栏、单栏、中文标题列表，V0 REPLICA / V1 CHAPTERS / V2 CRT / V3 SIGNAL 四变体）
>
> 问题：保持 Matrix DVD 菜单极简基调下，列表项信息层级、选中/悬停态、状态表达（READY/THINKING/STREAMING/TOOL/ERROR）还能怎么做。
>
> 约束：状态色纪律保留（绿/琥珀/青/红语义）；拒绝纯装饰；一切可落地到 280px 单栏。

## 1. 左缘刻度条选中态（2px accent bar）

- 【手法】选中行不用 `>` 光标，改用行首 2px 竖条 + 文字提亮。GitHub Primer NavList 的当前项即「左侧竖条 + 浅底 + 加粗」三件套中最克制的一档，VS Code 侧栏同构。
- 【来源】[Primer NavList](https://primer.style/components/nav-list)（抓取 2026-08-28）
- 【效果】选中信号从「行内字符」变成「行的几何属性」，标题从第 0 列对齐，列表整体更安静、扫读更快；中文标题不被 `>` 挤占 1 个全角位的视觉宽度。
- 【落地提示】`.item.is-current::before { content:""; position:absolute; left:0; top:4px; bottom:4px; width:2px; background:var(--status-color,#46e572); }`，行加 `position:relative; padding-left:12px`，选中态同时把标题 color 提到 `#d8ffe2`。

## 2. 反视频整行选中（reverse video）

- 【手法】终端最原教旨的选中表达：整行反色（绿底黑字），源自 MU/TH/UR / Alien: Isolation 终端菜单。Lucas Pettersson 复刻 Isolation 终端主菜单的过程稿展示了 hover/选中全靠反色与字符高亮两级。
- 【来源】[Lucas Pettersson — ALIEN Main Menu Terminal UI 过程稿](https://www.lucaspettersson.net/alienterminal.html)、[Art of the Title — Alien: Isolation](https://www.artofthetitle.com/title/alien-isolation/)（抓取 2026-08-28）
- 【效果】选中行成为列表里唯一的「实体块」，比 `>` 更有重量，且零新增图形元素——极简主义者的最强选中态。
- 【落地提示】V3 SIGNAL 已接近此式；补齐细节：`.item.is-current { background:#46e572; color:#021007; }` 时让 `.meta` 同步 `color:rgba(2,16,7,.72)`（现 proto 第 234 行已做），再补 `.item.is-current .idx` 同色，避免半反色脏边。

## 3. 「每轮迭代删一个元素」的极简纪律

- 【手法】GMUNK 在 TRON: Legacy 的王座厅玻璃界面上「每次迭代继续简化」，最终得到 uber-minimal 方案；董事会议室投影则回到 grid-based 平面构成。极简不是风格选项，是删减流程。
- 【来源】[GMUNK — TRON Throne Room](https://gmunk.com/tron-throne-room)、[GMUNK — TRON Board Room](https://gmunk.com/tron-board-room)（抓取 2026-08-28）
- 【效果】证明「网格对齐 + 单色 + 大字距」足以承载科幻感，无需辉光与粒子。对本列表：去掉一项装饰（如章节标题的装饰线、序号列）只做 A/B，保留更安静的那个。
- 【落地提示】把 V2 CRT 的 `.idx` 序号列与 `.crt-head` 扫描线各做一个 `display:none` 对照变体，肉眼投票；胜出的删代码不保留开关。

## 4. 状态表达缩写化：单词 → 三字母码 / 单字符

- 【手法】Cyberpunk 2077 终端/邮件列表与 eDEX-UI 都用「短标签 + 语义色」而非完整单词；THINKING 9 字符在 280px 里太吵。科幻终端传统是缩写：RDY / THK / STR / TUL / ERR，或单个符号 `● ◐ ≫ ⚙ ✕`。
- 【来源】[Game UI Database — Cyberpunk 2077 截图集](https://www.gameuidatabase.com/gameData.php?id=439&autoload=16306)、[GitSquared/eDEX-UI](https://github.com/gitsquared/edex-ui)（抓取 2026-08-28）
- 【效果】`.meta` 列从「9px 英文长单词」缩到「9px 三字码」，右侧留白增加，列表呼吸感显著提升；色彩语义不变。
- 【落地提示】改 proto 第 314 行 STATUS 表：`label` 换三字码；或纯字符方案 `.meta { font-size:10px }` 放 `●`（ready）/`◐`（thinking，加 CSS 旋转动画）/`≫`（streaming 逐个点亮）。

## 5. 悬停打字机 / 字形扰动（hover scramble）

- 【手法】serial experiments lain 的 Wired/NAVI 界面以打字机逐字显现为标志性动效（"present day, present time"）。映射到列表：hover 行标题触发一次 200ms 内的字形扰动（Matrix 假名随机替换→定版），与项目既有「字形蛾光标/注入解码」语汇同源。
- 【来源】[Serial Experiments Lain wiki — NAVI](https://lain.wiki/wiki/NAVI)（抓取 2026-08-28）
- 【效果】零布局变化、零新颜色，只用「文字本身」做 hover 反馈——最贴 Matrix 世界观的悬停态。仅 hover 触发一次，不循环，不吵。
- 【落地提示】`mouseenter` 时对 `.title` 跑 scramble：每 24ms 把 1-2 个未锁定字符换成 `matrixGlyphs` 随机字，6 帧内收敛；字符宽度用 `ch` 单位占位避免 reflow。

## 6. 二级信息降饱和：时间列永远比标题暗两档

- 【手法】Territory Studio 在 Blade Runner 2049 全程用受限制的「有机、脏旧」调色板，靠明度层级而非色彩数量区分信息；Dune 2 的极简 AR 界面也是单一色相内做层级。
- 【来源】[Territory Studio — Blade Runner 2049](https://territorystudio.com/project/blade-runner-2049/)、[scifiinterfaces — 2024 HUD 对比](https://scifiinterfaces.com/2025/03/24/the-huds-of-2024/)（抓取 2026-08-28）
- 【效果】标题 `opacity 1` / 时间 `opacity .38` / 章节 `opacity .55 + 字距 +0.2em`，三档明度即完成信息分层，不引入第二字体第二色相。
- 【落地提示】统一成 CSS 变量阶梯：`--fg: #46e572; --fg-dim: rgb(70 229 114 /.38); --fg-faint: rgb(70 229 114 /.18);`，替换 proto 里散落的 rgba 字面量（147、191、223 行等）。

## 7. 章节标题的技术性装饰：细线 + 右对齐计数

- 【手法】HUDS+GUIS 收录的 Ghost in the Shell / Oblivion FUI 里，分组标题常见「全大写小字 + 通栏细线 + 右端小号数据（计数/编号）」三件套——装饰全部来自排版，无图形素材。
- 【来源】[HUDS+GUIS](https://www.hudsandguis.com)、[Territory Studio — Ghost in the Shell](https://territorystudio.com/project/ghost-in-the-shell/)（抓取 2026-08-28）
- 【效果】BAY 章节从「一行文字」变成「一行仪器刻度」，分组感增强且仍为纯文本 DOM。
- 【落地提示】`.chapter { display:flex; align-items:baseline; gap:8px; font-size:9px; letter-spacing:.25em; opacity:.55; }`，标题后放 `flex:1; border-top:1px solid var(--fg-faint)`，右侧加 `<span class="count">03</span>`（组内会话数）。

## 8. hover 与 selected 分层：hover 只给 4% 底，不给边框

- 【手法】IBM Carbon 结构化列表把 enabled/hover/focus/selected 拆成独立 token：hover 是极浅底色，selected 才出现强调元素。悬停若上边框或加粗会引发相邻行位移，破坏终端的静止感。
- 【来源】[Carbon — Structured list usage/style](https://carbondesignsystem.com/components/structured-list/usage/)（抓取 2026-08-28）
- 【效果】鼠标扫过列表时是「水面微光」而不是「逐个弹起」；选中行（§1/§2）与悬停行一眼可辨。
- 【落地提示】`.item:hover { background:rgb(70 229 114 /.05); }`，禁止 `:hover` 改 `font-weight/border/padding`；transition 120ms linear，与雨幕的慢节奏一致。

## 不推荐清单（看起来酷，不适合本组件）

- **3D 透视墙 / 轨道舱 / 总线布局**（见 `research/sidebar-session-redesign-inspiration.md`）——面向 330px+ 的自由画布，280px 单栏里中文标题全部截断，且违背本次「极简列表」诉求。
- **eDEX-UI 式全屏仪表盘**（键盘、top、globe 模块堆砌）——它的酷来自密度，恰是本列表要删的东西。
- **glitch 大故障 / RGB 色散特效**——纯装饰，破坏中文小字号可读性；项目语汇里「故障」只属于 ERROR 状态瞬间，不能常态铺满列表。
- **卡片化会话项（图标 + 圆角 + 阴影，Mobbin 主流 App 风）**——圆角卡片与「磷光字符终端」世界观冲突，且吃掉 280px 里 20px+ 横向空间。
- **VS Code 式多层缩进树**——两级以上缩进在 280px 下中文标题只剩 6-8 字，BAY 单层分组已是上限。
- **选中行辉光外溢（box-shadow blur 20px+）**——与数字雨背景叠加后糊成一片，反视频（§2）或刻度条（§1）的硬边才配磷光字。
- **状态彩色图标列（每行 5 个状态小圆点）**——一行一个状态是事实，一列点阵是噪音；状态只许出现在 `.meta` 位或左缘条色（§1/§4）。
