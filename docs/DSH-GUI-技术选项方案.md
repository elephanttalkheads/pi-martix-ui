# DSH 电影化 GUI 技术选项方案

> 项目代号：ZION × DSH
>
> 一句话目标：把 ZION（黑客帝国风 Agent 主控台）变成 DeepSeek Harness 的官方 Web GUI 的**功能对等替代品**——视觉上做到极致电影化，功能上与 `dsh web` 完全一致，且**不做任何导致模型能力下降的改动**。
>
> 视觉基准：[DESIGN.md](../DESIGN.md)（ZION 视觉宪章，项目级单一事实源）；脑机链路：[docs/neural-cable-visual.md](neural-cable-visual.md)
>
> 状态：方案评审稿（v1）

---

## 1. 目标与硬约束

### 1.1 目标

- **视觉**：以 ZION 宪章为唯一视觉事实源，六个视觉语法（数字雨模拟层 / Zion 控制室几何 / 全屏操作台密度 / CRT 材质管线 / 电影级 FUI / 生物机械链路）全部落地，达到"第一眼就是 ZION、截图不能被任何通用 IDE 混淆"的程度。
- **功能**：与当前 `dsh web`（v0.1.0-rc.6 前端面）**逐项对等**，见 §7 验收清单。
- **能力**：模型能力零退化——宿主组合、prompt、工具、权限、事件语义一律不动，见 §3 红线。

### 1.2 推论

DSH 的"模型能力"全部在宿主（Cordis 组合）侧：prompt 组装、工具执行、会话与事件流、权限与审批。浏览器 GUI 只是**渲染层**。因此"换 GUI 不伤能力"是可达成的，条件是：**只替换渲染层，不动宿主一行配置，wire 契约（`/api`）原样消费**。

---

## 2. 现状盘点

### 2.1 DSH 侧：宿主能力边界（已核实，rc.6）

| 层 | 组件 | 说明 |
|---|---|---|
| 组合根 | `~/.dsh/profiles/web` | bundles = `dsh-base` + `dsh-web-app`；用户补丁层 `cordis.patch.yml` |
| HTTP | `dsh-host-webserver` | `node:http`，默认 `127.0.0.1:3080`；精确/前缀路由 + 唯一 fallback 席位 |
| 前端 | `dsh-web-frontend/dist`（Vite 构建 React SPA） | 由 `frontend-static` fallback 托管；**dist 可替换**（见 §4 路线 B） |
| 契约 | `dsh-host-apiproxy` | `POST /api/<method>`（JSON）+ 双 WebSocket 下行 `events.mux` / `events.host` + `GET /api/session.export`（ZIP） |
| 信任围栏 | `dsh-client-connection` | loopback 天然放行；`trustedHosts` 声明授权；特权方法（设置/目录/预设管理）仅限 loopback |

**API 面（功能对等的数据根基）**：

- 12 个域：`sessions / subagents / host / workspace / skills / agentPresets / events / goals / settings / credentials / llm / downloads`
- 52 个 RPC 方法 + `respond`（审批与提问应答走 `POST /api/respond`）+ 2 个下行流 + 1 个下载端点，完整清单见附录 A
- 客户端载体 `@deepseek-ai/dsh-host-apiproxy` 的 `./api`（零依赖、浏览器可导入）与 `./client`（`AbstractApiClient` / `HttpApiClient`）**可整体复用**

**用户可见功能面**（由 30 个 `dsh-client-ui-*` 插件组成，逐项对等目标见 §7）：

会话管理（列表/搜索/创建/重命名/fork/归档/取消/队列编辑）、对话流式渲染（历史分页/附件/图片限额）、消息反馈（赞/踩+备注）、模型选择（`/model` + composer 席位）、工作区（多工作区/排序/目录选择）、工具调用视图（卡片树/keyed 业务视图/结果）、轨迹面板、审批与权限预设、计划模式（`/plan`）、后台任务、Goal 面板、子代理面板与 interrupt、`/`命令与技能菜单、工作流运行面板、交付物（消息尾部）、用户提问（单选/多选）、设置中心（通用/模型/插件清单/插件配置）+ 凭证、Agent 预设（list/select/read/copy/openDocument/remove）、会话导出 ZIP、连接状态与重连基线、事件投影（`projections` + `session/projection` 帧）。

