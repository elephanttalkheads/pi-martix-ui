# 细线 SVG 图标套件 —— 待实现计划

> 状态：待实现（2026-08-15 立项，范围 P0+P1+P2 经用户确认）
> 背景：当前 UI 没有任何功能性 SVG 图标，全靠 Unicode 字符（`✎` `✕` `⇄` `＋` `▸` 等）撑着。字符在终端语汇里大多对味，但操作类按钮 hover 态辨识度差、全角字符渲染发虚。本计划替换「该换的」，保留「该留的」。

## 设计规范（所有图标遵守）

- **形态**：细线 SVG，1px stroke，呼应 `.neural-cable-*` 既有 stroke 语言；不切角不填充（fill 仅用于状态点类）
- **着色**：`currentColor` 继承，CSS 控色——常态 `#1da754` / 激活 `#3dff8f` / 警示 `#ffb000` / 危险 `#ff5555`（颜色纪律见 CONTEXT.md，状态仍须符号+文字双编码，图标不单独承载状态）
- **尺寸**：统一 12×12 viewBox（文件树/工具链行）与 14×14（操作按钮）两档，stroke-width 用 `vector-effect: non-scaling-stroke` 或按档位写死
- **接入方式**：独立 `.svg` 放 `src/renderer/src/assets/icons/`，组件内联引用；先在 `ui-demo/` 搭试色页与数字雨/CRT 叠层同框验证，再进 src
- **动画钩子复用**：chevron 沿用 `.ft-caret` rotate(90deg)；删除确认态沿用现有变色钩子；工具类型图标只表达类型，运行状态仍由现有颜色/涟漪表达

## P0 — 操作类按钮（5 个图标）

| 图标 | 替换位置 | 现状 |
|---|---|---|
| close | `ZionModal.tsx:52` 弹层关闭、`AskDialog.tsx:113` toast 关闭 | `✕` |
| rename(pencil) | `Sidebar.tsx:395` 培育仓重命名 | `✎` |
| delete + warning（二段确认） | `Sidebar.tsx:384` 培育仓删除 | `✕` / `!` |
| swap(双向箭头) | `Sidebar.tsx:427` 切换项目 | `⇄` 全角发虚 |
| plus | `Sidebar.tsx:324` 新建会话 | `＋` 全角 |

## P1 — 工具链行类型图标（4–6 个）

- 位置：`Feed.tsx:111` 的 `[bash]` `[edit]` `[read]` `[write]` 等方括号文字
- 按工具类型配细线小图标：terminal(bash)/ pencil(edit)/ eye(read)/ doc(write)，未知工具兜底一个通用图标
- 方括号保留与否实现时定——倾向保留 `[...]` 文字、图标前置，维持终端感
- 状态（执行中/失败/完成）仍由颜色 + `.ripple` 涟漪表达，图标不动

## P2 — 面板/导航统一（3 个图标，多处复用）

| 图标 | 替换位置 | 现状 |
|---|---|---|
| chevron | 日志抽屉 `App.tsx:464` `▴▾`；文件树目录 `Sidebar.tsx:55` `▸`；思考块折叠 `styles.css:554` CSS 注入 `▸▾` | 三处字符不统一 |
| marker(选中标记) | `ModelPicker.tsx:66` `▶`、`AskDialog.tsx:73` `❯` | 两处各异 |
| kind 徽标 ×2(skill / 命令) | `InputBar.tsx:211` 命令面板 `S`/`/` 字母 | 字母充当 |

## 明确不做（保持字符/文字）

- `◆` 结算徽记（`Feed.tsx:201`）与雨轨封印（`TurnRail.tsx:77`）——终端语汇本体
- `❯` 输入提示符（`InputBar.tsx:228`）
- `●`/`○`/`!` 状态点（`SessionPod.tsx:99`、`Sidebar.tsx:443`、`App.tsx:447`）——双编码要求文字在，圆点已是符号
- diff 卡 `+N −N` 统计与行级 `+`/`−`（`DiffCard.tsx`）
- 状态栏 SND/DEC/TLS/tokens/uptime、会话头 chips、文件树文件名——纯文字即正确形态

## 彩蛋位（可选，独立评估）

`src/renderer/src/assets/mechanical-pill-hands/` 8 张红蓝药丸机械手 PNG 已入库零引用，可作为项目选择面板或空态页的 signature 素材，不在本套件范围内。

## 执行步骤（实现时）

1. `ui-demo/` 搭图标试色页：全部图标 × 四色态 × 叠数字雨/CRT 背景同框
2. 画 SVG（~12 个），`src/renderer/src/assets/icons/`
3. 逐组件替换，删除被替换字符的残留 CSS（如 `.p-kind` 字母宽度假设）
4. typecheck + smoke 回归；试色页截图 A/B
5. 文档同步：`src/renderer/DESIGN.md` 相关段落、`ui-demo/react/agent-ui-design-spec.md`
