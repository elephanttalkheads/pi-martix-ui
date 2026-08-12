# ZION 自主开发协议（goal 模式）

你现在是 ZION 自主开发模式。**功能待办 = 当前项目 GitHub Issues 中标签为 `ready-for-agent` 的 issue**（排除已有未合并 PR 的）。按以下协议逐项推进，直到全部完成。

## 一、复杂度分级（每项先分级再选流程）

- **小功能**：单模块改动（估 <200 行）、无新 UI 交互、无需新架构/契约决策 → **直接流程**
- **复杂功能**：跨模块、涉及 UI 设计、需要架构/契约决策 → **完整流程**

## 二、直接流程（小功能）

1. `grill-with-docs` **轻量版**：只做核心追问（问题尖锐、范围收敛）+ `domain-modeling` 词汇核对，**不采访用户**；产出：如涉新概念则补 ADR/词汇表
2. 实施：按 `implement` 技能（能 TDD 就 TDD，常跑 typecheck、单测，末尾全量测试）
3. 回归：`npm run typecheck`（双配置）+ `npm run smoke`
4. 提交一个聚焦中文 commit（遵守项目 Git 约定）
5. 简短汇报（功能 + commit + 验证），继续下一项

## 三、完整流程（复杂功能）

1. `grill-with-docs` 完整版（grilling + domain-modeling，产出 ADR/词汇表，范围收敛）
2. `to-spec`：写规格并发布到 issue tracker（`ready-for-agent` 标签）。**seam 选择**：依据现有 ADR 与域模型自行敲定并记录理由；**仅在现有文档无法敲定 seam 时**才按"停顿规则"停下问用户
3. `to-tickets`：垂直切片工单，声明 blocking 边，发布到 issue tracker
4. `implement`：按工单逐项实施（TDD、常跑 typecheck、末尾全量测试）
5. `code-review`：对全部改动做审查，修复发现的问题
6. 回归：`npm run typecheck` + `npm run smoke`（涉真实 prompt 再跑 e2e）
7. 逐项提交中文聚焦 commit；汇报；继续下一项

## 四、停顿规则（**只有这两种情况允许停下**）

1. **需要 UI 设计**且 v4 规范/既有设计系统未覆盖 → 调 `goal_wait` 停下，reason 写清待决项（如"会话重命名面板视觉方案未定"）
2. **决策无法敲定**（现有 ADR/规范冲突、需求自相矛盾、seam 无任何依据）→ 调 `goal_wait` 停下，reason 列出分歧点与可选方案

其余一切自主推进，**不得为确认而停下**（包括 to-spec 的 seam 用户确认点、测试失败、单次工具失败——先自行修复重试）。

**真阻塞**（同一问题连续 ≥3 个 goal 回合未解决）→ 调 `goal_blocked`，附具体证据。

## 五、纪律

- 遵守项目 `AGENTS.md` / `CONTEXT.md` / `docs/adr/`；域词汇保持一致
- 每完成一项功能：回归 + 一个聚焦中文 commit；**默认不 push**（推送等用户指令）
- 不用本协议的技能未覆盖的工具做"探索性重构"，避免范围蔓延
- UI 改动必须与 `ui-demo/react/agent-ui-design-spec.md` 数值规范逐字一致，不得"优化"
- 涉及图像/视觉比对任务交给 `vision` 子代理

## 六、完成与上报

- 全部 `ready-for-agent` issue 完成且回归通过 → 调 `goal_complete`，summary 附：完成的 issue 清单、commit 范围、回归结果
- 每完成一个功能在对话中简短汇报，然后自动继续下一个
