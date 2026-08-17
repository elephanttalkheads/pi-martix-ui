# AGENTS.md — ZION（pi-martix-ui）

以 **pi**（@earendil-works/pi-coding-agent）为底座的黑客帝国风 Windows 桌面编码 Agent。
开发主仓：本目录（GitHub `elephanttalkheads/pi-martix-ui`）。Gitee `xuhuitalker/pi-martix-ui` 只作备份，**不要**在别处重复开发。

## 技术栈（已定案，勿改）

- **Electron 43.x**（≥39；38 内嵌 Node 22.18 低于 pi SDK 门槛，不可用）
- **主进程**：pi SDK 进程内 —— `createAgentSession`（复用 `~/.pi/agent` 配置：auth/models/settings）
- **renderer**：React 18 + zustand + vite 8（`@vitejs/plugin-react`）**+ TypeScript（strict）**
- **主进程/preload 保持 JS**（`.mjs`/`.cjs`）：preload 受 sandbox 约束必须 CJS；main 的 TS 构建管线是后续步骤。两者用 JSDoc + `tsc -p tsconfig.node.json`（checkJs）做类型检查
- **通信**：preload IPC 桥（`contextIsolation: true` + `sandbox: true`，凭据只留主进程）；桥面/事件类型契约见 `src/shared/protocol.ts`
- **打包**：electron-builder（NSIS + portable）；更新通道 Gitee Releases 主 + GitHub 海外镜像（generic provider）

## 常用命令

```bash
npm run dev            # vite dev server + electron（开发）
npm run build:renderer # 构建 renderer → dist-renderer/
npm run typecheck     # tsc --noEmit 双配置（renderer + main/preload checkJs）
npm run smoke         # 构建 + 启动 electron 冒烟（CDP 查桥注入/渲染/ipc ping）
npm run e2e           # 构建 + 真实 prompt E2E（deepseek → 事件流 → feed，~12s）
npm run dist           # 打包 NSIS + portable → dist/
```

会话工作目录（agent 实际操作的目录）：`D:\zion-test`（项目选择 UI 已实现：侧栏「⇄ 切换项目」/ 启动无最近项目自动打开面板，切换 = 会话上下文重建，见 docs/adr/0003）。

## 必读架构

```
src/main/main.mjs        Electron 主进程：createAgentSession → session.subscribe(事件流) → IPC → renderer
                         IPC: zion:ping / agent:prompt / agent:abort / agent:steer / agent:followUp
                         （JS + JSDoc；类型经 tsconfig.node.json checkJs 校验）
src/preload/preload.cjs  安全桥（window.zion.*，CJS 必须；桥面契约 = shared/protocol.ts 的 ZionAPI）
src/shared/protocol.ts   IPC 类型契约单一事实源：AgentSessionEvent（re-export SDK 类型）+ ZionAPI；
                         渲染层 type-only import，主进程/preload 经 JSDoc import 引用
src/renderer/src/        React + TS 应用：store.ts(zustand) / App.tsx / env.d.ts(window.zion 声明) /
                         components/MatrixBg(深度分层数字雨),CrtOverlay, WormLayer(蠕虫动画),SoundFx,
                         DiffCard, Feed, InputBar（.tsx/.ts）
DESIGN.md                项目级视觉单一事实源；任何界面、视觉重构、动效、声音或品牌素材任务必须先读。
                         默认大胆、前卫、视觉优先；真实状态、可控性、可访问性与性能降级是硬边界
docs/neural-cable-visual.md
                         会话脑机链路（Sidebar + NeuralCableLayer + neuralCable.ts）视觉实现参考文档（事实源：
                         代码 + styles.css 的 .neural-cable-* 段；实现是程序化 SVG，不依赖任何连接态 PNG 素材，
                         早期素材已归档 ui-demo/废案/）。⚠️ 修改脑机链路设计时**必须同步更新本文档**
tsconfig.json            renderer 类型检查（moduleResolution: bundler，strict，noEmit）
tsconfig.node.json       main/preload checkJs（bundler 解析 + allowImportingTsExtensions，noEmit）
scripts/                 smoke-cdp.mjs（冒烟）/ e2e-prompt.mjs（真实 prompt 回归）
ui-demo/                 index-v4.html = 历史视觉实现（不再限制未来构图；新设计以根目录 DESIGN.md 为准）：
                         该版本曾收敛 v3 的 boot/CRT/视差/glitch，采用绿色语义化并将日志改为抽屉，
                         蠕虫简化为一次性写入信号脉冲）；index-v3.html = 重度氛围版（含 releaseWorm、
                         addDiffCard、SND、CRT 层、深度分层数字雨）；index-v2.html = 稳定基线；
                         brand-spec.md 设计系统；react/agent-ui-design-spec.md = v4 纯文本复刻规格
                         （供无多模态模型按文字复刻 demo 为真实 Agent UI，含令牌/算法/mock 替换点）
research/                技术调研（壳层 / pi-SDK / pi-RPC）；matrix-style-references.md = 黑客帝国风格
                         参考作品调研（数字雨/电影 UI/CRT 还原，含 6 项优化清单及完成状态）
```

