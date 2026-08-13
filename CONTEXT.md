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

**开屏序列（待机循环）**：
无会话时的默认驻留态：全屏循环播放的氛围动画，用户选择会话或发送消息时退出并进入主界面。它是纯氛围驻留态，不是加载页——不显示进度、不阻塞任何操作；会话初始化的等待被它顺带遮盖，但它不汇报进度。
_Avoid_: 加载页、splash、boot 页、进度条

**派生信号 FX（氛围负载）**：
由会话状态派生的二元组 `{ speed, energy }`——READY 时 `{1, 0.3}`，忙碌（RUNNING/STREAMING/CANCELLING）时 `{2.2, 0.85}`。只影响氛围层（数字雨），不承载业务信息。经模块级对象广播，不触发 React 渲染。
_Avoid_: 状态、特效开关

**工具链块（trace）**：
feed 中表示一次工具调用生命周期（开始→结束）的细线角标卡片：`[tag] 描述 …… 状态`，状态有执行中（琥珀）/完成（绿，含真实计时）/失败（红）。
_Avoid_: 工具卡、命令卡片

**命令面板（palette）**：
输入栏以 `/` 开头触发的弹出清单，聚合本机全部 skills（用户级/共享/项目/扩展包/settings.skills）与命令（内置 21 个 + 扩展白名单），主进程 `skillscan.mjs` 扫描、`zion:list-commands` 传输；↑↓/Enter/Tab/Esc 操作，选中 skill 插入「运行技能 X：」、命令插入 `/name`（执行语义属宿主 TUI 层，面板只做插入）。
_Avoid_: 快捷菜单、autocomplete

**编辑类工具调用**：
会对工作目录文件产生修改的工具调用（edit / batch_execute / write / apply_patch / bash 写操作[重定向/echo/printf/tee/sed -i/cp/mv/touch] 等）。它是蠕虫入侵与 diff 卡的触发源；bash 写入经启发式解析提取目标路径与内容。
_Avoid_: 文件操作、命令执行

**diff 卡**：
feed 中展示一次真实文件修改的卡片：行号列 + 红删/绿增符号列 + 代码列，以 `glitchIn` 分段扫入。增删是符号+颜色双编码。
_Avoid_: 变更记录、补丁

**蠕虫入侵**：
编辑类工具调用发生时，从 Neo 头像口中释放的假名字符蛇沿 L 形路径爬向目标文件行，命中后文件名扰码解密（620ms 逐字符还原，`.` 保持不动）、行闪烁 900ms。纯装饰，不携带信息。
_Avoid_: 虫子、loader、爬行动画

**Neo 头像**：
侧栏顶部的像素风 Agent 头像（闭嘴/张嘴两帧）。仅在蠕虫释放期间张嘴——蠕虫从口中吐出，释放瞬间有短暂脉冲；其余任何时候闭嘴。
_Avoid_: 神经核心（已删除的同心环装饰）、avatar

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

**凝结雨轨**：
agent 回合左侧的活动指示轨：回合流式期间一条迷你数字雨下落，回合闭环时雨消散、凝结为 ◆。是回合活动状态的可视化，不承载额外业务信息；同一时刻只有活动回合持有雨轨 canvas。
_Avoid_: 进度条、loading 条

**结算行**：
回合闭环时的统计尾行：`◆ 已结算 · N tools · Σtokens · 耗时`（tokens 为回合内各 LLM turn 的 usage 求和，耗时为 agent_start→agent_end 实测）。中断回合与错误回合照常结算，标「已中断」/「错误」。
_Avoid_: 汇总、footer

**注入解码**：
OPERATOR 消息入场时假名乱码逐位还原为文字的短动画（约 450ms）。有全局开关 DEC，状态持久化在本地（localStorage），默认开。
_Avoid_: 打字机、乱码特效

## Rules

- 氛围资产（数字雨/Neo 头像/蠕虫/SND/扫描线）不得承载业务状态——业务状态只走 feed、会话状态机与日志抽屉。
- 渲染职责边界：氛围层用 canvas（Neo 头像为 DOM 贴图例外），数据卡（消息/trace/diff 卡/文件树）用 DOM（见 `docs/adr/0001-canvas-doom-boundary.md`）。
- 颜色纪律：单色磷光绿体系，琥珀 `#ffb000` 仅用于执行中/警示，红 `#ff5555` 仅用于危险/中断；状态必须符号+文字双编码，不单独依赖颜色。
- 开屏序列属于 ZION 范畴（无会话默认驻留态），但它是氛围资产：遵守上一行的信息纪律，不显示进度、不阻塞操作。旧规则"开屏加载页不实现"仅保留其反进度假象部分：进度条/百分比/boot 自检清单仍不实现。

**项目（project）**：
agent 的工作目录及其会话上下文集合。主进程 `WORKSPACE_DIR` 可变——切换项目 = 更新工作目录 + 废弃旧会话实例（`dispose()` + sessions Map 清空）+ 按新目录 `continueRecent`/新建；最近项目持久化于 `~/.pi/agent/zion-projects.json`（path + lastUsed，上限 8），启动有最近项目自动恢复、无则打开项目选择面板；面板也可经侧栏「切换项目」随时打开。
_Avoid_: 工作区、目录切换
