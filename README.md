# ZION — 黑客帝国风 Windows 桌面 Agent

以 [pi](https://pi.dev)（@earendil-works/pi-coding-agent）为底座的黑客帝国风格 Windows 桌面端编码 Agent。输入指令 → 真实 pi agent 会话流式执行 → Matrix 风 UI（数字雨 / 网格地板 / CRT 扫描线）实时呈现。

> 开发主仓：本仓（GitHub）。备份镜像：Gitee `xuhuitalker/pi-martix-ui`。
> 路线图与决策记录：见 [地图 Issue #1](https://github.com/elephanttalkheads/pi-martix-ui/issues/1)（wayfinder）。

## 技术栈（已定案）

| 层 | 选型 |
|---|---|
| 桌面壳 | Electron（≥39，当前 43.x 线）— 固定 Chromium，canvas 确定性 |
| Agent 内核 | pi SDK 进程内（`createAgentSession` + 事件流订阅），复用 `~/.pi/agent` 配置 |
| 通信 | preload IPC 桥（contextIsolation on，凭据只留主进程） |
| UI | React 18 + zustand + vite + **TypeScript（strict）**（Matrix 风控制台，canvas 氛围资产来自 ui-demo） |
| 打包 | electron-builder：NSIS 单 exe + portable；Gitee Releases 主更新通道 + GitHub 海外镜像 |

## 开发

```bash
npm install        # 需要用户环境变量 ELECTRON_MIRROR / ELECTRON_BUILDER_BINARIES_MIRROR 指向 npmmirror（.npmrc 已不含镜像键，见下）
npm run dev        # vite dev server + electron（开发）
npm run typecheck  # renderer + main/preload 双配置类型检查
npm run smoke      # 构建 + electron 冒烟（CDP 验证桥/渲染/IPC）
npm run e2e        # 构建 + 真实 prompt E2E（deepseek → 事件流 → feed）
npm start          # 启动 Electron（dist 产物）
npm run dist       # 打包 NSIS + portable → dist/
```

> [!note] electron 镜像配置
> `electron_mirror` / `electron_builder_binaries_mirror` 是 @electron/get 与 electron-builder 的镜像键，**不是 npm 配置**（npm 11 会告警 Unknown project config，npm 12 将不再透传）。已迁移到用户环境变量（PowerShell）：
> ```powershell
> [Environment]::SetEnvironmentVariable('ELECTRON_MIRROR','https://npmmirror.com/mirrors/electron/','User')
> [Environment]::SetEnvironmentVariable('ELECTRON_BUILDER_BINARIES_MIRROR','https://npmmirror.com/mirrors/electron-builder-binaries/','User')
> ```

前置：Node ≥ 22.19（本机 v24.19.0 ✓）；pi SDK 要求 Electron ≥ 39（38 内嵌 Node 22.18 不够）。

> [!note] npm 11 注意
> npm 11 默认拦截安装脚本（allow-scripts）。首次 `npm install` 后 electron 二进制不会自动下载，需先批准：`npm approve-scripts electron`，再 `npm rebuild electron`。若仍失败，手动下载解压：`https://npmmirror.com/mirrors/electron/<版本>/electron-v<版本>-win32-x64.zip` → 解压到 `node_modules/electron/dist/` 并写 `echo electron.exe > node_modules/electron/path.txt`。

## 结构

```
src/main/        Electron 主进程（pi SDK 接入点，JS + JSDoc 类型）
src/preload/     IPC 桥（CJS，类型契约见 src/shared/protocol.ts）
src/shared/      IPC 类型契约（AgentSessionEvent + ZionAPI）
src/renderer/    React + TS 渲染层（store.ts / App.tsx / components/）
scripts/         smoke-cdp.mjs / e2e-prompt.mjs（CDP 回归）
ui-demo/         静态 UI demo（index-v2.html 视觉参考 + canvas 模块来源、brand-spec 设计系统）
research/        技术调研（壳层 / pi-SDK / pi-RPC）
```

## 许可

MIT — 见 [LICENSE](LICENSE)。
