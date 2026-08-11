# AGENTS.md — ZION（pi-martix-ui）

以 **pi**（@earendil-works/pi-coding-agent）为底座的黑客帝国风 Windows 桌面编码 Agent。
开发主仓：本目录（GitHub `elephanttalkheads/pi-martix-ui`）。Gitee `xuhuitalker/pi-martix-ui` 只作备份，**不要**在别处重复开发。

## 技术栈（已定案，勿改）

- **Electron 43.x**（≥39；38 内嵌 Node 22.18 低于 pi SDK 门槛，不可用）
- **主进程**：pi SDK 进程内 —— `createAgentSession`（复用 `~/.pi/agent` 配置：auth/models/settings）
- **renderer**：React 18 + zustand + vite 8（`@vitejs/plugin-react`）
- **通信**：preload IPC 桥（`contextIsolation: true` + `sandbox: true`，凭据只留主进程）
- **打包**：electron-builder（NSIS + portable）；更新通道 Gitee Releases 主 + GitHub 海外镜像（generic provider）

## 常用命令

```bash
npm run dev            # vite dev server + electron（开发）
npm run build:renderer # 构建 renderer → dist-renderer/
npm run dist           # 打包 NSIS + portable → dist/
```

会话工作目录（agent 实际操作的目录）：`D:\zion-workspace`（项目选择 UI 尚未实现）。

## 必读架构

```
src/main/main.mjs        Electron 主进程：createAgentSession → session.subscribe(事件流) → IPC → renderer
                         IPC: zion:ping / agent:prompt / agent:abort / agent:steer / agent:followUp
src/preload/preload.cjs  安全桥（window.zion.*）
src/renderer/src/        React 应用：store.js(zustand) / App.jsx / components/MatrixBg,Feed,InputBar
ui-demo/                 index-v2.html 视觉参考 + canvas 模块来源；brand-spec.md 设计系统
research/                技术调研（壳层 / pi-SDK / pi-RPC）
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
4. npm 源/镜像走 npmmirror（`.npmrc`）；GitHub 域名在本机可能被墙，下载走 npmmirror 镜像

## 当前状态（2026-08-11）

- ✅ 首个可运行闭环 + E2E 验证（真实 prompt → deepseek → 事件流 → feed）
- ✅ preload/vite 两个坑已修（commit a9c8859）
- ⬜ 未做：项目选择 UI、完整数字雨/网格/开机引导对齐 ui-demo、工具调用行详情展开、会话历史/恢复、扩展 UI 桥、项目信任处理、离线字体、Gitee 备份镜像配置、打包实测（dist）

## Git 约定

- 唯一推送目标：`origin/main`（GitHub）。Gitee 由镜像/手动同步，不直接推
- 提交信息中文、聚焦单件事；动环境变量前先读后写（本项目曾发生 setx 覆盖 PATH 事故，恢复法见 D:\skills-guide\用户配置\环境变量备份与恢复记录-2026-08-11.md）
