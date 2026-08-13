# 跨模块集成轴审查（integration）

审查范围：IPC 三端对账、ZionAPI↔handler、事件流接线、build-main 产物路径、项目切换链路、命令面板数据源。
标准来源：根 AGENTS.md、CONTEXT.md、docs/adr/0002/0003、src/main|shared|renderer 的 AGENTS.md+DESIGN.md、ui-demo/react/agent-ui-design-spec.md（数值仅抽查）。

## 正向核对（通过）

- 通道三端对账：main.mjs 18 个 `ipcMain.handle` + 3 个 send（agent:event / zion:ui-ask / zion:ui-notify）；preload.cjs 18 个 invoke + 3 个 on；protocol.ts ZionAPI 21 方法逐一对应，无缺漏无多余（shared/DESIGN.md 接口表一致）。
- build-main 产物：dist-main/main + dist-main/preload 布局与 package.json `main`、electron-builder files（dist-main/dist-renderer）、main.mjs 相对路径（`../preload/preload.cjs`、`../../dist-renderer/index.html`）全一致；vite outDir=dist-renderer ✓。
- 项目切换链路：侧栏按钮 → ProjectPanel（打开时 listProjects）→ switchProject/browseProject → applySwitch 五步顺序与 renderer/DESIGN.md 管线一致；主进程 dispose/清 Map/continueRecent/saveProject 与 ADR-0003 一致。
- 命令面板数据源：InputBar mount 预取 → zion:list-commands → skillscan 五来源顺序+去重先到先得 ✓。
- 事件流：wireSession 每会话订阅一次、转发期过滤 currentSession、App 单订阅点+cleanup 退订 ✓。typecheck 双配置通过（工具强制项无违规）。

## 发现

1. **[consistency] protocol.ts `uiAnswer` 契约与实现不符**：ZionAPI 声明 `Promise<void>`（protocol.ts），main.mjs 返回 `{ ok: handled }`、preload 透传，shared/DESIGN.md 接口表写 `{ ok: boolean }`——契约单一事实源自相矛盾；renderer 忽略返回值故无运行时 bug，typecheck 无法捕获（invoke 返回 any）。
2. **[consistency] 启动无最近项目自动打开面板未接线**：根 AGENTS.md、ADR-0003 决策 3、CONTEXT.md「项目」词条均声称该行为；实现 projectOpen 初始 false、启动链路从不调 listProjects/setProjectOpen，仅侧栏按钮可开（renderer/DESIGN.md 技术债自认未实现）。
3. **[consistency] BUILTIN_COMMANDS 快照漂移**：SDK `dist/core/slash-commands.js` 现为 22 条（含 `quit`），skillscan.mjs 快照 21 条缺 `quit`，main/DESIGN.md「21 个」已过时；面板缺 /quit。
4. **[consistency] CONTEXT.md 状态机「由 agent 事件唯一驱动…abort→CANCELLING」与实现不符**：CANCELLING 由 InputBar 本地置位，App 事件分支无 abort（renderer/DESIGN.md 已如实记载非事件驱动）。
5. **[consistency] ensureSessionFor 超时文档不符+竞态**：main/DESIGN.md「超时失败不入 Map」不实——init 在 race reject 后仍会 sessions.set 并覆盖 currentSession（期间已切换会话则事件有串台风险）。
6. **[judgement] main.mjs 顶部「uiContext + projectTrustContextFactory 双注入」注释与代码不符**（仅 bindExtensions({uiContext})；main/DESIGN.md 技术债已承认）。
7. **[judgement] protocol.ts 头注释通道清单仅 6 条**（实际 18+3，shared/DESIGN.md 技术债已承认）；且「两处」vs「三处」字面量计数在四处文档不一致。
8. **[judgement] window.zion 判空不一致**：shared/DESIGN.md 失败模式要求可选链/判空，Sidebar 初始 effect 有守卫，App 启动 effect、InputBar/ProjectPanel 未守卫（桥缺失时同步抛错，与「空界面优雅降级」描述不符）。
9. **[judgement] electron-builder files 含 `src/**/*`**：打包冗余（运行时无引用、无文档依据）。
10. **[judgement] Sidebar `.side-foot` workspace 文案硬编码** `zion-workspace`，切换项目后不更新（renderer/DESIGN.md 技术债已承认）。

## 汇总

总发现 10 项：hard 0 / consistency 5 / judgement 5。最严重：#1（契约单一事实源自相矛盾）、#2（三处高层文档声称已实现的功能实际未接线）——均为文档-实现偏差，非功能缺陷。建议：① protocol.ts 改 `uiAnswer` 返回 `Promise<{ok: boolean}>` 并补全头注释通道清单；② 启动自动开面板要么接线（App 启动 listProjects 判空后 setProjectOpen(true)），要么回改根 AGENTS.md/ADR-0003/CONTEXT.md 三处措辞。
