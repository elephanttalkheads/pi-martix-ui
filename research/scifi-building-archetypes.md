# 科幻建筑造型调研：ASCII 会话城建筑原型选型

> 用途：为 `ui-demo/ascii-cyberpunk-sidebar-prototype.html` 的「工作区=建筑」点云造型提供候选原型与选型建议。
> 姊妹篇：`research/the-matrix-human-power-plant-pod-tower.md`（发电厂塔方案，已退回，废案见 `ui-demo/废案/`）
> 技术约束事实源：`docs/ascii-cyberpunk-sidebar-design.md` §6（投影与点云）、§7（字形白名单）
> 调研日期：2026-08-22

## 0. 筛选标准（先过这道筛子再谈美学）

每个候选造型必须能用以下三件事表达，缺一不可：

1. **稀疏静态点云**：启动时生成一次，正面网格约 100×184 世界单位（13×22 段），侧面深 74。
2. **白名单字形**：34 片假名 + 数字（无 6）+ `* + < > : |`。注意 `:` `*` `+` `>` `<` 已被会话状态字典占用（READY/THINKING/STREAMING/TOOL/ERROR），建筑边缘大量使用这些符号会与状态语义打架，选型时需权衡。
3. **单点透视**：辨识度必须来自**轮廓几何（silhouette）和点的密度/能量分布**，不能依赖纹理、渐变或复杂曲线。曲线轮廓（圆顶、抛物线）在 13 段横向分辨率下基本是废的。

附加约束：每栋楼承载 3–6 条横向「会话字形带」（11 字形宽，行距 21）；侧栏 280px，建筑正面投影后通常只有 100–200px 宽。

## 1. 候选原型逐个评估

### 1.1 银翼杀手 Tyrell 金字塔（Blade Runner, 1982）

