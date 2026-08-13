# ADR-0003: 项目切换（WORKSPACE_DIR 可变 + 会话上下文重建）

- 状态：已实施（2026-08-12）
- 关联：CONTEXT.md「项目」词条；AGENTS.md 原「项目选择 UI 尚未实现」已落地

## 背景

ZION 的 `WORKSPACE_DIR` 原为硬编码常量（`D:\zion-workspace`），会话/SDK/文件树全部绑定单一工作目录，无法在多项目间切换。

## 决策

1. **WORKSPACE_DIR 改为可变 `let`**：9 处引用（会话创建、continueRecent、list、scan-tree、命令面板项目 skills 扫描）自然跟随新值，无额外接线。
2. **切换 = 会话上下文重建**：旧会话实例逐个 `dispose()`（SDK 提供）、`sessions` Map 清空、`currentSession` 置空 → 新目录 `continueRecent`（无历史则新建）。同目录切换走快速路径（仅刷新指针）。
3. **最近项目持久化**：`~/.pi/agent/zion-projects.json`（`{ path, lastUsed }[]`，上限 8，最近优先去重）。启动有最近项目 → 自动恢复（原行为）；无 → 打开项目选择面板（ProjectPanel）。
4. **UI**：模态面板（v4 令牌，会话卡同款样式）= 最近项目卡片 + 「浏览其他目录…」（主进程 `dialog.showOpenDialog` 原生目录选择）；Project 标题行右侧「⇄ 切换项目」按钮随时可开；切换成功后面板自动关闭并重建 feed/文件树/会话列表。
5. **不做**（范围外）：多项目并行会话、项目管理（增删改项目条目）、信任流集成（#16 已独立完成）。

## 失败模式

- 旧会话 dispose 异常 → 捕获忽略（实例随进程回收）；切换后单会话实例存活，内存可接受
- 项目文件损坏/缺失 → 视为空列表，仅「浏览」可用
- 无窗口时 browse → `dialog.showOpenDialog(opts)` 无父窗重载
