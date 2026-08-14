# 黑客帝国风格参考作品调研

> 规范状态：本文是原始研究与历史记录；项目级视觉决策以根目录 [DESIGN.md](../DESIGN.md) 为唯一事实源。
> 用途：为 `ui-demo/index-v2.html`（ZION Agent 主控台 v2）的视觉/交互优化提供参考。
> 调研日期：2026-08-11

## 一、数字雨本体（技术参考）

### Rezmason/matrix — 公认最"对"的 Web 数字雨
- 链接：https://github.com/Rezmason/matrix （3.2k stars，WebGL/REGL 实现）
- 在线 demo：https://rezmason.github.io/matrix/
- README 本身是一篇考证文章，逐条分析了电影原版雨的特征。
- 可借鉴：
  - 雨柱有**深度层次**：近亮远暗、列首白色高亮（head glow）
  - glyph 图集渲染（而非逐字符 fillText），性能上限高
  - 辉光 bloom pass
  - 支持鼠标交互扰动、可定制 glyph 序列与速度
- 对 demo 的意义：当前 Canvas 2D 雨是单层平面（`CHARS` 随机闪换、固定透明度），加深度分层 + bloom 是视觉升档最快的改动。

### 终端版数字雨
- cxxmatrix：https://github.com/akinomyoga/cxxmatrix （含 banner、生命游戏等彩蛋）
- unimatrix：https://github.com/will8211/unimatrix
- cmatrix：https://github.com/abishekvashok/cmatrix
- 可借鉴：字符不是每帧随机闪换，而是**偶尔"滚动翻动"**，更接近电影质感。

## 二、电影中的真实 UI 设计（格调参考，价值最高）

### Matrix Reloaded — Zion 控制室 UI
- 文章：https://www.hudsandguis.com/home/2012/05/16/the-matrix-reloaded-ui-design
- 设计师访谈（Toby Grime，Pushing Pixels）：https://www.pushing-pixels.org/2018/01/08/the-art-and-craft-of-screen-graphics-interview-with-toby-grime.html
- 设计特征：环形透明显示屏、细黑线几何图形、单色、抽象、分层纵深。
- 对 demo 的意义：与"满屏绿光"相反的克制方向——**留白、细线条、几何抽象**。适合用在 trace 卡片、HUD 转角括线、图表类组件上。

### Matrix code 字符设计（Simon Whiteley / Animal Logic）
- 考证文章：https://beforesandafters.com/2019/03/27/secrets-of-the-matrix-code/
- 事实核查（Snopes）：https://www.snopes.com/fact-check/the-matrix-code-sushi/
- 关键事实：
  - 字符集来自设计师妻子的**日文寿司食谱书**，选用笔画简洁的**半角片假名**
  - 混合**镜像翻转的拉丁字母和阿拉伯数字**
  - 藏有一个公牛头符号（Matrix Revolutions 片尾可见）
  - 绿色源自 1970-80 年代绿色磷光 CRT 显示器（便宜、余辉长），标准值 `#00FF41`
- 对 demo 的意义：当前 `CHARS` 全是正向字符，**加入镜像字符是电影感的关键细节**，改动成本极低。

## 三、官方互动网站（交互叙事参考）

### thechoiceisyours.whatisthematrix.com（《黑客帝国4》官网）
- 报道：https://www.thenationalnews.com/arts-culture/film/2021/09/08/the-matrix-resurrections-interactive-website-lets-fans-choose-between-red-and-blue-pill/
- 复活了 1999 年的老域名 whatisthematrix.com。
- 交互：进门先选**红药丸 / 蓝药丸**，不同选择播放不同旁白的预告片。
- 对 demo 的意义：boot 序列结尾已有 "The Matrix has you."，可在其后加一步红/蓝药丸选择，作为进入主控台的仪式（选蓝丸可以彩蛋式地退回 boot 或显示一行玩笑文案）。

## 四、科幻终端应用 / UI 框架（布局结构对标）

### GEEKTyper / Hacker Typer
- https://geektyper.com/
- 假黑客模拟器：多主题、分屏模块布局（地图、终端、频谱、日志同时跑）。
- 可借鉴：模块密度与配色分区方式。

### eDEX-UI（布局直接对标，重点参考）
- https://github.com/GitSquared/edex-ui （40k stars，2021 年归档，设计仍是标杆）
- TRON 风全屏终端：系统监控、文件树、虚拟键盘全集成。
- 与 demo 的 "sidebar + console + term" 三栏结构几乎一一对应，值得逐个画面对照。

### Arwes — React 科幻 UI 框架
- https://arwes.dev/
- 三件套：霓虹边框系统（frames）、入场动画系统、**UI 音效系统（bleeps）**。
- 对 demo 的意义：demo 目前纯视觉；科幻 UI 的沉浸感一半来自音效。哪怕只给 boot 完成、消息发送、trace 步骤完成加三个短促 blip 音都值。

## 五、CRT 显示还原（氛围层）

### cool-retro-term / Cathode
- https://github.com/Swordfish90/cool-retro-term
- 完整 CRT 特征清单：**屏幕曲率、辉光晕影、亮度抖动（jitter）、烧屏残影、开机高压亮线**。
- demo 现状：已有 scanlines + vignette。
- 可补：
  - 屏幕曲率（容器 `border-radius` + 轻微 barrel distortion 视觉暗示）
  - 随机亮度抖动（对 scanlines 层 opacity 做小幅随机扰动）
  - boot 开始时的高压亮线展开动画（一道白线拉开成画面）

---

## 落到 demo 的行动清单（按性价比排序）

| # | 改动 | 参考来源 | 成本 | 状态 |
|---|------|----------|------|------|
| 1 | 雨的字符集加入镜像片假名/镜像数字 | Simon Whiteley 考证 | 极低（改 `CHARS` 或绘制时翻转） | ✅ 已完成（v3） |
| 2 | 雨加深度分层 + 列首白点 + bloom | Rezmason/matrix | 中 | ✅ 已完成（v3） |
| 3 | boot 结尾加红/蓝药丸选择 | 官方网站 | 低 | ❌ 已取消（用户决定回退） |
| 4 | CRT 曲率 + 亮度抖动 + 开机亮线 | cool-retro-term | 低-中 | ✅ 已完成（v3） |
| 5 | 关键交互加 bleep 音效（WebAudio 合成即可） | Arwes | 低 | ✅ 已完成（v3） |
| 6 | trace 卡片 / HUD 改用细线条几何风格（克制方向） | Zion 控制室 UI | 中 | ✅ 已完成（v3） |