**出处与经典画面**：开场俯瞰镜头的两座深色阶梯金字塔，塔顶一扇亮窗。剧本设定为「700 层金字塔」，制作设计 Lawrence Pauli 把顶层办公室称为 "Establishment Gothic"；视觉未来主义者 Syd Mead 负责城市整体设计（[American Cinematographer 1982 年 7 月刊制作设计文，全文转载](https://scrapsfromtheloft.com/movies/blade-runner-1982-production-design-and-photography-american-cinematographer/)；[ASC 官网同文](https://theasc.com/articles/blade-runner-set-design)）。

**Silhouette 一句话**：底宽顶尖的对称三角，带 2–3 级阶梯收分，塔顶一点光。

**点云表达**：
- 斜边是天然优势：白名单里 `<` 和 `>` 本身就是 45° 斜线字符，左边缘全用 `<`、右边缘全用 `>`，边缘能量最高，轮廓在点云里异常清晰。
- 内部密度从下往上递减（底部稠密、塔尖只剩边缘），模拟电影中「底部沉入城市雾、顶部孤悬」的镜头感。
- 顶部 1–2 行用近白绿高亮，呼应塔顶办公室亮窗。
- 基座加一级外扩台阶（宽 120，高 20），防止三角直接插进街道。

**会话字形带挂哪**：斜面内的横向带随高度自然变短——顶层带最短、底层带最长。这反而可以编码会话序号（最新会话在顶部短带），是全部候选里唯一「造型帮助信息编码」的。

**280px 可辨认度风险**：低。梯形/三角在任意投影距离下都是最强剪影之一。主要风险是与 EVA NERV 金字塔（§1.8）撞型，二者只能选一。

### 1.2 《大都会》新巴别塔（Metropolis, 1927）

**出处与经典画面**：Fritz Lang 的表现主义巨作，城市正中的 New Tower of Babel——对称阶梯退台式 Art Deco 摩天楼，是电影海报和几乎所有俯瞰镜头的中心（[The Genealogy of Style：从巴别塔到大都会](https://thegenealogyofstyle.wordpress.com/2014/12/08/from-babel-tower-to-metropolis/)；[Art Déco 对大都会布景的影响](https://www.decimononic.com/blog/the-influence-of-the-art-deco-movement-in-fritz-langs-metropolis)；[IAAC 博客：大都会的巨构摩天楼](https://blog.iaac.net/cyborg-skyscrapers-and-utopian-visions-through-the-lens-of-metropolis/)）。

**Silhouette 一句话**：婚礼蛋糕式 3–4 级对称退台，中轴一根细尖顶。

**点云表达**：
- 每级退台是一个变窄的矩形框，竖边全用 `|`，退台拐角（90° 转角）恰好用 `+`——白名单与退台几何严丝合缝。
- 中轴一列高能 `:`（或片假名）从基座直通尖顶，制造「纪念碑中轴」。
- 顶部尖顶用 3–5 个纵向递减的点表达，不做复杂天线。

**会话字形带挂哪**：每级退台的台面就是天然水平带位——退台级数 ≈ 会话条数，造型与「楼层=会话」的隐喻完全同构。

**280px 可辨认度风险**：中。退台节奏是它唯一的识别点，13 段横向分辨率下最多做 3 级退台（100→70→40），再细就糊成普通方楼。

### 1.3 Half-Life 2 城堡 / Citadel（17 号城市）

**出处与经典画面**：Viktor Antonov 主设计，retail 版是一根三角棱柱方尖碑，高到顶端没入云层；从 2001 年「锈蚀尖塔」到 2002 年 E3 圆柱版再到最终棱柱版的完整演化有详尽档案（[Combine OverWiki：Citadel design evolution](https://combineoverwiki.net/wiki/Citadel_design_evolution)，含 Antonov 概念图与各版模型）。

**Silhouette 一句话**：一根上细下粗的深色方尖碑，顶部消失在雾里。

**点云表达**：
- 正面从 100 宽收窄到顶部约 30；竖边 `|` 为主，接近顶部时密度整体衰减 + 字形透明度降低，直接复刻「顶部入云」——这在 184 世界单位高的固定框里用顶部淡出就能表达，不需要真做云。
- 基座两侧加两条 `<` `>` 斜线扶壁（电影中基座的 buttress/depot 结构）。
- 内部几乎不做窗格，保持「无窗巨石」感。

**会话字形带挂哪**：立面窄，会话带只能做成 5–7 字形的短带竖向堆叠。这是它的代价：与城市隐喻里「一根高耸入云的单一权威之塔」一致，但承载会话的舒适度是候选里最差的。

**280px 可辨认度风险**：低-中。剪影极强，但横向太窄导致会话带和 DOM Portal 的投影宽度吃紧（原型要求 Portal 宽 132–174px，窄塔近景时 Portal 会比楼还宽，视觉倒挂）。

### 1.4 Blade Runner 2049 Wallace 公司总部

**出处与经典画面**：美术指导 Dennis Gassner；外景是穿出云层的巨大深色斜坡梯形巨构，顶部几乎只有一处光（Wallace 的盲人办公室）；室内灵感来自京都古寺（[Vanity Fair 制作设计报道，经此页转引](https://architectureofsilence.wordpress.com/2018/02/13/architecture-of-wallace-tower/)；[Failed Architecture：2049 的粗野主义辨析](https://failedarchitecture.com/is-it-really-brutalist-architecture-in-blade-runner-2049/)）。

**Silhouette 一句话**：一块顶平的实心斜坡梯形巨石，顶部一点孤光。

**点云表达**：与 Tyrell 相反的能量分布——内部高密度实心、几乎无窗格，只有边缘略亮，用「实心感」表达无窗巨石；顶部正中一个 `*` 单点（白名单里 `*` 同时是 THINKING 状态字形，单点使用尚可接受）。基座做一条水平「雾线」：底部 20 单位密度骤降。

**会话字形带挂哪**：反常识——带只能像「凿进石面的刻痕」，短而少。更适合作为「档案馆/冷数据」类工作区的语义，不适合会话频繁增删的工作区。

**280px 可辨认度风险**：中-高。远看与 Tyrell 金字塔同为「深色梯形」，必须靠顶平（vs 顶尖）和实心（vs 中空窗格）区分；两者不宜同时出现在一座城市里。

### 1.5 TRON（1982）电子世界塔 / MCP

**出处与经典画面**：Syd Mead、Moebius（Jean Giraud）、Peter Lloyd 共同设计电子世界；MCP 本体是红色旋转三角棱柱塔（[ASC：《TRON》制作史](https://theasc.com/article/making-of-tron-1982/)；[Heritage Auctions：Syd Mead 的 31 张 TRON 概念艺术照片](https://comics.ha.com/itm/animation-art/photograph/tron-concept-art-photographs-by-syd-mead-group-of-31-walt-disney-1982-total-31-/a/7311-19022.s)）。

**Silhouette 一句话**：矩形塔身，顶部双角天线——轮廓上就是「一块电路板元件立起来」。

**点云表达**：轮廓贡献少，辨识度全在内部：用 `|` 画垂直干线、`+` 画电路节点，塔身内部做成走线网格；顶部两个 `*` 亮点作天线。

**会话字形带挂哪**：横向带即「数据总线」，挂在干线交汇处，语义自洽。

**280px 可辨认度风险**：高。**它违背了筛选标准第 3 条**——辨识度依赖内部纹理而非轮廓，而远距/FOCUS 档下内部细节最先被雾吃掉，退化成默认矩形楼。作为候选偏弱，除非专门为它接受「近景彩蛋型」定位。

### 1.6 攻壳机动队（1995）新港市高楼群

**出处与经典画面**：美术监督小仓宏昌、布局渡部隆；场景摄影参考香港与九龙城寨（拆除前由 Higami Haruhiko 系统拍摄）；白天是「打了类固醇的粗野主义」，夜里是雨浸霓虹（[032c：Anime Architecture 策展人 Stefan Riekeles 访谈](https://magazine.032c.com/magazine/anime-architecture-ghost-shell-built)；[framerated.co.uk 评论](https://www.framerated.co.uk/ghost-in-the-shell-1995/)）。

**Silhouette 一句话**：平顶高密方楼，楼间有天桥，下半截泡在水里。

**点云表达**：矩形楼 + 「外挂物」——侧面用 `>` 做小突出（天线、外挂机、逃生梯），楼与楼之间拉水平细线做天桥；基座做「水位线」：底部数行密度骤降变暗，像立面淹进运河。

**会话字形带挂哪**：立面等距窗带天然存在，正常挂。

**280px 可辨认度风险**：中-高。单栋正面看就是普通方楼，辨识度全在「群像+天桥+水线」，而原型里工作区是孤立的单栋地标。适合做**默认/背景楼型**，不适合做旗舰地标。

### 1.7 阿基拉（1988）新东京塔林

**出处与经典画面**：美术监督水谷利春团队；柏林 Tchoban 基金会《Akira – The Architecture of Neo Tokyo》展收录 59 件制作背景与设定（[Colossal 报道](https://www.thisiscolossal.com/2022/06/akira-architecture-neo-tokyo/)；[KGDA 展讯](https://www.kgd-a.org/press/en/explore-akiras-neo-tokyo-through-rare-artworks-by-the-legendary-animes-art-directors)）。标志性画面：夜幕下全是随机亮窗的高密塔林。

**Silhouette 一句话**：平顶方塔，无收分——辨识度不在轮廓，在立面光点节奏。

**点云表达**：矩形楼身，用确定性种子把 20–30% 的窗格点提亮、其余压暗，复刻 Akira 著名的「不规则亮窗」；会话带用连续 11 字形的高亮横带，与随机窗点形成节奏对比，会话带反而更容易跳出来。

**会话字形带挂哪**：正常挂，且是候选里「带 vs 背景肌理对比度」最好的。

**280px 可辨认度风险**：高（作为地标）/ 无（作为默认型）。轮廓与现有默认矩形楼相同，等于「默认楼的氛围升级版」。

### 1.8 EVA NERV 总部 / 第三新东京市武装大楼

**出处与经典画面**：NERV 本部是 GeoFront 中央的黑色金字塔（[EvaWiki：Nerv Headquarters](https://wiki.evageeks.org/Nerv_headquarters)）；第三新东京市是要塞都市，摩天楼在使徒来袭时整体沉入地下（[EvaWiki：Tokyo-3](https://wiki.evageeks.org/tokyo-3)）。

**Silhouette 一句话**：NERV = 无窗纯黑正金字塔；Tokyo-3 武装楼 = 平顶方楼 + 顶部两个武器舱突起。

**点云表达**：NERV 金字塔的点云方案与 §1.1 Tyrell 完全同型（撞型，二选一）。Tokyo-3 楼型更有意思：矩形楼身 + 顶部一对 `*` 突起；「缩入地下」可以做成建筑点云整体下移沉降的动画——天然对应「工作区归档/折叠」语义。

**会话字形带挂哪**：Tokyo-3 楼型正常挂；NERV 金字塔无窗立面，会话带只能做「刻在锥面的亮纹」，可行但怪。

**280px 可辨认度风险**：中。NERV 与 Tyrell 撞型；EVA 梗对非受众识别度低，属于「懂的人会心一笑、不懂的人看是普通楼」。

### 1.9 黑客帝国 Machine City 01

**出处与经典画面**：《第二次文艺复兴》中的机器城 01 与 Revolutions 结尾 Neo 飞入的机械城：针状尖塔丛 + 发光脉络；DNEG 在续作中把机械设施拆解为 Foetus Fields / Power Stacks / Roots（[The Art of VFX：DNEG 访谈](https://www.artofvfx.com/the-matrix-resurrections-huw-evans-vfx-supervisor-with-benjamin-cowell-thomas-environment-supervisor-keith-roberts-animation-director-mike-nixon-fx-supervisor-dneg/)；[机器设计概念图汇编](https://drawyourweapon.com/machine-designs-and-concept-art-of-the-matrix-movies/)；命名背景见[姊妹篇调研](./the-matrix-human-power-plant-pod-tower.md)）。

**Silhouette 一句话**：一簇 3–5 根不等高的尖针塔挤在一起。

**点云表达**：多根窄塔合并为一栋「簇」，塔顶全用 `*` 尖点，塔间留垂直暗缝。

**会话字形带挂哪**：每根塔挂一条短带，会话数=塔根数——但这破坏了「每栋楼统一 3–6 条等宽带」的现有布局，改造成本高。

**280px 可辨认度风险**：高。**关键历史教训**：发电厂塔方案（同属 Matrix 机器美学，有机复杂结构）刚被用户退回（废案在 `ui-demo/废案/ascii-cyberpunk-sidebar-prototype-powerplant.html`）。针塔簇轮廓更硬、可行性高于发电厂塔，但「Matrix 自家巨构」这条路已有一次失败记录，建议不作为首发。

### 1.10 星球大战科洛桑 / 死星（定位为背景层，而非地标）

科洛桑是「整个星球被城市覆盖」的密集塔林，单栋无地标性（概念源头可追溯到 Ralph McQuarrie 时代的 Had Abbadon 设定，[Coruscant 视觉史梳理](https://numidianprime.wordpress.com/2020/03/30/a-history-of-coruscant/)）；死星是球形，100×184 的点云框里无法表达。**结论：不做工作区地标，但「远景无限后退的密集塔林剪影」正是填充城市纵深、替代纯雾的好材料**——用极低密度的远距矩形轮廓即可。

## 2. 选型建议

评估维度：**实现成本**（点云生成逻辑相对现有 `createBuildingPoints()` 的改动量）× **辨识度**（280px 透视下的剪影强度）× **会话带兼容度**（3–6 条等距横带挂得是否自然）。

### 推荐组合（一座城市混合 4 种剪影）

| 角色 | 原型 | 一句话理由 | 成本 |
| --- | --- | --- | --- |
| 旗舰地标 | **Tyrell 金字塔**（§1.1） | 全候选最强剪影；`<` `>` 斜边是白名单白送的；带长随高度变短天然编码会话序号 | 中（生成逻辑从矩形网格改为按高度收分） |
| 次地标 | **Metropolis 退台塔**（§1.2） | 退台=楼层，与「会话=建筑层」隐喻同构；`|` `+` 与退台几何严丝合缝 | 中（3 级嵌套矩形框） |
| 纵向对比 | **HL2 Citadel 方尖碑**（§1.3） | 打破全城横宽楼的节奏；顶部淡出白送「入云」效果 | 低（收窄矩形 + 顶部密度衰减） |
| 默认/背景型 | **Akira 亮窗方楼**（§1.7）+ 攻壳水位线（§1.6） | 现有矩形楼加确定性亮窗种子即成；水位线、外挂物作为低成本变体参数 | 极低 |

不首发：Machine City 针塔簇（发电厂塔刚被退回）、TRON（辨识度靠纹理违背筛选标准）、NERV 金字塔（与 Tyrell 撞型）、Wallace 巨石（与 Tyrell 远看混淆 + 会话带不友好）。

### 混合策略评估：推荐采用

「每个工作区一种剪影」直接兑现设计文档的核心命题——工作区是**可记忆的稳定地标**（`ascii-cyberpunk-sidebar-design.md` §18 第 1、2 条）。空间记忆靠轮廓差异，比靠颜色（`color` 字段）更鲁棒，因为颜色不能作为唯一状态信号（§5.1）。

统一性风险的对策：所有楼型共享同一套**生成规则**（边缘能量 > 窗带 > 稀疏填充、同一字形白名单、同一雾衰减），只变化**轮廓参数**（收分曲线、退台级数、高宽比、顶部处理）。即「一种语言，四种句型」，而不是四种风格。

实施顺序建议：先做 Akira 亮窗方楼（改动最小，立刻提升现有默认楼的质感）→ Tyrell 金字塔（剪影收益最大）→ Citadel / Metropolis 按工作区数量补齐。

## 3. 引用来源

- Blade Runner 制作设计与摄影（American Cinematographer, July 1982）：https://scrapsfromtheloft.com/movies/blade-runner-1982-production-design-and-photography-american-cinematographer/ ；ASC 版：https://theasc.com/articles/blade-runner-set-design
- Syd Mead 访谈（Fantastic Films）：https://scrapsfromtheloft.com/movies/blade-runner-interview-syd-mead/
- Blade Runner 2049 Wallace Tower（转引 Vanity Fair 制作设计报道）：https://architectureofsilence.wordpress.com/2018/02/13/architecture-of-wallace-tower/ ；粗野主义辨析：https://failedarchitecture.com/is-it-really-brutalist-architecture-in-blade-runner-2049/
- Metropolis 与 Art Deco：https://www.decimononic.com/blog/the-influence-of-the-art-deco-movement-in-fritz-langs-metropolis ；https://thegenealogyofstyle.wordpress.com/2014/12/08/from-babel-tower-to-metropolis/ ；https://blog.iaac.net/cyborg-skyscrapers-and-utopian-visions-through-the-lens-of-metropolis/
- Half-Life 2 Citadel 设计演化（Combine OverWiki，含 Antonov 概念图）：https://combineoverwiki.net/wiki/Citadel_design_evolution
- TRON 制作史（ASC）：https://theasc.com/article/making-of-tron-1982/ ；Syd Mead 概念艺术：https://comics.ha.com/itm/animation-art/photograph/tron-concept-art-photographs-by-syd-mead-group-of-31-walt-disney-1982-total-31-/a/7311-19022.s
- 攻壳机动队建筑（032c × Anime Architecture 策展人访谈）：https://magazine.032c.com/magazine/anime-architecture-ghost-shell-built ；https://www.framerated.co.uk/ghost-in-the-shell-1995/
- Akira 新东京建筑展：https://www.thisiscolossal.com/2022/06/akira-architecture-neo-tokyo/ ；https://www.kgd-a.org/press/en/explore-akiras-neo-tokyo-through-rare-artworks-by-the-legendary-animes-art-directors
- EVA（EvaWiki）：https://wiki.evageeks.org/Nerv_headquarters ；https://wiki.evageeks.org/tokyo-3
- Matrix 机器城：https://drawyourweapon.com/machine-designs-and-concept-art-of-the-matrix-movies/ ；DNEG 访谈：https://www.artofvfx.com/the-matrix-resurrections-huw-evans-vfx-supervisor-with-benjamin-cowell-thomas-environment-supervisor-keith-roberts-animation-director-mike-nixon-fx-supervisor-dneg/
- Coruscant 视觉史：https://numidianprime.wordpress.com/2020/03/30/a-history-of-coruscant/
