# ZION Agent UI v4 设计参考与迁移规范

> 文档状态：Draft for implementation  
> 适用范围：`ui-demo/index-v3.html` 后续 v4 设计与 React renderer 迁移  
> 更新日期：2026-08-11  
> 核心目标：保留黑客帝国式沉浸感，同时让 Agent 的计划、执行、修改、校验与失败都可读、可追踪、可控制。

## 1. 结论

ZION v4 不应继续堆叠数字雨、绿色辉光和故障效果。v3 的氛围已经足够鲜明，下一阶段应把重点从“像一台科幻终端”转到“是一台可信的 Agent 控制台”。

推荐的组合方向是：

> 《黑客帝国 2》Zion 控制室的克制灰阶与机械制图骨架  
> ＋《银翼杀手 2049》的物理材质与技术阶层差异  
> ＋ TRON / Oblivion 的几何数据表达与功能优先  
> ＋ Cursor / Cascade / GitHub Copilot 的任务控制  
> ＋ LangSmith / Warp / GitHub Actions 的执行可观测性

一句话设计原则：**电影感负责建立世界观，信息架构负责建立信任。**

## 2. 设计范围与非目标

### 2.1 v4 必须解决

- 当前 Agent 在做什么、完成到哪里、是否需要用户输入。
- 工具调用、并行步骤、代码修改、校验结果和错误如何进入同一任务时间线。
- 主 Feed 如何保持简洁，同时允许查看参数、原始输出、耗时、token、退出码等技术细节。
- 运行中如何中断、追加指令、修改计划，以及完成后如何审查和回退。
- 多 Agent 或子任务出现时，如何表达所有权、依赖和隔离关系。
- CRT、数字雨、音效等氛围元素如何由真实状态驱动，并满足可访问性要求。

### 2.2 明确不做

- 不迁移开屏 boot、CRT 开机亮线、红蓝药丸选择等仪式页；这一限制已在 `pi-matrix-demo-handoff.md` 中确定。
- 不把原型中的假延迟、假 token、假 TLS、假训练状态或随机系统日志带入正式 UI。
- 不展示模型的隐藏思维链。可以展示用户可理解的计划、操作摘要和证据，不展示原始内部推理。
- 不为追求“黑客感”牺牲代码可读性、键盘操作和长时间使用舒适度。
- 不直接复制电影画面、图标、字体或受版权保护的视觉资产；参考其构图原则和信息表达方法。

## 3. v3 现状判断

### 3.1 应保留的资产

| v3 资产 | v4 定位 | 处理建议 |
|---|---|---|
| 深度分层数字雨、镜像字符、局部 bloom | 环境背景 | 保留但降噪；在代码、diff、详情抽屉下自动减弱 |
| 扫描线、暗角、CRT 曲面与微闪 | 材质层 | 保留为可配置效果，不应覆盖焦点环和细小文字 |
| `FX { speed, glow, load }` | 真实状态的视觉适配器 | 保留接口思想，改由 Agent 事件状态机驱动 |
| `SND` WebAudio 短音效 | 语义提示 | 保留 send / step / success / abort 的语义，不保留 boot 音效 |
| 线框神经核心与频谱 | Agent 状态仪表 | 从装饰动画升级为计划、工具通道和负载的状态表达 |
| `.trace` 细线几何卡 | 工具摘要块 | 改造成类型化、可展开的工具块和并行工具组 |
| `releaseWorm()` | 文件写入路径提示 | 仅用于真实文件修改事件；提供 reduced-motion 替代 |
| `addDiffCard()` | 代码变更审查入口 | 保留视觉语言，补充折叠、全量 diff、接受/撤销/定位文件 |
| 文件“突触树” | 项目导航 | 接真实工作区 API；信号脉冲仅表示实际读写事件 |
| 底部日志终端 | 运行日志 | 改为可折叠抽屉，避免长期占据主 Feed 高度 |

### 3.2 当前主要问题

1. 所有内容基本只有“消息、trace、diff”三种表现，不能完整表达 Agent 生命周期。
2. `runTrace()`、随机日志、延迟、token 和 Agent 卡状态均为 mock，视觉容易制造不存在的确定性。
3. 纯绿正文、扫描线、辉光和视差同时存在，长回复及代码审查的视觉负担过高。
4. 工具卡只有步骤名称和完成状态，缺少输入、输出、耗时、错误、退出码与父子关系。
5. 日志终端、Feed 和状态栏重复表达状态，但没有单一事实源。
6. 动效表达“很忙”，却未表达“为什么忙、忙到哪里、接下来做什么”。

