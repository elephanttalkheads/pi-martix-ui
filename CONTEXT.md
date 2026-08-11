# ZION — 领域词汇表

ZION 是一个以 pi agent 为底座的黑客帝国风 Windows 桌面编码 Agent：用户输入指令，真实 pi agent 会话流式执行，Matrix 风 UI 实时呈现过程与结果。

## Language

**feed**：
agent 会话在界面上的消息流呈现。一条 feed 由若干消息项组成（用户指令 / 助手回复 / 系统提示 / 工具调用行 / diff 卡）。
_Avoid_: 对话列表、聊天记录

**agent 回合**：
一次 prompt 驱动的最小执行周期：从 `agent_start` 开始，到 `agent_end` / `agent_settled` 结束。UI 用 busy 表示回合进行中。
_Avoid_: 任务、请求、session

**FX（氛围负载状态）**：
由 agent 活动驱动的视觉氛围参数三元组 `{ speed, glow, load }`——回合进行时抬升，空闲时衰减回基线。只影响氛围层（数字雨/CRT），不承载业务信息。
_Avoid_: 状态、特效开关

**工具调用行（tool 行）**：
feed 中表示一次工具调用生命周期（开始→结束）的消息项，带运行/成功/失败三态。
_Avoid_: trace 步骤、命令卡片

**编辑类工具调用**：
会对工作目录文件产生修改的工具调用（edit / batch_execute / write / apply_patch 等）。它是蠕虫动画与 diff 卡的触发源。

**diff 卡**：
feed 中展示一次真实文件修改的卡片：行号列 + 红删/绿增符号列 + 代码列，逐行扫入。
_Avoid_: 变更记录、补丁

**蠕虫动画**：
编辑类工具调用发生时，从输入区沿折线路径爬向目标消息项的假名字符蛇，命中后目标放电高亮。纯装饰，不携带信息。
_Avoid_: 虫子、loader

**CRT 层**：
覆盖在内容之上的显像管氛围层：扫描线、暗角、玻璃曲面、亮度抖动。纯装饰，pointer-events 穿透。
_Avoid_: 滤镜、遮罩

**SND（UI 音效）**：
WebAudio 合成的短促提示音（发送/步骤/回复/中止）。有全局开关，状态持久化在本地。
_Avoid_: 音效系统、beep

**错误回合**：
以 `stopReason: "error"` 结束的 agent 回合（模型/请求失败）。UI 呈现错误提示并发出中止音。
_Avoid_: 异常、失败对话

## Rules

- 氛围资产（数字雨/CRT/蠕虫/SND）不得承载业务状态——业务状态只走 feed 与状态栏。
- 渲染职责边界：氛围层用 canvas，数据卡（消息/diff 卡/工具调用行）用 DOM（见 `docs/adr/0001-canvas-doom-boundary.md`）。
- 开屏加载页（boot/CRT 亮线/药丸）不属于 ZION 范畴，不实现。
