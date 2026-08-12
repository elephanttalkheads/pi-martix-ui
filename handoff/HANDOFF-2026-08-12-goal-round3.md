# HANDOFF — 2026-08-12（Goal 第三回合收官）

> 交接对象：fresh agent 继续 ZION（pi-martix-ui）开发。
> 本交接只记录**本会话新增的事实与状态**；既有项目知识见仓库文档（AGENTS.md / CONTEXT.md / docs/adr/ / 各模块 AGENTS.md+DESIGN.md），不重复。

## 1. 当前状态（权威事实）

- 分支 `main`，HEAD `26bc719`（已推送，工作树干净，`origin/main` 同步）
- **GitHub Issues 待办池为空**（全部 ready-for-agent 已 closed）
- ETT 文档同步已就绪：`eccToolkit/ett-docs.json` 注册 3 模块（src/main、src/renderer、src/shared），validate 0 errors/0 warnings；**根 AGENTS.md 含 ETT pre-commit 规则块**（commit 前需跑 doc-update 技能——本交接轮用户明确跳过）

## 2. 本会话产出（引用替代细节）

| 功能 | commit | issue | 一句话 |
|---|---|---|---|
| 命令面板（输入 `/` 弹 skills+命令） | `98db637` | #10-13 前一轮 | 主进程 skillscan.mjs 五类来源聚合 + 内置 21 命令权威清单 |
| main 进程构建管线 | `fe1314a` | #14 | dist-main 产物布局，main 字段/scripts/electron-builder 全切换 |
| 会话删除/重命名 | `0d7dc66`+`68b83b5` | #15 | .trash 回收 + appendSessionInfo 持久化 + hover ✎/✕ 两段确认 |
| 扩展 UI 桥 | `26bc719` | #16 #17 #18-23 | bindExtensions 注入 uiContext → AskDialog 三形态 + ToastHost |

完整细节：commit 消息、GitHub issues（elephanttalkheads/pi-martix-ui）、模块文档（src/main|renderer|shared/AGENTS.md+DESIGN.md 已由 doc-maintainer 调和）。

## 3. 关键非显然事实（新 agent 必读，踩坑记录）

1. **uiContext 注入路径**：`CreateAgentSessionOptions` **没有** uiContext 字段（勘正过）——官方路径是 createAgentSession 后 `await session.bindExtensions({ uiContext: bridge })`；扩展对话框由 uibridge.mjs 的 Promise 表驱动，窗口就绪后 `dispatchUi()` 注入 webContents.send；无窗口时 ask 挂起到 timeout resolve undefined（默认拒绝语义）。
2. **SDK 空会话不落盘**：`SessionManager.create()` 后文件不存在（无 assistant 消息不写盘）——新建会话不在列表，直到首条回复。删除/重命名只作用于列表中的真实会话；删除 = 文件移入 `~/.pi/agent/sessions/<encoded-cwd>/.trash/`（可恢复）。
3. **命令面板数据源**：扩展注册命令无法静态枚举——`src/main/skillscan.mjs` 的 `EXTENSION_COMMANDS` 白名单（当前仅 `/goal`）需手动追加；内置 21 命令清单已对 pi 源码 `BUILTIN_SLASH_COMMANDS` 锁定（21 个断言在单测）。
4. **ctx 沙箱（context-mode）对 home 目录报告失真**（曾报告 ~/.pi/agent/skills 只有 2 个，实际 27）——文件系统事实一律以主进程/真实 bash 为准。
5. **GitHub 443 瞬时失败**：push 失败重试即可；electron/electron-builder 下载走用户环境变量镜像（勿写 .npmrc）。
6. **goal 协议已三路径验证**（GOAL-PROTOCOL.md）：小功能直通 / UI 决策 `goal_wait` 停顿→resume / 复杂功能五段管线（grill-with-docs→to-spec→to-tickets→implement→code-review）+ sub-issue blocking 链（gh api `-F` 传整数，`-f` 会 422）。
7. **单测模式**：项目无 vitest——用 Node 24 原生 `node --test scripts/*.test.mjs`（可直接 import `.ts`，type-stripping）；现有：derive-title / toolfmt / skillscan / uibridge。

## 4. 下一轮候选（AGENTS.md backlog 剩余）

- **项目选择 UI（+信任流 UX）**：最大项，涉及 UI 设计（会触发 goal_wait）——建议 grilling + domain-modeling 先行（skill: grill-with-docs）
- **Gitee 备份镜像配置**：运维类；注意 AGENTS.md 约定"Gitee 由镜像/手动同步，不直接推"
- **多 agent 卡**（会话工作完成后的独立特性）
- **main 进程 TS 源码迁移**：构建管线骨架已就位（build-main.mjs 注释标注替换点为 tsc emit），届时处理 TS5096（`allowImportingTsExtensions` 与 emit 互斥 → `rewriteRelativeImportExtensions` 或 bundler 方案）
- **扩展 UI 桥收尾**：toast 通知无测试扩展实触发（AskDialog 已 e2e）；`ui.custom` 抛错桩（ZION 无 TUI）