### 2.2 ZION 侧：现有资产（已核实）

- **技术栈**：Electron 43 + Vite 8 + React 18 + Zustand 5 + TypeScript；`electron-builder` 打包；已有 `dev / build / smoke / e2e / dist` 全链路脚本与 `scripts/smoke-cdp.mjs`、`e2e-prompt.mjs` 验证设施。
- **视觉资产**（DESIGN.md 宪章 + 已实现代码）：
  - 数字雨（固定字形网格 + 亮度波，非每帧随机）；CRT 多阶段材质管线（光学外壳/扫描栅格/噪声/jitter/RGB shift/磷光余辉/bloom）；Zion 环形指挥几何；神经核心 3D；全息面板。
  - **脑机链路**（`neural-cable-visual.md`）：程序化 SVG，运行时 DOM 锚点 + 贝塞尔 + 字符脉冲，五段握手动画（脉冲出站→回传生长→维持→收缩→休止），由会话状态驱动——**这是把 DSH 事件流变成电影时刻的现成骨架**。
  - 蠕虫（`releaseWorm` 全屏 Canvas 字符蛇沿路径爬行）、diff 修改卡（行号+符号列+逐行扫入）、文件树定位/扰码、状态栏 SND 开关等（`ui-demo/index-v3.html` 中成熟部分，按 DESIGN.md §2 取舍继承）。
- **现状底座**：`@earendil-works/pi-coding-agent`。本方案的目标是把底座替换为 DSH 宿主（保留 ZION 渲染层与视觉系统）。

### 2.3 差距

ZION 目前的会话/回复/工具/文件树/遥测全部是 mock 或 pi 底座私有格式；DSH 提供的是**完整、稳定、契约化的会话/事件/工具/工作区/设置 API**。因此主要工程是"渲染层接真数据"，而非"发明后端"——这正是对等与能力保障的底气。

---

## 3. 模型能力红线（不可妥协）

| # | 红线 | 工程含义 |
|---|---|---|
| R1 | 宿主组合零改动 | 不修改 `cordis.yml` / `cordis.patch.yml` 中任何宿主行（`web-runtime`、`webserver`、`api-gateway`、`agent-loop`、工具、权限行）。GUI 只发生在浏览器侧。 |
| R2 | wire 契约零改动 | 46 方法 + `respond` + `events.mux`/`events.host` + `session.export` 原样消费；不发明私有协议替代。 |
| R3 | 事件订阅完整 | 所有下行事件必须全量订阅并正确投影（含 `projections` 块、`session/projection` 帧、queue/jobs 快照）。**宁可多收不可漏收**——漏一个事件就等于丢一个模型可见的状态。 |
| R4 | 会话语义不变 | `session.prompt` 的入参（`clientTimeZone`、附件、队列）原样转发；不擅自裁剪、不改变触发时机。 |
| R5 | 无 prompt/工具/权限改动 | GUI 层绝不注入或修改 prompt 段、工具 schema、审批语义；审批与提问原样呈现、经 `respond` 原样应答。 |
| R6 | surfaceContext 保持 | 宿主行不动则 `app:web-surface` / `harness:source` prompt 段与 `DSH_WEB_URL` 环境变量自动保留——这是模型对"当前页面"的认知，是模型体验的一部分，不得因换前端而丢失。 |
| R7 | 性能不拖累模型 | 动效不得阻塞主线程、不得丢失输入事件、不得让连接层超时（见 §6 性能预算）。 |

**验收方法**：同一会话在官方 `dsh web` 与 ZION 前端并行跑，事件日志逐帧 diff；§7 清单逐项人工验收。

---

## 4. 技术路线选项

