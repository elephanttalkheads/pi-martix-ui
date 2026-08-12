# HANDOFF 2026-08-13 — Neo 头像替代神经核心

## 本次完成（已验证）

「删除神经核心、放大 Neo 头像、蠕虫从嘴中吐出」改造，经 grill-with-docs 拷问轮确认共识后实施。改动清单与数值以 git 本次提交 diff 为准，此处不重复。

要点：

- `NeuralCore.tsx` 删除 → `components/NeoAvatar.tsx`（仅存头像双帧）
- 张嘴逻辑：`sessionState === 'STREAMING'` → `store.wormActive > 0`（`releaseWorm` 开始 +1 / done -1 引用计数，所有提前返回路径成对调用）
- 蠕虫起点：`.neo-avatar` rect × `MOUTH_X=0.5 / MOUTH_Y=0.63`（`SignalCanvas.tsx` 顶部常量，估算值，可目测微调）
- 头像 72→120px，容器 108→140px；释放瞬间 700ms `neo-burst` 缩放脉冲；reduced-motion 下不脉冲
- 侧栏标签 `NEURAL CORE` → `NEO`；`CORE.burst` 机制整体删除
- 文档已同步：CONTEXT.md（删「神经核心」、增「Neo 头像」）、`src/renderer/DESIGN.md`、`src/renderer/AGENTS.md`、`assets/neo-avatar/README.md`。ui-demo/ 与 ADR 0002 的旧引用属历史基线，未动

回归：`npm run typecheck` 双配置 ✅；`npm run smoke` ✅（含 CDP 实测 120×120 渲染与截图目检）。**未跑 `npm run e2e`**（真实 prompt 不覆盖蠕虫路径，且消耗 API 额度）。

## 顺带修复（smoke 脚本，与环境相关）

- CDP 端口 9222 → **9633**：9222 落入 Windows 动态保留端口段（实测 9220–9319，`netsh interface ipv4 show excludedportrange protocol=tcp` 可查，重启后可能漂移），bind 报 WSAEACCES 导致 `CDP 未就绪`
- 渲染等待由定长 `sleep(2500)` 改为轮询 `#rain`
- `child.kill()` → `taskkill /PID <pid> /T /F`：原写法只杀父进程，electron 子进程树残留（本机曾累积孤儿进程）

## 下一步候选（均未做）

1. **目测校准 MOUTH_Y**：跑一次真实编辑类工具调用（如对 `D:\zion-workspace` 里文件 write/edit），观察蠕虫是否精确从嘴部吐出，偏差则调 `SignalCanvas.tsx` 的 `MOUTH_X/MOUTH_Y`
2. 项目/工作区选择 UI（用户明确指出尚未实现；当前工作目录硬编码 `D:\zion-workspace`，见根 AGENTS.md）
3. 根 AGENTS.md「当前状态」节未更新本次改造（仍为 2026-08-11 快照），下次顺手同步
4. 其余未做项见根 AGENTS.md ⬜ 清单（会话历史/恢复 UI、扩展 UI 桥、项目信任、打包实测等）

## 建议 skills

- **graphify**：改代码前先 `graphify query`（graphify-out/ 在本机存在时）；本次会话中 `graphify` CLI 不可用，未执行 update
- **domain-modeling**：若继续调整氛围资产语义（蠕虫/头像/FX），同步维护 `CONTEXT.md` 词汇表
- **code-review**：提交前可按本仓库规范复查 diff

## 环境备忘

- 本会话遗留：无孤儿 electron 进程（已清理并修复脚本）
- Git 约定：只推 `origin/main`（GitHub）；提交信息中文
