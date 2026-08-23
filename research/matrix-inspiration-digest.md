# Matrix 视觉灵感调研摘要（Firecrawl 抓取整理）

> 抓取日期：2026-08-23 ｜ 来源：Firecrawl MCP 搜索 + 全文抓取
> 用途：数字雨 / 矩阵绿 / 科幻终端 UI 的实现参考速查

---

## 1. Rezmason/matrix —— 数字雨实现的事实标准

- 仓库：https://github.com/Rezmason/matrix （3.8k★，MIT）
- 在线 demo：https://rezmason.github.io/matrix （URL 参数即配置）
- 曾被 Vice Motherboard 报道，Lilly Wachowski 本人评价「比原版还好」

### 字形考古（本项目 matrixGlyphs.ts 可对照）

- 电影原版字形 = **镜像片假名 + 少量 Susan Kare 芝加哥字体字符**，并非纯假名
- 本项目（Rezmason）的字形来源：2007 年官方周边站（Path of Neo）SWF 里提取的矢量图清理版——这是最接近原版的公开字形源
- 《Resurrections》（2021）扩展字形集达 **135 个符号**，从 Hamilton 手表广告 + BUF 幕后 VFX 视频逆向恢复
- 字形数据库（非官方）：https://docs.google.com/spreadsheets/d/1NRJP88EzQlj_ghBbtjkGi-NbluZzlWpAqVIAq1MDGJc
- 免费字体：Matrix-Code.ttf（经典）/ Matrix-Resurrected.ttf（新）—— 项目已有 Matrix-Code.ttf

### 关键实现结论（对 RainCanvas / 雨轨直接有用）

- **2D 雨的字形固定不动**：我们看到的「雨滴」只是**照亮静止网格的光波**，字形本身不移动（fallSpeed 调到接近 0 可验证）
- **颜色不是单色绿**：先做 bloom 泛光，再色调映射到绿色调色板——「先发光后上色」是电影感的关键
- **雨点节奏**：同列可有多颗雨点、速度各异但**永不碰撞**，用锯齿波调制实现；锯齿尖端 = 亮头 cursor
- **字形轮转**：《Reloaded/Revolutions》片头的字形按固定重复序列变化（见字形数据库）
- 渲染走 GPU：字形转 MSDF 纹理保边缘锐利；雨点状态是 GPU 纹理粒子，CPU→GPU 每帧数据量可忽略
- 变体参考：operator（贴近第一部电影操作员屏幕：平、密、无渐变）、nightmare / paradise（想象的前代 Matrix，异色代码）

### 可调参数清单（URL 参数，试手感用）

`numColumns` / `fallSpeed` / `cycleSpeed` / `raindropLength` / `slant` / `bloomSize`(0.4) / `bloomStrength`(0.7) / `cursorIntensity`(2.0) / `glintIntensity` / `palette` / `density` / `volumetric` / `forwardSpeed`(3D)

---

## 2. 矩阵绿的色彩学 —— Pixflow

- 原文：https://pixflow.net/blog/the-green-color-scheme-of-the-matrix/

### 要点

- 绿 = 80/90 年代单色荧光屏的磷光绿，直接指认「这是机器的世界」；真实世界戏份则用去饱和冷色调对照
- 无官方 hex；近似值：亮绿 **#00FF00**，电影实际色调更暗沉，接近 **#1B4D3E / #2C6E49**（去饱和 + 加对比后的结果）
- 电影感做法（可迁移到 CSS/canvas）：中间调和高光推绿、红色/肤色去饱和、整体加对比——不是「叠一层绿色滤镜」
- 布光阶段就介入：实拍时用绿色 gel 滤光，后期只是加强
- 对照参考：《Blade Runner》蓝橙对立（未来=冷蓝，人性=暖橙）；《Resurrections》刻意偏离矩阵绿用更自然的调色——绿色本身承载了「旧 Matrix」的叙事含义

---

## 3. eDEX-UI —— 科幻终端布局参考

- 项目：https://github.com/GitSquared/edex-ui （已归档停更，但视觉仍是标杆）
- 灵感源：《TRON: Legacy》董事会场景（不是 Matrix）

### 可借鉴的布局手法

- **全屏仪表盘式布局**：终端居中，周围一圈实时数据模块（CPU/内存/进程/网络/文件浏览器）——信息模块围绕主工作区
- **文件浏览器跟随 cwd**：目录面板随终端工作目录实时联动，点击文件把路径输入终端——面板与主区有「数据血缘」
- 主题即 JSON：`src/assets/themes/` 下 tron / blade / matrix 多主题并存，主题是纯数据而非代码分支
- 支持 CSS 注入做深度定制

### 注意

- 该项目已停止维护，只取视觉/布局灵感，不取代码
- CSDN 原文为 AI 辅助生成的介绍文，信息密度低；如需深入直接看 GitHub 仓库的 media/ 截图和 themes/ 目录

---

## 对当前项目的可执行建议

1. **雨轨/RainCanvas 校准**：用 Rezmason 在线 demo 的 URL 参数（`fallSpeed`/`cycleSpeed`/`bloomSize`）找到目标手感，再把数值迁回组件
2. **「先泛光后上色」**：数字雨/字符元素的渲染顺序——亮度场 → bloom → 绿色调映射，而非直接画绿色字符
3. **语义色纪律的论据**：矩阵绿在电影里 = 虚拟/受控世界；琥珀/红保留给「真实/异常」与电影语法一致
4. eDEX-UI 的「周围数据模块 + 中央工作区」布局可为状态栏/侧栏信息密度提供参考
