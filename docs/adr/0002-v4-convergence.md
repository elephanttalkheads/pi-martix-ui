# 0002 — v4 收敛：单色磷光体系与四区布局

- 日期：2026-08-11
- 状态：视觉决策已由根目录 `DESIGN.md` 取代；状态机与数据源决策保留为实施记录

> 2026-08-15：本文的“极简收敛、照搬 v4、统一削减装饰”等视觉约束不再适用于新设计。
> 新界面和视觉重构以根目录 `DESIGN.md` 为准；下文保留用于解释既有 v4 代码与历史取舍。

## 背景

v3 迁移完成后，`ui-demo/index-v4.html` 提供了"极简 × 黑客帝国 × Pip-Boy"的收敛方向（见 `design-doc/agent-ui-reference-design.md` 与 `ui-demo/react/agent-ui-design-spec.md`），明确要求收敛 v3 的过度装饰。v4 是 demo 纯文本复刻规格，所有数值原样提取、禁止"优化"。

## 决策

1. **UI 呈现层全量按 v4 复刻**：四区布局（标题栏 / 侧栏[神经核心+Agent 卡+文件树] / 对话区 / 日志抽屉+状态栏），store 的 SDK 事件解析语义（toolCallId 匹配、`result.patch` 升级、编辑类工具识别）原样保留——规格 §11 确认真实实现只需替换 mock 层，UI 呈现照搬。
2. **装饰削减为三件**：单层数字雨（FS=18、12% 亮头、拖尾 0.035、`90/FX.speed` 帧节流）、轻扫描线（0.10）、蠕虫入侵+神经核心。移除：CRT 玻璃曲面/暗角/亮度抖动、glitch、深度分层+镜像片假名+bloom。
3. **4 态会话状态机**（READY/RUNNING/STREAMING/CANCELLING）替代 2 态 busy：事件→状态映射 agent_start→RUNNING、tool_execution_start→RUNNING、message_update→STREAMING、abort→CANCELLING、agent_end→READY。派生信号 FX 改为 `{speed, energy}`（READY `{1,0.3}` / 忙碌 `{2.2,0.85}`），经模块级对象广播，不触发 React 渲染。
4. **数据源**：文件树真实扫描（新增 `zion:scan-tree` IPC，深度 ≤3，跳过 node_modules/.git/dist 等）；Agent 卡片静态 demo 数据（真实 agent 注册表是后续工作）；日志抽屉前端自收集（事件流+状态变迁）。
5. **蠕虫触发源**：仅真实编辑类工具调用（v3 既有语义），目标定位到文件树对应行，文件不在树中则落到工具链块行；点击文件树行=发送读取指令（真实 prompt），不触发假动画。
6. **可访问性**：`prefers-reduced-motion` 全套降级（数字雨静态帧/核心静止/蠕虫跳过/动画关闭）、`aria-live`、`:focus-visible`、状态符号+文字双编码。

## 后果

- 渲染器组件重写/新增：RainCanvas（原 MatrixBg）、SignalCanvas（原 WormLayer）、NeuralCore、Sidebar、LogDrawer；Feed/DiffCard/InputBar/SoundFx 按 v4 规格重写；CrtOverlay 删除（仅剩扫描线 div）。
- SND 音效表升级为 7 音（send/step/reply/abort/worm/breach/toggle），参数照规格。
- smoke/e2e 脚本类名断言同步更新（`#rain`/`.scanlines`/`#signal`/`.sidebar`/`.trace`/`.msg.*`）。
- 已知取舍：错误回合不新增第 5 态（日志+中止音表达，状态机回 READY）；4 态期间不区分"首次 busy"与"持续 busy"（FX 只有两档，规格如此）。
