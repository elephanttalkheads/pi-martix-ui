# Handoff — ZION（pi-martix-ui）v3 迁移后交接

> 生成：2026-08-11 ｜ 面向：**另一台无上下文机器**上的 pi 会话继续开发
> 前置阅读：克隆仓库后，pi 会自动加载根目录 `AGENTS.md`（项目指令单一事实源）——本文档只写 AGENTS.md 之外的新增信息与冷启动步骤，不重复其内容。

## 一、项目速览

**ZION**：以 **pi**（`@earendil-works/pi-coding-agent`）为底座的黑客帝国风 Windows 桌面编码 Agent。用户输入指令 → 真实 pi agent 会话流式执行 → Matrix 风 UI（数字雨/CRT/音效/蠕虫/diff 卡）实时呈现。

| 项 | 值 |
|---|---|
| 仓库 | `github.com/elephanttalkheads/pi-martix-ui`（公开，MIT，main） |
| 技术栈（已定案勿改） | Electron 43.x + pi SDK 进程内 + React 18/zustand 5/vite 8 + TS strict；main/preload 保持 JS（JSDoc+checkJs）；preload 必须 CJS |
| 版本 | package.json 0.2.0 / UI 内显示 v0.3.0 |
| 会话工作目录 | `D:\zion-workspace`（main.mjs 的 `WORKSPACE_DIR`，项目选择 UI 落地前固定） |

## 二、新机器冷启动（本文档最重要的部分）

```bash
# 1. 环境：Node ≥ 22.19（建议 nvm 装 24.x）、npm 11、git
# 2. 装 pi CLI（全局）
npm install -g @earendil-works/pi-coding-agent
# 3. 配置模型凭据 —— 这是唯一手动步骤：把原机器的 ~/.pi/agent/auth.json 拷过来
#    （含 opencode-go 套餐 key、deepseek 等；无此文件则 pi 会话无法调用模型）
# 4. 克隆并安装
git clone https://github.com/elephanttalkheads/pi-martix-ui.git
cd pi-martix-ui
npm install
npm approve-scripts electron   # npm 11 allow-scripts 拦截 electron 安装脚本，必做
# 5. electron 二进制下载走 npmmirror 镜像（GitHub 可能被墙）：
#    用户环境变量设 ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
#    ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
#    勿写回 .npmrc（npm 11 对未知键告警、npm 12 不再透传）
# 6. 建会话工作目录
mkdir D:\zion-workspace
# 7. 自检
npm run typecheck && npm run smoke
```

## 三、当前状态（2026-08-11，commit `08ef304` 之后）

- ✅ 首个可运行闭环 + 真实 prompt E2E（deepseek-v4-flash → 事件流 → feed）
- ✅ **v3 视觉迁移完成**：深度分层数字雨+镜像片假名+bloom（FX 驱动：speed→帧节流、glow→白点、load→字形亮度，rAF 指数插值）/ CRT 层（扫描线/暗角/曲面/亮度抖动）/ WebAudio 音效 SND（localStorage 持久化 `zion.snd`）/ 蠕虫动画（编辑类工具调用触发，feed 内自动定位目标）/ diff 卡（tool 事件解析：edit 的 `edits[]`、write 的 `content`、end 事件 `result.patch` 升级；`toolCallId` 精确匹配；200 行上限）
- ✅ 域文档：`CONTEXT.md`（词汇表：feed/agent 回合/FX/tool 行/编辑类工具调用/diff 卡/蠕虫/CRT 层/SND/错误回合）+ `docs/adr/0001-canvas-doom-boundary.md`
- ✅ 回归：typecheck 双配置 / smoke / 真实 prompt E2E / 真实编辑工具验证
- 🔶 **UI 整体调亮：已改未提交**（`styles.css` 的 `:root` 变量亮化 + 氛围层减弱 + `MatrixBg.tsx`/`CrtOverlay.tsx` 亮度参数；typecheck/build/smoke 已过，待视觉确认后提交）
- 📦 独立资产：`github.com/elephanttalkheads/vision-switch`（私有）——pi 扩展，图片输入自动切视觉模型（gpt-5.6-luna）回合后切回，装在 `~/.pi/agent/extensions/vision-switch/`，与主仓无关

