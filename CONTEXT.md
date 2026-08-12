# ZION — 领域词汇表

ZION 是一个以 pi agent 为底座的黑客帝国风 Windows 桌面编码 Agent：用户输入指令，真实 pi agent 会话流式执行，Matrix 风 UI 实时呈现过程与结果。

## Language

**feed**：
agent 会话在界面上的消息流呈现。一条 feed 由若干消息项组成（用户指令 / 助手回复 / 工具链块 / diff 卡）。
_Avoid_: 对话列表、聊天记录

**agent 回合**：
一次 prompt 驱动的最小执行周期：从 `agent_start` 开始，到 `agent_end` / `agent_settled` 结束。
_Avoid_: 任务、请求、session

**会话（session）**：
pi SDK 持久化的对话上下文（`~/.pi/agent/sessions/` JSONL）。界面左侧会话列表展示真实会话（首条消息摘要为标题/消息数/上次活动时间），点击切换——主进程按会话懒创建 AgentSession 实例（Map 缓存），事件转发只发当前会话；切换时 feed 恢复该会话的 user/assistant 文本历史（工具链/diff 不重建）。
_Avoid_: 聊天记录、对话

**会话状态机**：
界面全局 4 态：`READY`（空闲）/ `RUNNING`（工具执行中）/ `STREAMING`（文本流式输出中）/ `CANCELLING`（中断处理中）。由 agent 事件唯一驱动：agent_start→RUNNING、tool_execution_start→RUNNING、message_update→STREAMING、abort→CANCELLING、agent_end→READY。
_Avoid_: busy、loading

**派生信号 FX（氛围负载）**：
由会话状态派生的二元组 `{ speed, energy }`——READY 时 `{1, 0.3}`，忙碌（RUNNING/STREAMING/CANCELLING）时 `{2.2, 0.85}`。只影响氛围层（数字雨/神经核心），不承载业务信息。经模块级对象广播，不触发 React 渲染。
_Avoid_: 状态、特效开关

**工具链块（trace）**：
feed 中表示一次工具调用生命周期（开始→结束）的细线角标卡片：`[tag] 描述 …… 状态`，状态有执行中（琥珀）/完成（绿，含真实计时）/失败（红）。
_Avoid_: 工具卡、命令卡片

**编辑类工具调用**：
会对工作目录文件产生修改的工具调用（edit / batch_execute / write / apply_patch / bash 写操作[重定向/echo/printf/tee/sed -i/cp/mv/touch] 等）。它是蠕虫入侵与 diff 卡的触发源；bash 写入经启发式解析提取目标路径与内容。
_Avoid_: 文件操作、命令执行

**diff 卡**：
feed 中展示一次真实文件修改的卡片：行号列 + 红删/绿增符号列 + 代码列，以 `glitchIn` 分段扫入。增删是符号+颜色双编码。
_Avoid_: 变更记录、补丁

**蠕虫入侵**：
编辑类工具调用发生时，从神经核心释放的假名字符蛇沿 L 形路径爬向目标文件行，命中后文件名扰码解密（620ms 逐字符还原，`.` 保持不动）、行闪烁 900ms。纯装饰，不携带信息。
_Avoid_: 虫子、loader、爬行动画

**神经核心**：
侧栏顶部的同心环 canvas（外环刻度+内环虚线弧+中心点），释放蠕虫时 700ms 增能爆发（burst）。状态标签 IDLE/ACTIVE 随会话状态切换。
_Avoid_: 核心图、logo

**文件树**：
侧栏的项目目录结构，由主进程扫描工作目录（`zion:scan-tree` IPC）真实生成，目录可展开。点击文件行发送读取指令给 agent。
_Avoid_: 项目浏览器、目录列表

**日志抽屉**：
底部可折叠日志区（展开 150px），前端从事件流与状态变迁自收集（`[HH:MM:SS]` 前缀 + 四级配色），上限 120 行。
_Avoid_: 控制台、输出面板

**扫描线**：
覆盖内容之上的轻量 CRT 氛围层（每 4px 一条 0.10 黑线）。v4 收敛后仅此一项 CRT 残留。
_Avoid_: CRT 层、滤镜

**SND（UI 音效）**：
WebAudio 合成的短促提示音（send/step/reply/abort/worm/breach/toggle）。有全局开关，状态持久化在本地（`localStorage.zion.snd`）。
_Avoid_: 音效系统、beep

**错误回合**：
以 `stopReason: "error"` 结束的 agent 回合（模型/请求失败）。UI 记录红色日志并发出中止音，状态机仍回 READY。
_Avoid_: 异常、失败对话

## Rules

- 氛围资产（数字雨/神经核心/蠕虫/SND/扫描线）不得承载业务状态——业务状态只走 feed、会话状态机与日志抽屉。
- 渲染职责边界：氛围层用 canvas，数据卡（消息/trace/diff 卡/文件树）用 DOM（见 `docs/adr/0001-canvas-doom-boundary.md`）。
- 颜色纪律：单色磷光绿体系，琥珀 `#ffb000` 仅用于执行中/警示，红 `#ff5555` 仅用于危险/中断；状态必须符号+文字双编码，不单独依赖颜色。
- 开屏加载页（boot/CRT 亮线/药丸）不属于 ZION 范畴，不实现。