### 路线 A：官方前端 + ZION 皮肤层（client 插件 + 主题 + 覆盖层）

- **机制**：不改 dist。通过 `dsh.client` 插件在 Slots 注入 ZION 动效组件；`ui-theme` token 换肤；全屏 WebGL/Canvas 背景覆盖层（`pointer-events: none`）。
- **动效能力**：中高。背景/粒子/CRT 可做满，但官方 DOM 的内部结构（消息流、工具卡片、侧栏）不可重构，深度电影化（如消息"终端敲入"、工具调用换全套视觉）受限。
- **功能对等**：100% 天然保证（就是官方 UI）。
- **成本/风险**：低。升级随官方走。
- **结论**：适合做快速验证与渐进第一层，不适合"极致"目标。

### 路线 B（推荐）：替换前端产物——ZION renderer 作为 `dsh web` 的 dist

- **机制**：把 ZION renderer 构建产物按 `dsh-web-frontend` 的导出形状（`./dist/*`）打包，在 profile 的 `package.json` 用 pnpm `overrides`（或本地 file: 依赖）替换 `@deepseek-ai/dsh-web-frontend`；`dsh web` 原样托管 ZION UI。同源 → 信任围栏、会话导出、HMR 全部原样工作。
- **备选挂载点**：不替换包，而是在 `cordis.patch.yml` 里将 `web-runtime` 的 dist 解析指向自己的构建（该行是"组装事实"，覆盖时须保留 `surfaceContext`、trustedHosts 采样、URL 打印等宿主语义——正好落在 R6 上）。
- **动效能力**：完全自由（整个 DOM/Canvas/SVG/WebGL 都是 ZION 的）。
- **功能对等**：数据面全部来自官方契约（§2.1），重实现是"渲染层"工作，按 §7 清单逐面板落地。
- **成本/风险**：中高。契约无版本号（client and host ship together），需锁定 rc 版本、升级时 diff `RpcMethodMap`。
- **结论**：主路线。

### 路线 C：独立前端进程（跨源）

- **机制**：ZION 前端跑在自有 dev server / 静态服务，经 `/api` 跨源调用（开发期用 Vite 代理打同源；生产不推荐——信任围栏拒绝 `sec-fetch-site: cross-site`）。
- **结论**：仅作为开发期便利，生产不采用。

### 路线 D：Electron 壳内嵌 DSH（部署形态，与 B 正交）

- **机制**：ZION 现有 Electron 基础设施复用：主进程 spawn 并管理 `dsh --profile web` 子进程（生命周期/端口冲突/日志），窗口加载 `http://127.0.0.1:3080`（loopback 信任放行）或官方设计的 `file://` dist + IPC 桥。
- **结论**：推荐作为最终分发形态；浏览器形态（路线 B 裸跑）与桌面形态共用同一 renderer。

### 决策矩阵

| 维度 | A 皮肤层 | B 替换 dist ★ | C 跨源 | D Electron 壳 |
|---|---|---|---|---|
| 动效自由度 | 中高 | 完全 | 完全 | 完全（可叠加透明窗） |
| 功能对等成本 | 0 | 需逐面板重实现 | 同 B | 取决于装载的前端 |
| 模型能力风险 | 无 | 低（契约不变） | 低 | 低（托管子进程） |
| 升级维护 | 随官方 | 需跟进 rc 契约 | 同 B | 附加一层 |
| 工程量 | 小 | 大 | 大 | 中 |

**推荐组合**：**B 为主路线，D 为交付形态**（浏览器与桌面共享同一 ZION renderer）；A 作为 M0 阶段的快速验证。

---

## 5. 电影化动效架构（ZION × DSH 事件编舞）

### 5.1 核心创意：状态编舞 = DSH 事件 × ZION 语法

DESIGN.md §7 的状态编舞表与 DSH 事件流存在**一一对应**关系，这是本方案最重要的设计接缝：