关键 SDK 行为（docs/sdk.md）：
- `session.prompt()` **从不抛错** —— 模型/请求失败时末条消息 `stopReason: "error"` + `errorMessage`，UI 必须查
- 事件流：`message_update`（text/thinking delta）、`tool_execution_start/end`、`agent_start/end`、`agent_settled`（真空闲）
- `ModelRuntime` 目录刷新可能挂 → 初始化带超时保护；`ctx.ui` 默认 headless，需自实现 ExtensionUIContext（未做）
- 项目信任（project trust）：headless 下 `ask` 会静默忽略项目资源，需显式处理（未做）
- 会话持久化：`~/.pi/agent/sessions/` JSONL v3；`SessionManager.create/continueRecent/open`

## 已知坑（改代码前必读）

1. **npm 11 allow-scripts** 默认拦截安装脚本 → electron 二进制不下载。首次 `npm install` 后需 `npm approve-scripts electron`；失败则从 `https://npmmirror.com/mirrors/electron/<版本>/` 手动下载 zip 解压到 `node_modules/electron/dist/` 并写 `path.txt`（内容 `electron.exe`）
2. **vite 8 只绑 IPv6** → `vite.config.mjs` 必须 `server.host: '127.0.0.1'`，否则 `wait-on tcp:127.0.0.1:5173` 卡死、electron 不启动
3. **preload 必须 `.cjs`（CJS）** —— `sandbox: true` 下 ESM preload 不注入，`window.zion` 会 undefined
4. npm 源/镜像走 npmmirror；GitHub 域名在本机可能被墙，electron/electron-builder 下载走镜像。**镜像地址在用户环境变量**（`ELECTRON_MIRROR` / `ELECTRON_BUILDER_BINARIES_MIRROR`，User 作用域，PowerShell `[Environment]::SetEnvironmentVariable`）—— 勿写回 `.npmrc`：npm 11 对未知键告警、npm 12 将不再透传
5. **SDK 的 d.ts 内部用 `.ts` 后缀 import（tsgo 产物）** → tsconfig 必须 `moduleResolution: bundler` 才能解析；`NodeNext` 解析不到会把整个 SDK import 变 any（静默，typecheck 不易发现）
6. **CJS 里 `require('electron')` 返回 any** → 用 `/** @type {typeof import('electron')} */` 注解解构（见 preload.cjs）
7. **`stopReason` 只在 LLM 助手消息分支**（`AgentMessage` 联合的其他成员没有）→ 取 stopReason 用 `'stopReason' in msg` 守卫，直接 `msg.stopReason` 在 strict 下会报错
8. **JSDoc `import('../shared/protocol.ts')` 需要 `allowImportingTsExtensions: true`**（tsconfig.node.json 已开；noEmit 下合法）