## 四、验证手法（含一个坑）

- `npm run typecheck`（tsconfig 双配置：renderer + main/preload checkJs）
- `npm run smoke` / `npm run e2e`（CDP 驱动真实 prompt）
- ⚠️ **CDP 验证加载的是 `dist-renderer/` 旧构建**：手写 CDP 脚本前必须先 `npm run build:renderer`，否则验证旧代码（曾因此误判 diff 卡 0 行）

## 五、下一步（按价值排序，承接 v3 迁移）

1. **项目选择 UI**：目前 cwd 固定 `D:\zion-workspace`；需"选项目目录"入口；注意项目信任（headless 下 `ask` 静默忽略项目资源）——架构级决策，建议先 grilling+domain-modeling
2. **工具调用行详情展开**：tool 行可点开看 args/结果；diff 解析逻辑在 `store.ts` 的 `parseEditFromTool`/`upgradeEditFromResult`，可直接复用
3. **会话历史/恢复**：`SessionManager.continueRecent/open` + 会话列表 UI
4. **扩展 UI 桥**：`ctx.ui` 默认 headless，需自实现 `ExtensionUIContext`（参考 tbrandenburg/pi-desktop）
5. **多 agent 卡**（NEO/TRINITY/MORPHEUS 并行会话）——先验证并发 AgentSession 安全性
6. 杂项：离线字体（Google Fonts→本地打包）、Gitee 备份镜像、`npm run dist` 打包实测（未做过）、3D 神经核心+频谱+视差（纯装饰，可选）、开屏加载页（**明确不实现**）

## 六、关键 SDK 事实（调试时直接可用）

- `session.prompt()` 从不抛错、返回 `Promise<void>`（stopReason 在事件流末条消息；ZION 的 IPC 桥 `agent:prompt` 封装了取 stopReason 的逻辑）
- 工具事件：`tool_execution_start = {toolCallId, toolName, args}`；`tool_execution_end = {toolCallId, toolName, result, isError}`——权威 unified patch 在 edit 工具的 `result.patch`（`EditToolDetails`），start 时只有 `edits[]`
- 扩展事件（`model_select` 等）不进 `session.subscribe`，只在扩展层可见

## 七、建议技能（suggested skills）

- **prototype** — 项目选择 UI / 面板交互原型
- **grilling + domain-modeling** — 项目选择 UI 的信任流 UX、多会话语义等架构级决策前先对齐（流程：拷问定案 → 术语落 CONTEXT.md → 硬决策落 docs/adr/）
- **tdd** — 会话控制、IPC、feed 状态等逻辑开发
- **diagnosing-bugs** — 疑难运行时问题（本文件「验证手法」的 CDP 复现方式可复用）
- **code-review** — 提交前按仓库标准自审
- **graphify** — 代码库问题优先 `graphify query`（本仓库有 graphify-out/，改码后跑 `graphify update .`）
- **mcp-scripting** — GitHub issue/仓库操作
- **writing-for-agents** — 修改 AGENTS.md/CONTEXT.md 时

## 八、安全边界（无上下文的机器同样适用）

- 仓库与本文档**不含任何密钥**。凭据只在 `~/.pi/agent/auth.json`（模型 key）与用户环境变量（GITHUB_PAT/GITEE_TOKEN 等）
- 渲染进程零凭据（contextIsolation + sandbox）；新增 IPC 保持此边界
- 已对主仓全历史做过密钥扫描（14 提交/121 blob + 工作树 + 真实凭据精确匹配）：零泄露
- `D:\skills-guide\`（环境变量备份 .reg 等）不属于仓库，勿提交进任何 git