| ZION 状态 | DSH 数据源 | 舞台表现（ZION 语法） |
|---|---|---|
| READY / SETTLED | `session/status` idle / 无活动 | 系统呼吸：低频数字雨、神经缆线静态字符流、前一次任务余辉 |
| STARTING | `session/status` running 首帧 | 线路预充能：缆线脉冲出站、模块依次"从雨中显影" |
| THINKING | agent 思考期（无增量消息） | 深层波纹、Neo 核心聚能、低频拓扑重组 |
| STREAMING | assistant 消息增量 | 字形波与消息同向推进；消息"终端敲入"逐行显影 |
| TOOL START | `tool/start` 事件 | **脑机链路握手开始**：能量沿真实路径脉冲进入目标模块；文件树目标行蠕虫出动（`releaseWorm`） |
| TOOL END | `tool/end` + `tool/result` | 写入冲击：diff 卡片逐行扫入、校验环闭合；成功（绿）与失败（红/琥珀）不同余波 |
| CANCELLING | `session.cancel` | 路径反相、能量抽离、未完成结构安全熄灭 |
| ERROR | tool error / 业务错误码 | 可控断裂：局部 glitch、色相越界、明确错误文字与恢复入口 |
| 审批 / 提问 | 下行 `question` / `approval`（`respond` 应答） | 全息警示窗 + 机械确认按钮（风险提示：授予/拒绝是真实权限动作） |
| 后台任务 / Goal / 子代理 | `session/jobs` 快照、goal 投影、`subagent.*` | 各自的终端主题窗口化组件，任务完成触发脉冲回传 |

### 5.2 渲染分层（DESIGN.md §5.2 三个平面）

- **远景（模拟层）**：数字雨（固定字形网格 + 亮度波，Canvas/WebGL），雾、城市网格、低频空间运动。独立合成层、`pointer-events: none`。
- **中景（物理层）**：脑机链路（程序化 SVG，`neural-cable-visual.md` 现成实现）、任务拓扑、全息面板、轨道粒子。
- **近景（操作层）**：DOM 信息与操作——输入、确认、错误、代码差异、当前操作目标。信息层与氛围层共同设计，局部遮罩保护可读性（DESIGN.md §1）。

### 5.3 技术栈分层

| 层 | 技术 | 用途 |
|---|---|---|
| L0 合成 | CSS transform/opacity/filter + `will-change` | 所有 UI 动效基底（GPU 合成） |
| L1 编排 | Framer Motion（motion） | 页面/消息/面板过渡、Spring、手势、中断恢复 |
| L2 2D | Canvas 2D | 数字雨、粒子流、扫描线（低成本大面积） |
| L3 3D | three.js（r171+，WebGPU 可选） | 全屏 3D 背景、神经核心、体积雨；compute 粒子仅在 CINEMATIC 档 |
| L4 材质 | glsl/wgsl + postprocessing | bloom、glitch、scanline、RGB shift、曲率（CRT 管线，参考 cool-retro-term 三阶段结构） |
| 声音 | WebAudio 合成（ZION `SND` 模块） | 状态动机化音效；默认开关 + 记忆；静音后视觉独立表达（DESIGN.md §8） |

### 5.4 现有资产复用清单

| ZION 资产 | DSH 数据源替换 | 保留/改造 |
|---|---|---|
| 脑机链路五段握手（`neuralCable.ts`） | 会话状态 + `tool/start`/`tool/end` | 保留骨架，触发器换成真实事件 |
| 蠕虫 `releaseWorm` | 真实"文件被修改"事件（工具结果里的路径） | 保留，目标行来自真实路径定位 |
| diff 卡片 `addDiffCard` | 真实编辑工具返回的 diff/patch | 保留 UI，数据换真 |
| 数字雨 / CRT 管线 / 全息面板 | 常驻背景 + 状态能量通道 | 保留，按三档体验分级 |
| 文件树 `FILE_TREE` | `workspace.*` + `host.listDirectory`（目录选择） | 重写数据源，`findPathByName` 复用 |
| 假遥测（token/uptime/频谱） | 真实事件驱动的能量层 | **删除假数据**（DESIGN.md §10：不生成假遥测）——只保留"视觉能量"（与负载无强断言） |
| `SND` 模块 | 事件动机音效 | 保留，加 pause/mute/Reduced 路径 |