## 4. 外部参考与可借鉴原则

下表中的“来源事实”来自设计团队或产品官方资料；“落地方式”是针对 ZION 的设计推导，不表示来源产品本身采用了相同实现。

| 参考 | 来源事实 | 对 ZION 的启发 | v4 落点 |
|---|---|---|---|
| Matrix Reloaded — Zion control room UI： [Toby Grime 作品视频](https://vimeo.com/11231245)、[设计师访谈](https://www.pushing-pixels.org/2018/01/08/the-art-and-craft-of-screen-graphics-interview-with-toby-grime.html)、[HUDS+GUIS 画面汇总](https://www.hudsandguis.com/home/2012/05/16/the-matrix-reloaded-ui-design) | 设计师 Toby Grime 的作品与访谈强调少色、高对比、极简，以及画面必须服务剧情和操作；HUDS+GUIS 的二手画面分析则概括出灰阶、机械制图感和基于形状/符号的控件。后者关于无标签按钮效率的讨论只是观察者推测，不作为可用性结论。 | 黑客帝国风格不等于“满屏荧光绿”。用灰阶、细线和几何结构建立秩序，把绿色留给能量与状态；控件仍须有清晰标签和可访问名称。 | 全局视觉骨架、trace / diff 角标、状态图、快捷指令 |
| [Blade Runner 2049 — Territory Studio](https://territorystudio.com/project/blade-runner-2049/) | Territory 为 15 个场景交付 100 多项屏幕资产；通过光学镜片、投影、缩微胶片和有机扫描构造“非纯数字”技术。破旧 LAPD 界面使用扭曲、重影、色彩衰减和表面纹理；Wallace 的高端系统则是纯净、极简、黑白几何界面。 | 材质应表达系统来源、年龄和权限，而不是全局随机加噪。不同区域可有不同技术“洁净度”。 | 系统日志略带旧设备质感；代码 diff 和审批界面保持锐利；不同 Agent/通道可使用不同纹理强度 |
| [TRON: Legacy — GMUNK](https://gmunk.com/TRON-Legacy) | GMUNK 团队为影片制作了 12 分钟以上全息内容；数据被组织成同心环、严格网格、折叠赛程和层叠结构。部分高密度方案最终被简化，以保证快速读取。 | 几何结构必须承载数据关系；复杂度需要随任务逐层展开，而不是一次铺满。 | Neural Core、计划环、上下文/工具通道、子任务拓扑 |
| [Oblivion GFX — GMUNK](https://gmunk.com/OBLIVION-GFX) | 官方项目页强调功能性、极简和统一亮色方案；Light Table 把地图、Drone、资源和天气拆成职责明确的屏幕；HUD 强调功能而非多余装饰。 | 先定义每块屏幕的任务，再添加科幻语汇；所有装饰必须能回答“这表示什么”。 | 会话头、状态栏、详情检查器、运行图、诊断面板 |
| [Cursor 2.0 Agent Interface](https://cursor.com/changelog/2-0) | Cursor 在侧栏统一管理 Agent 与计划；同一 prompt 最多并行八个隔离 Agent；提供跨文件集中查看变更和前台/后台计划。 | Agent 列表应是任务控制面板，不是静态角色选择器；集中审查比逐文件跳转更重要。 | Agent/Plan 侧栏、并行任务、All Changes 视图、隔离标识 |
| [Devin Desktop — Cascade](https://docs.devin.ai/desktop/cascade/cascade) | 当前第一方文档说明 Cascade 支持 Code/Chat、计划与 Todo、排队消息、命名 checkpoint/revert、实时感知和多实例。旧 Windsurf 文档 URL 已重定向到 Devin 文档。 | 长任务需要可编辑计划、follow-up 队列和明确回退点；输入框在运行中仍然有价值。 | Plan 带、Queued Follow-up、Checkpoint、Revert、继续执行 |
| [GitHub Copilot — Managing agent sessions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents) | 会话概览可监控进度、token 使用和时长；用户可查看 session log、追加 steer、停止和归档；提交可追溯到会话日志。 | 会话不是一段聊天，而是可管理、可审计的工作单元。所有指标和改动应能回到真实运行证据。 | 会话概览、Steer/Stop、完成摘要、commit ↔ session 追踪 |
| [LangSmith — View traces](https://docs.langchain.com/langsmith/view-traces) | 官方界面分 Messages、Turns、Details 三层；Details 包含输入、输出、时序、token、错误和 metadata；并行工具调用会合并为可展开的一组。 | 主 Feed 负责理解故事，详情层负责调试；并行执行不应伪装成串行步骤。 | 类型化 Feed、Turn 摘要、右侧 Details Drawer、并行工具组 |
| [Warp — Block Model](https://www.warp.dev/blog/block-model-behind-warps-agentic-development-environment) | Warp 将视口建模为类型化块列表，命令、输出、Agent 对话、工具结果和 diff 可共享同一连续流；视图层可按上下文过滤、折叠，并通过虚拟化支撑长会话。 | Feed 应由有类型、可定位、可折叠的事件块构成，而不是拼接字符串；模型与视图过滤分离。 | `FeedBlock` 数据模型、块级操作、长会话虚拟化、紧凑/展开视图 |
| [GitHub Actions — Visualization graph](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph) | 每次 workflow run 都生成实时图；节点表示 job，图标表示状态，连线表示依赖，点击 job 可查看日志。 | 当任务有三个以上依赖节点时，用图表达结构；图只做概览，日志按节点展开。 | 多 Agent/多工具依赖图、计划拓扑、节点详情跳转 |

## 5. v4 视觉原则

### 5.1 绿色从“主题色”改为“能量色”

v3 的 `#00ff41` 不再承担全部正文。建议新增中性灰绿文字层级，让荧光绿只表达：当前执行、输入焦点、成功命中、数据流向和可操作主动作。

| 语义 | 建议 token | 用法 |
|---|---|---|
| 背景 | `--bg: #000000` | 窗口底色 |
| 一级表面 | `--surface: rgba(0, 8, 2, .92)` | 主 Feed、详情面板 |
| 二级表面 | `--surface-2: rgba(0, 14, 4, .94)` | 侧栏、标题栏、抽屉 |
| 主文字 | `--text-primary: #c8d5cb` | 长回复、说明、代码外正文 |
| 次文字 | `--text-secondary: #829487` | metadata、历史状态 |
| 弱文字 | `--text-tertiary: #4c6252` | 时间、行号、非活跃说明 |
| 能量/激活 | `--accent: #00ff41` | running、focus、success、信号路径 |
| 能量弱态 | `--accent-muted: #00b32d` | 次级状态和图表 |
| 高光 | `--bright: #c8ffd4` | 当前 Agent、当前节点、小面积峰值 |
| 警告 | `--warning: #ffcc00` | awaiting、retry、paused |
| 危险 | `--danger: #ff5555` | error、stop、删除 |

规则：

- 单一视口中强荧光高亮区域不超过两个主焦点。
- 状态不得只靠颜色：同时使用图标、文字和必要的形状变化。
- 代码、diff 和长文区域禁用文字辉光；扫描线与数字雨强度降到普通区域的 20% 以下。
- 绿色成功态和红色错误态都要配可读标签，如 `SUCCESS`、`FAILED`，避免只显示圆点。

### 5.2 形状语法

- 容器以 1px 发线、直角或 2px 以内圆角为主。
- 对角角标只用于“可检查的执行对象”，如 Tool、Diff、Checkpoint，不用于普通消息。
- 环形结构表示循环、容量或多通道；折线表示流向；树/图表示依赖；不要混用语义。
- 切角按钮只用于主动作或危险动作，普通筛选和标签使用简单矩形。
- Glitch 只表示异常、链路切换或恢复，不作为固定品牌动画。

### 5.3 材质分层

- 环境层：数字雨、透视网格、暗角，低对比、不可交互。
- 产品层：侧栏、Feed、输入、详情，稳定、锐利、无随机位移。
- 数据层：图表、工具路径、diff、任务图，运动由真实事件触发。
- 异常层：短促失真、警告色、错误边框，只在明确异常时出现。

## 6. 信息架构

### 6.1 推荐桌面布局

```text
┌──────────────────────────── Titlebar / Workspace / Global status ──────────────┐
│ Agent & Plan sidebar │ Session header: state / progress / duration / tokens     │
│                      ├───────────────────────────────────────┬───────────────────┤
│ active task          │ Typed Feed                            │ Details Drawer    │
│ queued tasks         │ message / plan / tool / diff / error │ selected block    │
│ checkpoints          │ checkpoint / approval / summary      │ input/output/log  │
│ project tree         │                                       │ timing/metadata   │
│                      ├───────────────────────────────────────┴───────────────────┤
│                      │ Composer + queued follow-ups + steer/stop                 │
├──────────────────────┴───────────────────────────────────────────────────────────┤
│ Collapsible run log / connection / branch / model / context                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 三层阅读模型

借鉴 LangSmith 的分层方式，但使用 ZION 自己的术语：

1. **Timeline**：默认 Feed。回答“发生了什么”。
2. **Turn Summary**：按用户回合折叠计划、工具、修改和验证。回答“这一轮完成了什么”。
3. **Details**：右侧抽屉。回答“具体如何发生，证据是什么”。

用户不打开 Details 也应能理解任务；打开 Details 后应能完成调试和审查。

### 6.3 会话头必须可见的信息

- 会话/任务名、当前 Agent、工作区和分支。
- 状态：Ready / Planning / Running tool / Awaiting approval / Cancelling / Settled / Failed。
- 真实进度：已完成步骤数，而不是虚构百分比。
- 已用时、真实 token 或上下文用量；无数据时隐藏，不显示估算值冒充事实。
- 主控制：Steer、Stop；完成后切换为 Review changes、Continue、Archive。

## 7. 类型化 Feed 模型

### 7.1 块类型

| `FeedBlock.kind` | 默认表现 | 展开后内容 | 关键操作 |
|---|---|---|---|
| `user_message` | 用户指令 | 附件、引用上下文 | copy、edit-and-resend |
| `assistant_message` | 面向用户的回复 | 引用、模型、token | copy、continue |
| `plan` | 计划标题＋完成数 | Todo、依赖、变更历史 | request update、collapse |
| `tool_group` | “并行运行 N 个工具” | 子工具列表与各自状态 | expand all、stop |
| `tool_call` | 工具名＋目标＋状态＋耗时 | 参数、输出、stderr、退出码 | copy、open log、retry |
| `diff` | 文件数与 `+/-` 汇总 | 分文件 unified diff | open file、review all、revert |
| `checkpoint` | 名称、时间、关联步骤 | 变更范围、恢复影响 | restore、rename |
| `approval` | 风险和待确认动作 | 具体命令、路径、影响 | approve、deny、edit |
| `subagent` | 子任务名、所有者、状态 | 独立时间线、产物、依赖 | open、steer、stop |
| `error` | 错误摘要和失败阶段 | 原始错误、重试历史、建议 | retry、copy、report |
| `completion` | 修改/验证/风险摘要 | 文件、测试、commit、遗留项 | review、continue、archive |

### 7.2 块的统一字段

每个块至少包含：

```ts
type FeedBlock = {
  id: string
  kind: FeedBlockKind
  turnId: string
  parentId?: string
  status: 'queued' | 'running' | 'success' | 'warning' | 'error' | 'cancelled'
  startedAt?: number
  endedAt?: number
  summary: string
  detailRef?: string
  sourceEventIds: string[]
}
```

`sourceEventIds` 用于从任何可视块追溯到真实 SDK/IPC 事件。UI 不得自行猜测后端状态。

### 7.3 折叠规则

- 连续短工具调用合并成一个工具组；并行调用必须在视觉上并列或分叉，不能伪装成串行。
- 成功且低信息量的工具默认收起；失败、审批和代码修改默认展开摘要。
- 原始 stdout/stderr 永远在 Details 中按需加载，避免主 Feed 被日志淹没。
- 长会话使用块级虚拟化；折叠只改变视图高度，不删除底层事件。
- 选中块后，Details 保留 Feed 上下文；关闭抽屉后焦点回到原块。

## 8. Agent 状态与真实事件映射

### 8.1 状态机

```text
INITIALIZING → READY → PLANNING / STREAMING / TOOL_RUNNING
                           ↘ AWAITING_APPROVAL
任一活动态 → CANCELLING → SETTLED
任一活动态 → FAILED → READY / RETRYING
```

`agent_end` 只表示一次 Agent 运行阶段结束；`agent_settled` 才表示真正空闲。UI 必须避免在最后一个工具或消息结束时过早显示 READY。

### 8.2 pi SDK / IPC 事件映射建议

| 真实事件 | UI 状态 | Feed 行为 | 视觉/声音 |
|---|---|---|---|
| `agent_start` | `PLANNING` 或 `RUNNING` | 新建 turn / plan 占位 | 核心聚焦，单次低音 send cue |
| `message_update` text delta | `STREAMING` | 更新同一 assistant block | caret/信号轻动，不逐 token 发声 |
| `message_update` thinking delta | `PLANNING` | 只更新“正在规划/分析”摘要；不显示隐藏思维链 | 核心缓慢收束 |
| `tool_execution_start` | `TOOL_RUNNING` | 新建或加入 tool group | 对应通道点亮，单次 step cue |
| `tool_execution_end` success | `RUNNING` | 写入耗时、输出摘要、退出码 | 节点由黄转绿 |
| `tool_execution_end` error | `FAILED` 或继续重试 | 展开 error block | 短促水平失真＋错误音，不持续闪烁 |
| 编辑工具返回真实 patch | `RUNNING` | 追加 diff block | 可选 worm 路径，reduced motion 下直接定位 |
| `agent_end` | `FINALIZING` | 生成 turn 摘要，但不宣告空闲 | 动效逐步降低 |
| `agent_settled` | `SETTLED` | 固化 completion block | 能量归零，单次完成音 |
| assistant `stopReason: error` | `FAILED` | 明确错误而非“无回复” | 错误块＋可重试动作 |

## 9. 组件规范与 React 迁移边界

### 9.1 推荐组件树

```text
AppShell
├─ AtmosphereLayer            // MatrixRain, GridFloor, CRTOverlay
├─ Titlebar
├─ WorkspaceSidebar
│  ├─ NeuralCore
│  ├─ AgentTaskList
│  ├─ PlanSummary
│  ├─ CheckpointList
│  └─ ProjectTree
├─ SessionWorkspace
│  ├─ SessionHeader
│  ├─ Feed
│  │  └─ FeedBlockRenderer
│  ├─ DetailsDrawer
│  └─ Composer
│     └─ FollowUpQueue
├─ RunLogDrawer
└─ StatusBar
```

### 9.2 状态分层

- `sessionStore`：事件归并、turn、block、状态机；真实事件的单一事实源。
- `workspaceStore`：当前工作区、文件树、选中文件、分支。
- `uiStore`：抽屉、折叠、选中块、密度模式、是否显示任务图。
- `settingsStore`：声音、reduced motion、CRT 强度、数字雨强度、字体大小。
- Canvas 动画读取派生后的 `VisualSignal`，使用 `ref` / CSS custom properties 更新，避免每个 token 触发整棵 React 树重渲染。

### 9.3 现有 v3 函数迁移

| v3 实现 | 正式组件/模块 | 迁移要求 |
|---|---|---|
| `addMsg()` | `MessageBlock` | 数据来自 block reducer，不直接操作 DOM |
| `addTrace()` / `runTrace()` | `ToolGroupBlock` / `ToolCallBlock` | 状态来自 tool start/end，不使用定时器模拟 |
| `streamReply()` | `AssistantMessageBlock` | 消费真实 delta；中断调用 `window.zion.abort()` |
| `addDiffCard()` | `DiffBlock` | 输入为真实 patch；支持全量审查和文件定位 |
| `releaseWorm()` | `FileWriteSignal` | 仅由真实文件修改触发；可取消、可降级 |
| `setBusy()` / `FX` | `selectVisualSignal(sessionState)` | 纯派生，不允许多处写状态 |
| `SND` | `SoundController` | 语义事件触发、音量和关闭状态持久化 |
| `FILE_TREE` / `buildTree()` | `ProjectTree` | 接真实工作区数据，支持虚拟化与键盘导航 |
| `tlog()` | `RunLogDrawer` | 原始日志与用户时间线分层，条目可追溯 |

## 10. 关键组件细节

### 10.1 Agent / Plan 侧栏

- 默认按任务而不是虚构人格排序：Running、Needs input、Queued、Completed。
- 每项显示 Agent 名、任务摘要、状态、运行时间和隔离方式（同工作区 / worktree / remote）。
- 当前只支持单 Agent 时也采用同一数据结构，避免以后重写多 Agent 信息架构。
- 多 Agent 同文件修改必须突出冲突风险；不能只用颜色区分。

### 10.2 Neural Core

- Idle：低速、低亮度，不显示随机负载峰值。
- Planning：内圈收束；计划节点逐个出现。
- Tool running：对应工具通道亮起；并行工具显示多条独立轨道。
- Awaiting approval：停止旋转，黄色门控环闪一次后保持静态。
- Error：一次短促断裂/重组，随后保持错误节点，避免循环 glitch。
- Settled：轨道逐步熄灭，保留最近完成节点的微光。

Neural Core 是“运行概览”，不能替代文本状态、计划列表或 Details。

### 10.3 Diff

- 主 Feed 显示文件数、增删行统计和高风险文件；单文件小 diff 可内联。
- All Changes 视图集中审查跨文件修改，参考 Cursor 的跨文件变更查看方式。
- 增删色之外提供 `+` / `−`、行号和明确标签。
- 代码区关闭 text-shadow、强扫描线和动态背景。
- 支持跳到文件、复制 patch、按文件折叠、回到对应工具调用或 checkpoint。

### 10.4 Details Drawer

固定分区：

1. Summary：工具、目标、状态、耗时。
2. Input：参数与权限范围，敏感值脱敏。
3. Output：结构化结果；stdout/stderr 分开。
4. Timing & Usage：开始/结束、duration、token、重试次数。
5. Evidence：退出码、测试结果、文件变更、source event ID。

失败工具打开时默认定位到 Error；成功工具默认展示 Summary。

### 10.5 Composer

- 空闲时：发送新任务。
- 运行时：输入默认加入 follow-up 队列，并清楚标注“当前工具结束后发送”；提供“立即 steer”。
- Awaiting approval 时：审批动作优先于普通输入。
- Stop 必须与 Send 在文字、形状和颜色上都不同，并显示 Cancelling 中间态。
- 文件、目录和引用上下文以可删除 pill 展示；不要把上下文全部塞进 placeholder。

## 11. 动效规范

### 11.1 状态驱动

每个动效必须对应真实事件：

- 数字雨速度只能反映会话活动级别，不反映虚构“智能强度”。
- 神经核心只由状态机和并行通道数驱动。
- 文件树放电只表示实际读取/写入；写入完成才允许触发 worm 命中。
- diff 逐行出现用于短 diff；长 diff 直接渲染并虚拟化，禁止等待每行动画结束。
- 错误 glitch 最长 240ms，不循环。

### 11.2 时长建议

| 动作 | 时长 | 曲线/方式 |
|---|---:|---|
| 块进入 | 160–240ms | ease-out，位移不超过 8px |
| 抽屉开合 | 180–260ms | ease-out |
| 状态颜色过渡 | 120–180ms | linear / ease |
| 工具通道点亮 | 120ms | 单次 |
| 完成能量回落 | 400–700ms | ease-out |
| 错误失真 | 120–240ms | 单次，随后静态 |

### 11.3 Reduced motion

遵循系统 `prefers-reduced-motion`，并在设置中提供独立开关：

- 停止视差、CRT 随机抖动、持续旋转、数字雨高速变化和 worm 爬行。
- 用静态高亮、进度线和瞬时定位替代路径动画。
- 保留状态变化本身，不通过关闭动画丢失信息。

W3C WCAG 2.2 要求交互触发的非必要运动可被禁用，并限制高频闪烁；实现时至少对照 [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 的 Animation from Interactions、Three Flashes、Focus Visible 与 Contrast 条目。

## 12. 声音规范

声音只用于确认状态边界，不做持续环境音：

| 事件 | 声音 | 约束 |
|---|---|---|
| 用户发送 | 双音上行 | 每次一次 |
| 工具开始 | 极短 click/blip | 并行组只播组提示，避免 N 次叠加 |
| 需要审批 | 中性两拍 | 不与成功音相同 |
| 完成 | 柔和上行和弦 | `agent_settled` 后播放 |
| 失败/中断 | 短低频下滑 | 一次，不循环 |

- 默认不自动播放背景音；首次声音必须由用户手势解锁。
- 提供全局开关和独立音量，持久化用户选择。
- 声音不能是唯一反馈，所有音效都必须有视觉和文字等价物。
- 屏幕阅读器运行时应能快速关闭 UI 音效。W3C 的 [Audio Control](https://www.w3.org/WAI/WCAG22/Understanding/audio-control) 建议自动声音可暂停、停止或独立调节，并鼓励由用户主动触发。

## 13. 可访问性与长期使用

- 正文和代码以 WCAG AA 对比度为最低目标；高亮绿不是正文默认色。
- 所有交互组件必须有可见焦点，焦点不能被 CRT 覆盖层、抽屉或粘性栏遮挡。
- Feed 块使用语义标题和状态文本；Canvas 通过邻近文本/ARIA 提供等价状态，不让读屏器解析装饰画布。
- 工具组、计划和 diff 支持键盘展开/收起；关闭 Details 后焦点回到触发项。
- 新日志使用受控 live region；token delta、动画帧和随机环境信息不得逐条播报。
- 支持 100%–200% UI 缩放；900px 以下不能简单隐藏唯一的 Agent、计划或文件入口，应收进可访问抽屉。
- 支持暂停所有非必要持续动画；任何区域一秒内不得出现超过三次高对比闪烁。
- 颜色之外始终提供符号和文字；错误不只显示红色，运行不只显示绿色圆点。

## 14. 参考 → 模块映射

| v4 模块 | 主参考 | 借鉴内容 | 不应照搬 |
|---|---|---|---|
| 全局视觉骨架 | Matrix Reloaded Zion UI | 灰阶、机械制图细线、形状识别 | 无标签按钮、电影镜头中的低可用性 |
| 材质系统 | Blade Runner 2049 | 技术年龄/权限对应材质差异 | 全局重影、持续故障 |
| Neural Core | TRON Legacy | 同心环、网格、层级展开 | 无数据含义的复杂粒子风暴 |
| 状态和诊断 | Oblivion | 功能优先、统一图形语言 | 为填满屏幕而增加仪表 |
| Agent/Plan 侧栏 | Cursor | Agent 与计划统一管理、并行隔离 | 在单工作区制造隐性文件冲突 |
| 计划/队列/回退 | Cascade | Todo、queued messages、checkpoint/revert | 不可逆回退而无风险说明 |
| 会话概览与控制 | GitHub Copilot | progress、usage、duration、steer/stop、审计 | 将内部推理当作默认内容展示 |
| Timeline / Details | LangSmith | Messages/Turns/Details、并行工具组 | 把调试 metadata 全铺在主 Feed |
| Feed 数据模型 | Warp | 类型化块、过滤/折叠与虚拟化 | 把所有内容退化为终端字符流 |
| 依赖图 | GitHub Actions | 状态节点、依赖连线、点击看日志 | 用图替代简单的一两步线性任务 |

## 15. 实施优先级

### P0：可信执行内核

- 定义 `FeedBlock`、turn、tool group 和 session 状态机。
- 把真实 pi SDK / IPC 事件归并到单一 `sessionStore`。
- 实现 Timeline + Details Drawer。
- trace 改成可展开的真实工具块，正确处理并行、错误和取消。
- diff 接真实 patch；移除假延迟、假 token、假系统日志。
- 实现 reduced motion、键盘焦点和代码可读性保护。

验收：用户无需打开日志即可说清“正在做什么、刚完成什么、哪里失败、下一步是什么”。

### P1：任务控制

- 会话头：状态、步骤、时长、真实用量。
- Plan/Todo、queued follow-up、Steer、Stop/Cancelling。
- Checkpoint 与回退入口。
- Completion block：修改、验证、风险、遗留项。

验收：长任务中用户能调整方向、停止、继续并审查结果。

### P2：视觉重构

- 主正文灰绿化，绿色语义化。
- 统一 trace / diff / approval / error 的形状语法。
- 日志终端改为抽屉；代码区降低 CRT/背景强度。
- Neural Core 改为真实状态和工具通道驱动。

验收：连续阅读 30 分钟时，正文和代码不因辉光、扫描线、视差而明显疲劳。

### P3：多 Agent 与任务图

- Agent/Plan 任务侧栏、隔离方式和冲突提示。
- 子任务块与父子时间线。
- 三个以上依赖步骤时提供任务图；点击节点进入对应块或日志。
- All Changes 跨文件集中审查。

验收：用户能区分每项工作的 Agent、工作区、依赖、产物和冲突风险。

### P4：沉浸感打磨

- Blade Runner 式局部材质差异。
- 事件驱动的 worm、信号路径和短 glitch。
- 语义音效、音量、持久化偏好。
- 性能降级策略：低性能模式关闭 bloom、视差和高频 Canvas。

## 16. 禁止事项

1. 禁止用随机数生成看似真实的 latency、token、progress、负载和安全状态。
2. 禁止在正文、代码和 diff 上使用持续 text-shadow、强扫描线或位移动画。
3. 禁止每个 token、每行日志、每个并行工具都播放音效。
4. 禁止持续 glitch、频闪错误态或无法关闭的视差/CRT 抖动。
5. 禁止将内部思维链、敏感参数、凭据或完整环境变量直接展示在 Details。
6. 禁止只用颜色表达 running/success/error/approval。
7. 禁止让 Agent 动画先于真实事件，或在 `agent_settled` 前显示 READY。
8. 禁止将任务依赖图用于一两步线性操作，也禁止用图替代可搜索的日志。
9. 禁止把所有电影参考混成同一材质；每种视觉效果必须有明确语义和使用范围。
10. 禁止迁移 boot、CRT 开机亮线和红蓝药丸流程到正式 renderer。

## 17. v4 设计验收清单

### 信息

- [ ] 首屏 5 秒内可识别当前 Agent、任务、状态和是否需要输入。
- [ ] 任一工具、diff、错误和完成摘要可追溯到真实事件。
- [ ] 并行工具和串行工具在视觉上明确不同。
- [ ] 无数据时隐藏指标，不以占位假值填充。
- [ ] 完成态包含修改、验证、风险和遗留项。

### 控制

- [ ] 运行中可排队 follow-up、立即 steer、stop。
- [ ] Stop 有 Cancelling 中间态，最终以真实 settled/abort 结果收敛。
- [ ] 修改可集中审查，并可回到对应工具与 checkpoint。
- [ ] 错误块提供可执行的 retry/copy/open log 动作。

### 视觉与可访问性

- [ ] 荧光绿主要用于状态和焦点，而不是大段正文。
- [ ] 代码与 diff 区无强辉光和高强度 CRT 覆盖。
- [ ] 键盘可完成 Feed、抽屉、计划、diff 和审批操作。
- [ ] reduced motion 下不存在视差、持续旋转、worm 路径和随机抖动。
- [ ] 关闭声音后无功能损失；声音不是唯一反馈。
- [ ] 高对比闪烁不超过 WCAG 限制。

### 工程

- [ ] Feed 使用类型化数据模型，不以 DOM 拼接字符串为状态源。
- [ ] 长会话采用块级虚拟化或等价性能策略。
- [ ] Canvas 通过派生信号更新，不随 token 触发 React 全树重渲染。
- [ ] 状态以 `agent_settled` 为真正空闲判据。
- [ ] assistant `stopReason: error` 被渲染为明确错误。

## 18. 来源与可信度说明

### 项目内资料

- `ui-demo/index-v3.html`：v3 视觉与交互原型。
- `ui-demo/brand-spec.md`：现有色板、字体和布局姿态。
- `research/matrix-style-references.md`：数字雨、电影 UI、CRT 与声音的已有调研。
- `pi-matrix-demo-handoff.md`：demo → 正式 renderer 的范围和 mock 映射。

### 外部来源

- [Toby Grime — Matrix Reloaded Virtual Control](https://vimeo.com/11231245) 与 [Pushing Pixels — Toby Grime 访谈](https://www.pushing-pixels.org/2018/01/08/the-art-and-craft-of-screen-graphics-interview-with-toby-grime.html)：设计师本人作品与直接访谈。
- [HUDS+GUIS — The Matrix Reloaded UI Design](https://www.hudsandguis.com/home/2012/05/16/the-matrix-reloaded-ui-design)：二手影片素材汇总，仅用于观察 Zion 控制室画面；不把作者对无标签按钮效率的推测视为已验证事实。
- [Territory Studio — Blade Runner 2049](https://territorystudio.com/project/blade-runner-2049/)：制作工作室一手项目页。
- [GMUNK — TRON: Legacy](https://gmunk.com/TRON-Legacy)：设计团队一手项目页。
- [GMUNK — Oblivion GFX](https://gmunk.com/OBLIVION-GFX)：设计团队一手项目页。
- [Cursor — New Coding Model and Agent Interface](https://cursor.com/changelog/2-0)：官方产品更新。
- [Devin Docs — Cascade Overview](https://docs.devin.ai/desktop/cascade/cascade)：当前第一方文档；原 Windsurf URL 会重定向至此。
- [GitHub Docs — Managing agent sessions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents)：官方产品文档。
- [LangSmith Docs — View traces](https://docs.langchain.com/langsmith/view-traces)：官方产品文档。
- [Warp — The Block Model Behind Warp's Agentic Development Environment](https://www.warp.dev/blog/block-model-behind-warps-agentic-development-environment)：官方工程说明。
- [GitHub Docs — Using the visualization graph](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph)：官方产品文档。
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) 与 [Audio Control](https://www.w3.org/WAI/WCAG22/Understanding/audio-control)：可访问性规范和解释。

电影界面参考说明了视觉语言和叙事作用，不等同于真实软件的可用性验证；产品参考说明了当前功能和信息架构，也不应逐像素复制。v4 应保留这些参考背后的原则，并以 pi SDK 的真实事件和 ZION 的桌面工作流为最终约束。
