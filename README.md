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
| UI | Matrix 风控制台（数字雨/网格/扫描线）—— 框架选型见 Issue #9 |
| 打包 | electron-builder：NSIS 单 exe + portable；Gitee Releases 主更新通道 + GitHub 海外镜像 |

## 开发

```bash
npm install        # .npmrc 已配 npmmirror 镜像（含 electron 二进制）
npm start          # 启动 Electron
npm run dist       # 打包 NSIS + portable → dist/
```

前置：Node ≥ 22.19（本机 v24.19.0 ✓）；pi SDK 要求 Electron ≥ 39（38 内嵌 Node 22.18 不够）。

## 结构

```
src/main/        Electron 主进程（pi SDK 接入点）
src/preload/     IPC 桥
src/renderer/    UI 入口（index-v2.html 待迁入）
research/       技术调研（壳层 / pi-SDK / pi-RPC）
```

## 许可

MIT — 见 [LICENSE](LICENSE)。
