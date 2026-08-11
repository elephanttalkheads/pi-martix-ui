# 交接文档：ZION Agent 主控台 demo → 实际 Agent UI

> 目标会话任务：把 `ui-demo/index-v3.html` 这个纯前端原型转换为接入真实 pi agent 后端的可用 Agent UI。
> **明确范围限制：开屏加载页面（boot 序列、CRT 开机亮线、红蓝药丸等）不需要实现。** 它们只是演示氛围层，转换时直接丢弃。

## 当前状态

- 工作目录：`D:/pi-martix-ui`
- 最新 demo：`ui-demo/index-v3.html`（单文件、无构建、纯 Canvas 2D + WebAudio，零依赖）
- 原始版本：`ui-demo/index-v2.html`（未改动，可作为对照基线）
- 设计参考调研：`research/matrix-style-references.md`（含 6 项优化清单及完成状态，勿重复调研）
- 风格规范：`ui-demo/brand-spec.md`（存在但本次会话未细读，接手时先读）

## demo 结构速览（index-v3.html，约 1650 行）

全部内联在一个 `<style>` + 一个 `<script>` 中。关键模块：

- **视觉层（转换时可保留或按需裁剪）**：数字雨 canvas（深度分层+镜像字形+bloom）、透视网格地板、3D 神经核心（线框二十面体+轨道粒子）、神经负载频谱、扫描线/暗角/CRT 曲面/亮度抖动覆盖层、鼠标视差。
- **全局联动状态 `FX`**：`{ speed, glow, load }`，`setBusy()` 在流式输出时驱动核心加速、频谱升高——**这是与真实 agent 状态对接的天然挂点**。
- **音效模块 `SND`**：WebAudio 合成 bleep（send/step/reply/abort/blip/boot），状态栏有 `SND: ON/OFF` 开关。
- **编辑演示层（最新新增，对接真实编辑事件时价值最高）**：
  - `releaseWorm(targetRow, done)`：全屏 `#worm` canvas（z-index 60，pointer-events 穿透）上一条 16 节片假名字符蛇，从输入区沿折线路径爬到文件树目标行；头部亮白带 bloom、尾部渐暗、正弦摆动。命中后目标行触发 `wormHit` 放电高亮 + `.ft-dot.firing`，0.95s 自动清理
  - `addDiffCard(file, rows)`：feed 区 diff 修改卡——行号列 + `+/-/·` 符号列 + 代码列，删除行红色半透明底（`#ff8f8f`）、新增行绿色底（`--fg` + 辉光），逐行 `lineIn` 扫入（每行延迟 40ms），对角几何角标与 `.trace` 风格统一
  - 触发流程：点文件树任意文件 → 演示一次「编辑该文件」（trace 定位→释放蠕虫→渲染差异 → 蠕虫爬行 → feed 展示 diff）；输入 `/edit`、`编辑 xxx.js`、`修改 xxx` 时解析文件名，经 `findPathByName()` 反查完整路径后走同一流程
  - `findFileRow(path)`：按完整路径或文件名定位文件树节点；目标在侧栏可视区外时手动 `scrollTop` 滚动居中（刻意避开 `scrollIntoView`）
- **会话逻辑（需要替换为真实实现的 mock）**：
  - `REPLIES` 数组 + `pickReply()`：正则匹配的假回复脚本
  - `streamReply()`：逐字符假流式输出（含中断逻辑 `abortStream`）
  - `runTrace()`：假工具调用步骤动画
  - `send()` / `addMsg()` / `addTrace()` / `renderInline()`：消息管线，**接口可保留，数据源换成真实的**
  - `FILE_TREE` 数组：硬编码假文件树，`buildTree()` 渲染
  - 日志终端 `tlog()`：假环境日志（`ambient` 数组每 7s 一条）
  - 状态栏 `tokenCount`/`uptime`：本地假计数
- 每个 UI 区块有 `data-od-id` 属性（boot/titlebar/sidebar/console/feed/inputbar/term/statusbar 等），便于按区块拆解。

## 转换时的建议映射

| demo 中的 mock | 替换为 |
|---|---|
| `REPLIES` / `pickReply` | 真实 agent 会话接口（pi agent 的后端/RPC） |
| `streamReply` 的 setTimeout 逐字输出 | 真实 SSE/streaming token 回调，保留中断按钮 → abort 真实请求 |
| `runTrace` 假步骤 | 真实工具调用事件流（tool call start/end） |
| `addDiffCard` 的假 diff 数据 | 真实编辑工具返回的 diff/patch 结果（卡片 UI 可直接保留） |
| `releaseWorm` 的演示触发 | 保留为编辑事件的可视化：由真实「文件被修改」事件驱动，目标行来自 `findFileRow(真实路径)` |
| `/edit` 命令解析 + `findPathByName` | 真实指令路由；`findPathByName` 逻辑在接真实文件树后可复用 |
| `FILE_TREE` 硬编码 | 真实工作目录文件树 API |
| `ambient` 假日志 | 真实 agent 日志/事件总线 |
| `tokenCount` / latency 假数据 | 真实用量统计 / 连接状态 |
| `agent-card` 三卡硬编码 | 真实 agent/会话列表 |

## 注意事项

- 音效和 boot 依赖首次用户手势解锁 AudioContext；去掉 boot 后，`SND.unlock` 的手势监听逻辑已在，无需额外处理。
- 性能：数字雨的 `shadowBlur` 只用在 5% 字形上，不要全量开，会掉帧。
- demo 针对桌面宽屏，<900px 直接隐藏侧栏，没有真正的移动端适配。
- 无测试、无构建管线；转正式实现时的工程化决策（框架、状态管理、是否保留单文件）留给下个会话。

## Suggested skills

- `codebase-design` — 设计 demo→正式 UI 的模块边界（渲染层 / 状态层 / agent 通信层的接缝）
- `prototype` — 若需先快速验证某个真实数据流接入方案再正式动工
- `research` — 若需调研 pi agent 的真实 API/事件流格式
- `tdd` — 若正式实现落在有测试设施的项目里