## 5. 建议技能（suggested skills）

- `grill-with-docs`（grilling + domain-modeling）——任何新功能/决策前收敛（本仓惯例）
- `implement` / `code-review`——实现与审查纪律（code-review 技能可并行 subagent 审 standards+spec）
- `ett-doc-update`——**每次 git commit 前必跑**（根 AGENTS.md 规则；本交接轮用户明确跳过）
- `prototype`——UI 类改动先出 demo（ui-demo/ 目录惯例，`?variant=` 多方案对比）
- `handoff`——收尾交接
- `diagnosing-bugs`——遇到难复现问题（本会话曾用 CDP 临时验证脚本 `scripts/_verify-*.mjs` 模式，用后即删）
- 涉图像任务交 `vision` 子代理（主会话 deepseek 无图像能力，AGENTS.md 规则）

## 6. Goal 自主开发流程（跨设备复现）

本机已验证三路径闭环（小功能直通 / UI 决策 goal_wait 停顿→resume / 复杂功能五段管线+tickets 链）。**另一台电脑上复现整套流程**需要以下全部件：

### 6.1 新机冷启动（一次性）

1. **复制用户配置**：`~/.pi/agent/` 整目录到新机同路径（含 auth.json 凭据、settings.json、`skills/`、`agents/`（vision.md）、`extensions/`、`pi-goal.json`）——这是唯一手动步骤（详见 `handoff/HANDOFF-2026-08-11-next.md`）
2. 安装 pi-goal 扩展：`pi install npm:@narumitw/pi-goal`（依赖 pi ≥0.80.6）
3. clone 本仓库（GitHub `elephanttalkheads/pi-martix-ui`）
4. 若缺失，重建 `~/.pi/agent/pi-goal.json`（本机现值，automaticTurns 100 是自主推进关键）：
   ```json
   { "toolVisibility": "after-first-goal", "experimental": { "goals": false }, "rpc": { "enabled": false }, "continuationLimits": { "automaticTurns": 100, "noProgressTurns": 3 } }
   ```

### 6.2 协议文件（仓库内，随 clone 携带）

- **权威副本**：`docs/agents/GOAL-PROTOCOL.md`（本机另有一份 `D:\zion-workspace\GOAL-PROTOCOL.md` 供旧命令引用，内容相同；新机一律用仓库副本）
- 内容零本机路径依赖（48 行：分级/流程/停顿规则/纪律/完成上报）

### 6.3 启动命令模板

```bash
/goal 读 <clone路径>/docs/agents/GOAL-PROTOCOL.md 按协议自主开发
# 订阅套餐无需 --tokens（token 不再是约束；automaticTurns 100 回合 + noProgressTurns 3 是剩余安全阀）
```

### 6.4 依赖技能（~/.pi/agent/skills/，随配置目录复制）

核心链：`grill-with-docs`（grilling + domain-modeling）→ `to-spec` → `to-tickets` → `implement` → `code-review`；配套：`handoff`、`ett-doc-update`（commit 前）、`prototype`（UI demo）、`diagnosing-bugs`；issue 流程：`issue-tracker` + `triage-labels`（文档在仓库 `docs/agents/`）。

### 6.5 约定与行为（跨设备一致）

- 待办池 = GitHub Issues `ready-for-agent` 标签（远端共享，跨设备可见）
- 停顿规则仅两种：UI 设计（v4 未覆盖）→ `goal_wait`；决策无法敲定 → `goal_wait`；真阻塞 ≥3 回合 → `goal_blocked`
- 每项完成：回归 + 中文聚焦 commit；**默认不 push**（等用户指令）
- 复杂功能发布 spec/tickets 用 sub-issue blocking 链（gh api 需 `-F` 整数传参，`-f` 会 422）
- 视觉任务交 `vision` 子代理；UI 数值照 `ui-demo/react/agent-ui-design-spec.md` 逐字，不优化
- 知识库参考：`D:\skills-guide\pi-agent\10-插件\Pi Goal 自主推进工作流.md`（本机路径，新机可后续同步 skills-guide 仓库）

## 7. 安全边界

- 本仓库与交接文档不含凭据；主进程复用 `~/.pi/agent/`（auth.json 等）——新机器需复制该目录（见 `handoff/HANDOFF-2026-08-11-next.md` 冷启动章节）
- renderer 零凭据架构：IPC 契约 `src/shared/protocol.ts` 单一事实源；凭据只留主进程
