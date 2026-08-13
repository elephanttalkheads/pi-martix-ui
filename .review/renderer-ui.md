# renderer-ui 审查报告

基线：根/模块 AGENTS.md、renderer DESIGN.md、CONTEXT.md、ADR-0001/0002/0003、`ui-demo/react/agent-ui-design-spec.md`（v4 规格，逐字）。数值核对：**RainCanvas/SignalCanvas/SoundFx/LogDrawer 动画与音效数值全部逐字通过**（FS=18、0.035 拖尾、90/fx.speed、12% 亮头、8px 采样、TAIL=18、head+3、35% 突变、sin*0.9*1.5、620ms、900ms、SND 7 音参数、150px/118px/120 行、z-index 六层、全部令牌值），仅列偏离项。

## styles.css

1. (judgement) 颜色纪律（CONTEXT.md Rules；spec §2.1）：`.palette-row .p-kind.command` 用琥珀 `--warning` 标记命令类型，非执行中/警示场景，越界使用。
2. (judgement) spec §2.1 硬约束「绿色半透明统一 rgba(61,255,143,α)」被违：`.ask-btn.primary` 用 rgba(0,255,65,…)、`.scard.active`/hover 阴影与 `.proj-btn:hover` 用 rgba(20,184,80,…)。
3. (judgement·已记录) 滚动条：spec §3 8px/`--text-tertiary` → 全局 6px `#00ff66`；DESIGN.md「统一滚动条」声明为有意偏离，合规。
4. (judgement·已记录) `#rain` z-index 0 → -1；DESIGN.md 不变量声明，合规。
5. (judgement) 死 CSS：`.msg.system` 两段（FeedItem 联合无 system 成员）、`.foot-row`（无组件使用）——Speculative Generality。
6. (judgement) 注释漂移：`.deck` 注释「奇 -1.2°/偶 +1.1°」vs 实现 rotate(-2.2°)/rotate(2°)；与 Sidebar「露出区 88px」注释互相矛盾（CSS 实际 80px，后者 DESIGN.md 已记录）。
7. (smell) 对角角标 8×8 `::before/::after` 块在 .trace/.diff/.ask-dialog/.project-panel 重复 4 次——Duplicated Code，可提共享类。

## Sidebar.tsx

8. (judgement/a11y) `.scard` `role="button"` 内嵌真实 `<button>`（删除/重命名）——嵌套交互控件，无效 ARIA 模式（spec §5.3 同款卡片无内嵌按钮）。
9. (judgement/a11y) 文件树：目录行有 role/tabIndex/Enter-Space，**文件行**同为可点动作（发真实读取 prompt）却无键盘路径——键盘用户不可达，与 ADR-0002 决策 6 可访问性目标及目录行处理不一致。

## DiffCard.tsx

10. (judgement) `rows.length===0` 空态分支在 Feed 门控（模块 AGENTS.md 硬约束 3：`rows.length>0` 才渲染）下不可达——死代码。其余 §5.8 数值（44px/14px/glitchIn 0.5s steps(7)/双编码/底 0.07·0.08/`#e89a9a`）逐字通过。

## InputBar.tsx

11. (consistency) 底部提示文案偏离 §5.9 逐字文本（`支持 /status /trace /clear` → `输入 / 弹出 skills+命令`），DESIGN.md 未记录此变更。
12. (smell) `send()` 与 App.selectFile 重复「pushUser+SND.send+log+prompt」形状——Duplicated Code。面板逻辑（≤48/Esc/插入模板/↑↓ 循环/command 优先）与 DESIGN.md 全符。

## AskDialog.tsx

13. (consistency) 头注释「timeout 由主进程兜底（**超时自动关闭**）」与 DESIGN.md 失败模式（「弹层保持打开」）矛盾，此点 DESIGN.md 已知限制未覆盖（其余 Esc/select/danger 漂移已记录）。
14. (观察，源在 App.tsx) 全局 mousedown 焦点归还（§7.5）无弹层豁免，会抢走 ask-input 焦点——AskDialog 输入可用性疑有缺陷，建议验证。

## 其余

15. (judgement) NeoAvatar：`is-burst` 与 `is-talking` 同绑，连续蠕虫（计数>0 持续）时脉冲只播一次。
16. (judgement) ProjectPanel `.pp-card` 内联 `rgba(2,18,9,0.5)` 非令牌；切换管线五步与关闭条件同 DESIGN.md 全符。「启动无最近项目自动打开」未接线（DESIGN.md 已知限制，consistency 通过）。「workspace: zion-workspace」硬编码同理。

## 汇总

共 16 项：0 hard / 14 judgement / 2 consistency。数值纪律良好（三件装饰+音效逐字过，z-index/令牌全对），主要问题集中在注释/死代码漂移与 a11y。最严重：#14（AskDialog 输入可能失焦，潜在功能缺陷）与 #8/#9（嵌套交互、文件行无键盘）。建议：① 验证并修复全局焦点归还对弹层的干扰（排除 .ask-mask 内目标）；② 清理死 CSS/不可达分支并校正注释（88px、旋转角），角标提共享类。
