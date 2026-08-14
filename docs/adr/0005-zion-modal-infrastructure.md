# ADR-0005: 弹层基础设施——通用 ZionModal + 数据驱动触发

- 状态：已实施（2026-08-14）
- 关联：`CONTEXT.md`「弹层」；`#25` 系统类命令（trust/quit/hotkeys）；`#26` 模型与设置类命令（model/settings）

## 背景

`/model`、`/settings`、`/hotkeys` 需要弹层 UI。现有弹层各自为政：命令面板内嵌 InputBar、AskDialog 独立组件、项目面板 ProjectPanel 独立组件——遮罩、Esc 关闭、焦点管理三份重复实现。第三个弹层出现时，收敛成本已大于重复成本。

## 决策

1. **通用 `ZionModal` 组件**：遮罩（`rgba(0,4,2,0.6)` + 点击关闭）+ 面板容器 + Esc 关闭 + 初始焦点捕获 + 打开/关闭动画。各弹层只提供标题与内容。AskDialog/ProjectPanel 维持现状（已有用户认知），不强制迁移。
2. **数据驱动触发，零新增 IPC**：弹层类命令由主进程 `runCommand` 返回 `RunCommandResult.data = { open: 'model-picker' | 'settings' | 'hotkeys' }`，renderer 收到后 `openModal(kind)` 打开对应弹层。主进程只管「这个命令该开什么」，UI 状态留在 renderer。主进程主动弹窗（未来 ask 等）才考虑事件通道。
3. **模态互斥**：模态弹层（ZionModal 系 + AskDialog + ProjectPanel）同一时刻只开一个，新开自动关旧；命令面板是轻量 palette，打开模态弹层时自动收起，反向不自动关。
4. **视觉：v4 轻装饰**：保持 v4 令牌底子（`--surface-2` + 细边框），新增三项 Matrix 氛围：边框绿 glow、标题行 `▚▞` 角标、打开时扫描线扫过动画。不引入 CRT 常驻扫描线/视差/glitch（0002 收敛方向）。

## 结果与权衡

- 三个新弹层（模型选择/设置/快捷键速查）共享一套遮罩/焦点/动画逻辑，未来弹层零成本接入。
- 轻装饰保留了 v3 的氛围基因，但不回归 v4 已裁掉的过度装饰；弹层是高频交互面，可读性优先。
- 数据驱动让 runCommand 契约保持单一事实源；代价是主进程无法主动推弹层（当前无此需求）。