## 当前状态（2026-08-11）

- ✅ 首个可运行闭环 + E2E 验证（真实 prompt → deepseek → 事件流 → feed）
- ✅ agent 回复 UI 重构落地（2026-08-17）：亮度波显影 / 脑波褶 / 机械继电器 / 烧录显影 / 封存带 / 字形蛾光标（3.6C 磁带纹落地后退回，雨轨维持凝结数字雨；组合选型 ui-demo/plan/ui-proto-variants.md，交接事实源 ui-demo/agent-reply-ui-handoff.md）；旧液态玻璃/角标/涟漪/方块光标退役
- ✅ v3 视觉迁移完成：深度分层数字雨+镜像片假名+bloom / CRT 层（扫描线/暗角/曲面/亮度抖动）/ WebAudio 音效
  （SND，localStorage 持久化开关）/ 蠕虫动画（编辑类工具调用触发）/ diff 卡（tool 事件解析：edit 的 edits[]/patch、
  write 的 content、end 事件 result.patch 升级；toolCallId 精确匹配）/ FX 折算规则（agent_start→busy+FX 抬升，
  rAF 指数插值衰减，规则见 CONTEXT.md）/ 状态栏 SND 开关+时钟
- ✅ 域文档：CONTEXT.md（词汇表）+ docs/adr/0001-canvas-doom-boundary.md（氛围层 canvas、数据卡 DOM）
- ✅ 回归：typecheck 双配置 / smoke / 真实 prompt E2E / 真实编辑工具验证（write→diff 卡带内容行）
- 未做（v3 范围外）：3D 神经核心+频谱+鼠标视差（纯装饰，可后续加）、开屏加载页（明确不实现）
- ✅ preload/vite 两个坑已修（commit a9c8859）
- ✅ **TypeScript 重构完成**：renderer 全 TS（strict）+ shared/protocol.ts 类型契约 + main/preload JSDoc 类型 + typecheck/smoke/e2e 回归脚本（typecheck 双配置通过；smoke + 真实 prompt E2E 复验通过）
- ✅ ui-demo 升级到 index-v3.html：深度分层镜像数字雨 + bloom、CRT 曲率/抖动/开机亮线、WebAudio bleep 音效、蠕虫定位动画（releaseWorm）、diff 修改卡（addDiffCard）、细线条几何 trace 卡片
- ⬜ 未做：工具调用行详情展开（diff 卡已部分覆盖）、会话历史/恢复、扩展 UI 桥、项目信任处理、离线字体、Gitee 备份镜像配置、打包实测（dist）、main 进程 TS 构建管线、v3 残余氛围装饰（3D 神经核心/频谱/视差）

## Git 约定

- 唯一推送目标：`origin/main`（GitHub）。Gitee 由镜像/手动同步，不直接推
- 提交信息中文、聚焦单件事；动环境变量前先读后写（本项目曾发生 setx 覆盖 PATH 事故，恢复法见 D:\skills-guide\用户配置\环境变量备份与恢复记录-2026-08-11.md）
- **提交/推送仅在用户明确指示（如「提交推送」）时执行**

## Subagents

- 需要**视觉/多媒体能力**的任务（截图分析、图像理解、UI 还原比对、图表/示意图解读等）→ 统一交给 `vision` subagent：
  `runs.run('main', { agent: 'vision', task: '...' })`（模型 MiniMax-M3，思考深度 max，别名 `multimodal` / `vision-m3`）（如果你有视觉能力，则忽略这条规则即可）
- 主会话默认模型（deepseek）无图像输入能力，**不要**用主会话假装处理图片内容；涉及图像的 prompt 一律改派 `vision`
- `vision` 无法加载或理解图像时，要求它如实说明，不得编造图片内容

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary: `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