### 5.5 性能预算（红线 R7 的落地）

- 动效全部跑在独立合成层；主线程每帧 JS 预算 < 4ms；对话渲染走虚拟列表（DSH 历史可分页）。
- 60fps 目标；`visibilitychange`/窗口失焦暂停动画；WebGL 分辨率动态缩放。
- 用 `renderer.info` / stats-gl 监控：draw calls < 100、纹理内存、泄漏（dispose 几何/材质/纹理）。
- **三档体验**（DESIGN.md §9）：CINEMATIC（默认）→ FOCUS（降背景对比与持续运动，稳定阅读面）→ REDUCED（`prefers-reduced-motion`，直接显示动画终态，无中间帧闪现）。性能下降按"采样/分辨率 → bloom 精度 → 粒子密度 → 远景层"顺序降级。

---

## 6. 工程架构（路线 B 细化）

```
┌────────────────────────────────────────────────────────┐
│ Electron 壳（路线 D，可选）                             │
│  main: spawn/manage `dsh --profile web` 子进程          │
│        （生命周期、端口冲突、日志、退出清理）            │
└───────────────┬────────────────────────────────────────┘
                │ loadURL http://127.0.0.1:3080（loopback）
┌───────────────▼────────────────────────────────────────┐
│ ZION Renderer（React 18 + Vite 8 + Zustand 5）          │
│                                                         │
│  ┌─ 数据层 ──────────────────────────────────────────┐ │
│  │ 复用 @deepseek-ai/dsh-host-apiproxy：              │ │
│  │  ./api 契约类型 + ./client（HttpApiClient          │ │
│  │  + events.mux/events.host 双 WebSocket）            │ │
│  │  Zustand store = 事件投影镜像（官方语义）           │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌─ 渲染层 ──────────────────────────────────────────┐ │
│  │ 近景 DOM（对话/工具卡片/设置/输入，虚拟列表）       │ │
│  │ 中景 SVG（脑机链路/拓扑/全息面板）                  │ │
│  │ 远景 Canvas/WebGL（数字雨/3D 核心/CRT 覆盖层）      │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **数据层要点**：事件投影按官方语义维护（`session/status`、message、tool、projection、queue、jobs 快照）；重连基线语义与官方一致（`host.describe` 就绪后才置 connected）；`projections` 块按 higher-seq-wins 合并。
- **构建与部署**：dev 模式 `vite dev` + 代理打同源；生产构建产物按 `./dist/*` 形状发布，profile `overrides` 替换 `@deepseek-ai/dsh-web-frontend`。
- **验证设施**：沿用 ZION 的 `smoke-cdp.mjs` / `e2e-prompt.mjs`，新增"官方 vs ZION 事件日志 diff"回归。

---

## 7. 功能对等验收清单（与 `dsh web` 逐项比对）

> 验收方式：官方 `dsh web` 与 ZION 并行操作同一宿主，逐项人工 + 自动化比对。

| # | 功能面 | 官方机制（API/插件） | ZION 实现路径 | 验收点 |
|---|---|---|---|---|
| 1 | 会话列表/搜索/创建/重命名/fork/归档 | `session.list/search/create/rename/fork` + `workspace.archiveSession` | 侧栏会话列表（培育仓隐喻） | 操作结果与官方一致；blank 会话处理一致 |
| 2 | 对话流式渲染 | `session.history` 分页 + mux 消息事件 | 终端化消息流 + 虚拟列表 | 历史翻页、增量渲染、中断态一致 |
| 3 | 附件与图片限额 | `session.attachment` + `imageLimits` projection | 输入区附件 UI + 超限前置拒绝 | 限额语义与官方一致（>限额不可提交） |
| 4 | 消息反馈 | `message-feedback` Remote | 赞/踩 + 备注（行动条） | 反馈写入成功 |
| 5 | 模型选择 | `session.models/selectModel` + `llm.*` | `/model` 弹窗 + composer 席位 | 切换生效、不可用模型提示一致 |
| 6 | 工作区 | `workspace.*` + `host.listDirectory/createDirectory/pickDirectory` | 多工作区、排序、目录浏览（native/browse 两态） | 特权方法仅 loopback 的行为一致 |
| 7 | 工具调用视图 | tool 事件 + `ToolCallView` | 终端命令执行卡片（逐行日志/成功失败态） | 与官方工具树信息等价 |
| 8 | 轨迹面板 | `ui-trajectory` | 轨迹时间线（全息拓扑） | 事件序列完整 |
| 9 | 审批与权限预设 | 下行审批 + `respond` + `permission-presets` | 全息确认窗；授予/拒绝走 `respond` | 审批不丢、应答不重 |
| 10 | 用户提问（单选/多选） | 下行 question + `respond` | 机械式选择面板（含自定义文本） | 校验语义一致（bad-response 不触发） |
| 11 | 计划模式 | `ui-plan` + plan projection + `/plan` | 计划面板 + 输入坞席位 | 计划状态同步 |
| 12 | 后台任务 | `session/jobs` 快照 | 会话头任务列表 + 输出查看 | 快照与推送一致 |
| 13 | Goal | `goal.*` + goal 投影 | GoalBar（输入坞内） | CRUD 与轮次状态一致 |
| 14 | 子代理 | `subagent.list/history/prompt/interrupt` | 子代理面板 + `/` 引用 | interrupt 生效 |
| 15 | 命令与技能 | `command.execute` + `skill.list` + `/` 管线 | `/` 命令菜单 + 技能列表 | 命令结果经 `command/run`/`done` 一致 |
| 16 | 工作流运行面板 | `ui-workflow-run` | 工作流节点面板 | 生命周期节点一致 |
| 17 | 交付物 | `ui-deliverables` | 消息尾部产物行 | 与官方 tail 等价 |
| 18 | 设置中心 + 凭证 | `settings.*` + `credentials.*` + `llm.providers/models/discoverModels` | 全息设置面板；secrets 仅单向写入 | revision 冲突、secret 不回传语义一致 |
| 19 | 插件清单/配置 | `ui-settings-plugin-inventory/plugins` | 插件卡片（仅宿主暴露的 namespace） | 与官方一致 |
| 20 | Agent 预设 | `agentPreset.*` | 预设选择/只读查看/复制/打开文档/删除 | 删除拒绝对 shipped 预设一致 |
| 21 | 会话导出 | `GET /api/session.export` ZIP | 导出按钮 + 下载（含子代理与媒体） | 归档内容一致 |
| 22 | 连接与重连 | `host.describe` + 双 WebSocket | 状态栏连接灯 + 自动重建双流 | 断线重连基线一致 |
| 23 | 队列管理 | `session.updateQueue`（编辑/移除） | 排队消息编辑 UI | splice 语义一致 |
| 24 | 语言/主题/无障碍 | `settings` locale/permission/ui-theme + `prefers-reduced-motion` | 三档体验 + SND 开关 + 键盘路径 | Reduced 档无闪烁 |

---

## 8. 风险与缓解

| 风险 | 说明 | 缓解 |
|---|---|---|
| 契约无版本号 | `client and host ship together`；rc 版本升级可能改 `RpcMethodMap` | 锁定 `@deepseek-ai/*` 版本；升级时 diff 附录 A 方法表 + 事件类型 |
| dist 替换与官方升级冲突 | profile `overrides` 覆盖官方包 | 固定版本 + 每 rc 发布回归一遍 §7 |
| 重实现回归 | 逐面板重实现可能漏语义 | 分阶段（§9）+ 官方/ZION 事件日志 golden diff |
| 动效拖累性能 | 红线 R7 | §5.5 预算 + 三档降级 + 虚拟列表 |
| 特权方法行为漂移 | 设置/目录/预设仅 loopback | 不试图绕过信任围栏；ZION 内嵌时以 loopback 直连 |
| Electron 托管 dsh 子进程 | 生命周期/端口冲突/异常退出 | 主进程管理：探测端口、spawn 参数、退出清理、日志落盘 |
| 假数据污染 | 旧 demo 的假遥测 | 遵守 DESIGN.md §10：只展示真实事件/结果，能量层不做硬断言 |

---

## 9. 里程碑

| 阶段 | 内容 | 交付物 |
|---|---|---|
| M0 快速验证（1 周） | 路线 A 皮肤层：数字雨背景 + CRT 覆盖 + ZION 主题 token 注入官方 GUI | 视觉可行性 + 事件数据样例 |
| M1 连接与外壳（2 周） | 数据层（契约复用 + 双 WebSocket + Zustand 投影）；ZION 外壳布局（侧栏/主区/状态栏）；数字雨 + 脑机链路接真实状态 | 能真实对话、真实工具事件的 ZION 外壳 |
| M2 对话核心对等（2-3 周） | §7 #1-10：会话 CRUD/流式/附件/反馈/模型/工作区/工具卡片/轨迹/审批/提问 | 日常使用可替换官方 |
| M3 全功能对等（3-4 周） | §7 #11-24：计划/任务/Goal/子代理/命令/工作流/交付物/设置/预设/导出/队列/无障碍 | §7 清单全绿 |
| M4 电影化打磨（2 周） | 三档体验、CRT 管线、3D 核心、事件编舞全面接入、音效动机、性能达标 | CINEMATIC 档可演示、FOCUS/REDUCED 可用 |
| M5 交付形态（2 周） | 路线 B 产物替换 + 路线 D Electron 壳（子进程托管、打包） | 桌面分发（electron-builder）+ 浏览器形态 |

**验收门槛**：§7 清单 24 项全绿；同一会话官方 vs ZION 事件日志 diff 为空；`chrome://gpu` 硬件加速；CINEMATIC 档 60fps、REDUCED 档零闪烁；R1-R7 红线复核通过。

---

## 10. 附录

### A. RPC 方法总表（52 + respond + 下载）

- **sessions**：`list search create history models selectModel rename fork prompt attachment updateQueue cancel`
- **subagents**：`list history prompt interrupt`
- **host**：`describe pickDirectory listDirectory createDirectory openPath`
- **workspace**：`list create rename delete insertBefore insertSessionBefore archiveSession`
- **skills**：`list`
- **agentPresets**：`list select read copy openDocument remove`
- **goals**：`create edit pause resume complete clear`
- **settings**：`describe openDocument update replace mutate`
- **credentials**：`describe set unset`
- **llm**：`providers models discoverModels`
- **respond**：审批/提问应答（`POST /api/respond`）
- **downloads**：`GET /api/session.export?sessionId=…&includeDescendants=true`（ZIP，含媒体）

### B. 下行流

- `events.mux`：会话/消息/工具/投影/队列/任务等 mux 帧
- `events.host`：宿主级事件（workspace-changed、session-added、设置失效等）

### C. 关键路径

- 官方 profile：`~/.dsh/profiles/web/{cordis.yml, cordis.patch.yml, package.json}`
- 契约与载体：`~/.dsh/profiles/node_modules/@deepseek-ai/dsh-host-apiproxy`（`./api`、`./client` 导出）
- 官方前端产物：`~/.dsh/profiles/node_modules/@deepseek-ai/dsh-web-frontend/dist`
- 浏览器 roster：`dsh-web-app/cordis.patch.yml` 的 `dsh.client` 行
- ZION 视觉基准：`DESIGN.md`、`docs/neural-cable-visual.md`；可继承资产：`ui-demo/`、`research/`

### D. 参考

- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（apps/web、packages/）
- 视觉研究基线见 DESIGN.md §13（Rezmason/matrix、cool-retro-term、eDEX-UI、cmatrix 系、HUDS+GUIS 等）
