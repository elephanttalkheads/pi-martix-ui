# src/renderer（ZION 渲染层）

React 18 + TypeScript(strict) 渲染层：v4 四区骨架（标题栏 / 侧栏 / 对话区 / 日志抽屉+状态栏）+ v5 回合化会话区（回合聚合消息流 / 凝结雨轨 / 思考块折叠 / 结算行 / 注入解码 / 液态玻璃）、agent 事件流接线（rAF 合帧入 store）、扩展 UI 弹层（AskDialog + toast）、项目选择面板（ProjectPanel）、模态弹层家族（ZionModal：模型选择 / 设置 / 快捷键速查）、氛围动画（数字雨 / 蠕虫入侵 / Neo 头像）、WebAudio 音效。不做：IPC 通道与凭据（主进程 `main.mjs`）、preload 桥（`preload.cjs`）、协议类型定义（`src/shared/protocol.ts` 是 type-only 依赖）、扩展对话框的 Promise 表/超时兜底（主进程 `src/main/uibridge.mjs`，本模块只经 `window.zion` 消费）、主进程主动弹窗（弹层只经 runCommand 结果 `data.open` 数据驱动触发，ADR-0005）。

> 任务涉及架构、状态机、接口契约、动画数值或失败模式时，先读 [DESIGN.md](DESIGN.md)；仅改组件内部样式/文案可跳过。

## 关键入口

- `src/renderer/index.html` — 唯一 HTML 入口：`#root` + `/src/main.tsx`（模块脚本）
- `src/renderer/src/main.tsx` — ReactDOM root（StrictMode），引入 `styles.css` + `installMockBridge()`（纯浏览器调试注入点，机制见 [DESIGN.md](DESIGN.md)「浏览器调试桥」）
- `src/renderer/src/App.tsx` — 四区布局 + `useAgentEvents`（事件→store 单一订阅点：`agent_start`→`armTurn`、`message_update`（text/thinking_delta）→`queueDelta(kind)`、`turn_end`→`addUsage`、`agent_end`/`agent_settled`→`closeTurn`、`message_end` error→`closeTurn('error')`；扩展 UI 订阅：`onUiAsk`→`setUiAsk`、`onUiNotify`→`pushToast`（3.3s 自动消失计时统一在 store，勿在外部重复）；完整映射见 [DESIGN.md](DESIGN.md)「事件→状态管线」）+ 启动会话恢复（`window.zion?.` 守卫，桥未注入优雅降级；无最近项目自动开项目面板）+ 点击焦点归还（挂 mouseup + 非折叠选区豁免，机制见 [DESIGN.md](DESIGN.md)「设计决策与权衡」）+ 挂载 `AskDialog`/`ToastHost`/`ProjectPanel`/`ModalHost`（store.modal 驱动的模态弹层宿主：model-picker/settings/hotkeys，标题/宽度集中定义、载荷自 `modalData` 解出，机制见 [DESIGN.md](DESIGN.md)「弹层基础设施」）+ `useGlobalHotkeys`（`ZION_HOTKEYS` 注册全局快捷键，`modal` 非空时整体豁免；组合表与触发语义见 [DESIGN.md](DESIGN.md)「弹层基础设施」）+ 侧栏拖拽调宽（`.side-resizer` WAI-ARIA separator，宽度直写 `.main` 的 `--side-w`，机制见 [DESIGN.md](DESIGN.md)「架构与主要流程」侧栏调宽）
- `src/renderer/src/store.ts` — zustand store（`useFeed`）回合聚合模型：`turns`（id→Turn）/`order`（渲染序，仅新增回合换引用）/`activeTurnId`（活动未闭环回合；流式期间仅活动回合对象换引用）+ rAF 合帧事件队列（`queueDelta`/`armTurn`/`closeTurn`/`addUsage`/`toolStart`/`toolEnd`/`markInterrupted` 入队、`_flush` 每帧应用一次；`pushUser`/`applySession`/`reset` 先同步 drain 或清队）+ 模块级 `fx` 对象 + 纯函数（`normPath`/`openAncestors`/`parseEditFromTool`/`upgradeEditFromResult`/`mergeTreeOpen`（树刷新合并展开态，Sidebar 经 `onTreeChanged` 用）/`deriveSessionTitle`（来自 `./title`））与 DOM 查询（`matchTreeRow` 读取 `.ft-row[data-path]`，非纯函数）；状态含 `revealedEdits`、`expandedTools`（工具链块展开态，`toggleToolExpand` 切换）、`sessionMeta`/`ctxInput`（微簇数据源，`setSessionMeta` 设值）、`sessionTitle`（当前会话显示标题，重命名当前会话时经 `setSessionTitle` 就地更新）、`decOn`（注入解码开关，`setDecOn` 持久化 `zion.dec`）、`uiAsk`（扩展对话框单槽，`setUiAsk` 设值）/`toasts`（扩展通知队列，`pushToast` 自带统一 3.3s 自动消失计时（3s 展示 + 0.3s 退出动画）、`dismissToast` 手动移除）/`projectOpen`（项目选择面板开合，`setProjectOpen`）/`currentProject`（当前项目工作目录，App 启动经 `getProject` 填充、`applySwitch` 更新，`setCurrentProject` 设值）/`modal`+`modalData`（模态弹层单槽：`openModal(kind, data?)` 开/关、新开自动关旧，载荷 `Record<string, unknown>` 随附；`modal` 非空时全局快捷键豁免）
- `src/renderer/src/title.ts` — 会话标题推导纯函数 `deriveSessionTitle`（无依赖模块；store.ts re-export；node:test 直测）
- `src/renderer/src/matrixGlyphs.ts` — `MATRIX_CHARS` 单一事实源：Matrix Code 字体 cmap 内的字符全集（全角片假名 34 字 + 数字 012345789[无 6] + `*+<>:|`）；数字雨/雨轨/脑机链路/蠕虫/扰码/注入解码全部从这里取字符，不得各自另写字符集
- `src/renderer/src/sessionPod.ts` — 会话培育仓全息摘要纯函数 `firstLineSummary`（取第一条非空行；空态「尚无会话内容」；不在 JS 截断）
- `docs/neural-cable-visual.md` — 会话脑机链路视觉实现参考文档（**当前实现事实源**：程序化 SVG + 五段握手 + 字符集；修改链路设计时必须同步更新）
- `src/renderer/src/neuralCable.ts` — 会话脑机链路纯几何/身份映射（DOM 图片 rect + 归一化素材锚点 → Sidebar 本地坐标；会话 id FNV-1a → 六种稳定神经签名；响应式 SVG path；node:test 直测）
- `src/renderer/src/toolfmt.ts` — 工具参数格式化纯函数 `formatToolArgs`/`toolExpandTitle`（无依赖模块；Feed 工具链块展开区用；node:test 直测）
- `src/renderer/src/markdown.ts` — 正文解析纯函数 `parseBody`（``` / ~~~ 围栏代码块 + 行内 `code`/【高亮词】；语法边界见 [DESIGN.md](DESIGN.md)「正文解析」；无依赖模块；Feed Body 消费；node:test 直测）
- `src/renderer/src/hotkeys.ts` — 全局快捷键常量表 `ZION_HOTKEYS` + `formatHotkey`（单一事实源：App.tsx `useGlobalHotkeys` 注册与 HotkeysPanel 速查层共用；改快捷键只动这一处）
- `src/renderer/src/mockBridge.ts` — 纯浏览器调试桥 `installMockBridge`（`window.zion` 缺失时注入 mock ZionAPI，Electron 有 preload 自动跳过；mock 数据与事件派发语义（含弹层类命令 mock 开弹层）见 [DESIGN.md](DESIGN.md)「浏览器调试桥」）
- `src/renderer/src/components/` — `RainCanvas` / `SignalCanvas`(releaseWorm) / `NeoAvatar`(双帧头像 + 归一化后脑勺接线口) / `Sidebar`(两分区：`.side-section.sessions` 三槽会话培育仓 + `.side-section.projects`（`.side-head` 标题行 = 项目名 + 「⇄ 切换项目」按钮 + 文件树）；Sidebar 持有唯一共享全息层与会话脑机链路锚点注册表，培育仓中央名称常驻、仅名称 hover/focus 展示等高的重命名/两段删除按钮、只有删除待确认态显示开仓帧；`.core-wrap`/`.side-foot` 固定，`.deck`/`#file-tree` 各自内部滚动) / `SessionPod`(单仓语义、双帧素材、键盘选择、中央名称牌与两帧图片 ref 注册) / `NeuralCableLayer`(Sidebar 本地动态 SVG；ResizeObserver/rAF 测量，StrictMode 冷启动以同一 DOM 元素只读查询兜底；最多三条可见链路；active 脉冲、hover 静态增亮、dormant 静止) / `LogDrawer` / `Feed`(回合化消息流：TurnView memo 边界 + 注入解码 `OperatorBody` + 脑波褶思考块（EEG + 沉降梯度）+ 封存带结算行 + 机械继电器 ToolCard + 字形蛾 `MothCaret` + 中断乱码锁定 `AbortedMark`) / `TurnRail`(凝结雨轨：活动回合迷你数字雨，闭环凝 ◆，`90/fx.speed` 节流) / `DiffCard`(烧录显影：逐行 burn/char 阶梯 + 落定校验环自绘) / `AskDialog`(扩展对话框三形态 confirm/input/select + `ToastHost` toast 队列) / `ProjectPanel`(项目选择：最近项目卡片 + 「浏览其他目录…」，遮罩复用 `.ask-mask`；启动无最近项目自动打开) / `ZionModal`(通用模态弹层壳：遮罩点击/Esc 关闭 + 初始焦点捕获（tabIndex=-1 挂载聚焦）+ 轻装饰（glow 边框/▚▞ 角标/打开时一次扫描线扫过）；各弹层只供标题与内容) / `ModelPicker`(模型选择器：无载荷时自拉 `runCommand('model')`，选中 `runCommand('model', label)` 落盘、失败内联错误) / `SettingsPanel`(SND/DEC 开关（store 持久化）+ 当前模型只读行（点击开模型选择器）+ 认证 provider 只读行；无载荷时自拉 `runCommand('settings')`) / `HotkeysPanel`(快捷键速查，`ZION_HOTKEYS` 常量表驱动) / `InputBar`(微簇状态条 `.micro`——模型/ctx 胶囊/思考强度/状态，数据 `zion:session-meta`（启动/弹层关闭/agent_start 刷新）+ `ctxInput`（最新 turn `usage.input`），缺数据显示 `--`；快捷指令+命令面板：`/` 弹出 skills/命令 listbox（面板 state 全在组件本地）；command 无参选中即经 `runCommand` 直接执行、有 `argumentHint` 回填 `/name` 待补参，输入 `/cmd args` 回车同样走 runCommand——结果日志+toast，会话切换类命令按返回 `{id,items}` 重建 feed、弹层类命令按 `data.open` 打开弹层；监听 `zion:open-palette` 外部打开面板（Ctrl+P）) / `SoundFx`(SND + useSoundFx)
- `src/renderer/src/env.d.ts` — `window.zion` 全局声明（type-only import `ZionAPI`）
- `src/renderer/src/styles.css` — 全部设计令牌与布局数值（令牌数值照 `ui-demo/index-v4.html`，勿改；顶部三个本地 `@font-face` 为刻意偏离：Share Tech Mono 拉丁 / Sarasa Term SC GB2312 子集 CJK 回退 / Matrix Code 电影雨字形——canvas 专用 + 两个 DOM 例外（字形蛾光标 `.caret`、注入解码乱码帧 `.decoding`），见 [DESIGN.md](DESIGN.md)「设计决策与权衡」；弹层样式段 `.zion-modal-*`/`.mp-*`/`.sp-*`/`.hk-*` 同在此文件）
- `src/shared/protocol.ts` — IPC 契约类型（type-only，构建期擦除，无运行时依赖）
- 规格基线：`ui-demo/index-v4.html` + `ui-demo/index-v5.html`（会话区 v5「信号凝结」原型：雨轨/思考块/结算行/液态玻璃/注入解码）+ `ui-demo/react/agent-ui-design-spec.md` + `ui-demo/zion-neural-cable-system/`（OpenDesign 原包 + production override）+ `docs/adr/0002-v4-convergence.md` + `docs/adr/0003-project-switching.md` + `docs/adr/0004-responsive-session-neural-links.md` + `docs/adr/0005-zion-modal-infrastructure.md`（弹层基础设施：ZionModal + 数据驱动触发）

## 命令（已对照 package.json 核实）

```bash
npm run dev            # vite dev（127.0.0.1:5173，root=src/renderer）+ electron
npm run build:renderer # vite build → dist-renderer/
npm run typecheck      # 渲染层半边：tsc --noEmit -p tsconfig.json（include: src/renderer/src + src/shared）
npm run smoke          # build:renderer + CDP 冒烟：桥注入 + 渲染骨架 + runCommand 错误路径/命令数 ≥14 + settings 契约 data.open='settings' + 模型清单 scoped 计数 + 真实输入路径开弹层（.zion-modal 出现）
npm run e2e            # build:renderer + 真实 prompt E2E（deepseek → 事件流 → feed）
node --test scripts/derive-title.test.mjs scripts/toolfmt.test.mjs scripts/markdown.test.mjs scripts/session-pod.test.mjs scripts/neural-cable.test.mjs # 纯函数单测（标题 / toolfmt / 正文 / 会话摘要 / 链路几何）；不在 package.json，node:test 直跑（Node ≥23.6 原生 TS type-stripping，.ts 免构建）
```

## 本模块硬约束

1. **FX 不进 React 渲染路径**：氛围组件与雨轨（RainCanvas / TurnRail）直接 `import { fx } from '../store'` 读取 speed/energy（`90/fx.speed` 帧节流）；不要复制进组件 state，也不要自行插值。`fx` 是模块级对象，仅 `setSessionState` 时改写（两档取值见 [DESIGN.md](DESIGN.md)「架构与主要流程」FX 派生）。
2. **蠕虫触发留在事件回调同步路径**（App.tsx `triggerWorm`）：不得改为 useEffect 触发（时序原因见 [DESIGN.md](DESIGN.md)「设计决策与权衡」蠕虫同步触发）。
3. **diff 卡渲染以 `revealedEdits` 为准**：Feed 中 DiffCard 仅在 `item.edit && revealedEdits[toolCallId] && rows.length > 0` 时渲染；不要在 `toolStart` 时直接渲染。
4. **动画/音效数值照规格原样提取**（FS=18、拖尾 0.035、`90/fx.speed` 节流、12% 亮头、L 路径 8px 采样、TAIL=18、扰码 620ms、闪烁 900ms、SND 7 音参数、雨轨 11px 双列）；agent 回复重构数值照 `ui-demo/agent-reply-combo-proto.html`（脑波 0.8s/1.6s、烧录 90ms 阶梯封顶 30 行 + 校验环 1.2s、封存带 0.65s + EOL 0.9s×2、字形蛾 120ms 换字形 + 1.1s 呼吸、中断乱码锁定 450ms、注入解码 `min(700, 240+len*6)`ms；3.6C 磁带纹已退回迷你数字雨轨，不引用其数值）：禁止"优化"数值（ADR 0002）。
5. **reduced-motion 全套降级**：`REDUCED` 常量在模块加载时求值；数字雨画静态帧、Neo 头像张嘴停静态帧且不脉冲、蠕虫直接命中；新动画必须自带降级分支。
6. **z-index 分层不可破坏**：`#rain`=-1（恒在 UI 之下）、`#stage`=5、`.scanlines`=40（pointer-events:none）、`#signal`=60（pointer-events:none，蠕虫画布不拦截交互）；`.side-resizer`=20（侧栏拖拽热区，负 margin 伸出两侧，须高于 sidebar/console 内容、低于 `.palette`=30 与 `.scanlines`=40）；`.palette`=30（命令面板，须低于 `.scanlines`=40）；`.toast-host`=85（toast 须低于对话框遮罩）；`.ask-mask`=90（扩展对话框与项目面板共用的模态遮罩）；`.zion-modal-mask`=92（ZionModal 遮罩，须高于一切——高于 `.ask-mask`=90 与 `.toast-host`=85）。
7. **会话状态机只有 4 态**（READY/RUNNING/STREAMING/CANCELLING），错误回合不加第 5 态。事件→状态映射与 FX 规则见 [DESIGN.md](DESIGN.md)「架构与主要流程」。
8. **stopReason 只存在于 LLM 助手消息分支**：`message_end` 里用 `(ev.message as { stopReason?: string } | null)` 按运行时语义判定；直接 `msg.stopReason` 在 strict 下报错。
9. **SND 持久化键 `zion.snd`**（localStorage，`'0'`=关，默认开）；AudioContext 必须经 `useSoundFx` 首次手势解锁，否则被浏览器策略静音。
10. **消息文本渲染统一走 Feed 的 Body**（`parseBody`，markdown.ts）：行内 `` `code` ``、【高亮词】与 ``` 围栏代码块（`.msg-code`；围栏本身不渲染、块内不做行内解析）；不要另写 markdown 渲染。
11. **`/clear` 仅本地清视图**（store.reset，不触碰主进程会话）；其余 `/cmd` 输入一律走 `window.zion.runCommand`——渲染层只路由不实现命令（执行语义归主进程 dispatch；`/cmd` 匹配规则、结果处理与插入/回填规则见 [DESIGN.md](DESIGN.md)「架构与主要流程」命令面板）；快捷按钮与 skill 模板文本原样走 `window.zion.prompt`。
12. **类型纪律**：`shared/protocol.ts` 只做 `import type`；运行时能力一律经 `window.zion` 白名单，渲染进程零 Node 访问。
13. **弹层应答必须成对**：AskDialog 的 `answer()` 同时执行 `window.zion.uiAnswer(ask.id, result)` 与 `setUiAsk(null)`——只清 state 不应答，主进程 Promise 表条目会挂到超时兜底才继续（机制见 [DESIGN.md](DESIGN.md)「设计决策与权衡」）。
14. **项目切换只经 ProjectPanel 的 `applySwitch` 成套路径**：成功后按 [DESIGN.md](DESIGN.md)「架构与主要流程」项目切换管线五步（feed 重建 → 树先清后拉 → `setCurrentProject` 更新项目名 → 侧栏重拉 → 关面板）执行，失败只 `log('err')` 且面板保持打开；不要在别处单独调 `switchProject`。
15. **agent 事件写入必须走 store 队列 API**：`queueDelta`/`armTurn`/`closeTurn`/`addUsage`/`toolStart`/`toolEnd`/`markInterrupted` 全部入队，rAF 时由 `_flush` 一次应用（每帧至多一次 store 更新，且只有活动回合对象换引用）；不要直接 `set()` 改 `turns`/`order`，也不要绕过 `_flush` 改应用时序。`pushUser`/`applySession`/`reset` 会先同步 drain 或丢弃队列（防跨会话污染，机制见 [DESIGN.md](DESIGN.md)「回合聚合模型与渲染队列」）。
16. **注入解码持久化键 `zion.dec`**（localStorage，`'0'`=关，默认开）：状态栏 DEC 按钮经 `setDecOn` 切换；`OperatorBody` 只入场播一次，DEC 关闭或 reduced-motion 时直接显示原文。
17. **侧栏宽度只经 `.main` 上的 CSS 变量 `--side-w` 控制**（`.sidebar { width: var(--side-w, 232px) }`）：拖拽/键盘/双击复位一律走 `applySideWidth(w)`（写变量 + 同步 resizer `aria-valuenow`）与 `persistSideWidth(w)`（localStorage `zion.sidebar-w`）成对调用；**不要引入 React state**（机制与原因见 [DESIGN.md](DESIGN.md)「设计决策与权衡」侧栏宽度直写 CSS 变量）。常量 `SIDE_MIN=160`/`SIDE_MAX=480`/`SIDE_DEFAULT=232`/`SIDE_STEP=8`/`SIDE_STEP_BIG=32`/`SIDE_KEY` 与 `clampSide`（上限 `min(SIDE_MAX, round(innerWidth/2))`，且不低于 `SIDE_MIN`）在 App.tsx 模块级，改数值/边界只动这一处。
18. **`window.zion` 调用点必须可选链（`?.`）或先守卫再直调**：纯浏览器调试（mockBridge 注入，注入点 main.tsx 勿删）与桥未注入时 UI 都不允许抛错——新增桥调用点照此办理；mock 能力边界见 [DESIGN.md](DESIGN.md)「浏览器调试桥」。
19. **会话脑机链路只在 Sidebar 本地 SVG 内实现**：锚点必须从 Neo 接线口与当前 closed/open 图片的实际 `getBoundingClientRect()` 推导，侧栏 resize/仓体图片 load/列表 scroll 后经单个 rAF 重测；可见线路永不超过 3。状态优先级固定 `active > hover/focus > dormant > hidden`，dormant 禁止动画；不得把该系统并入全屏 `SignalCanvas` 或把线路当作唯一会话状态语义。数值与失败模式见 [DESIGN.md](DESIGN.md)「会话脑机链路」；**视觉实现细节与素材边界以 `docs/neural-cable-visual.md` 为准（程序化 SVG，不依赖连接态 PNG 素材）——修改脑机链路设计时必须同步更新该文档**。
20. **被 node:test 直测的 .ts 文件，相对 import 必须带 `.ts` 扩展名**（如 `neuralCable.ts` 引 `./matrixGlyphs.ts`）：Node 原生 TS type-stripping 不做扩展名解析，省略会跑挂 `node --test scripts/*.test.mjs`；tsconfig 已开 `allowImportingTsExtensions`（noEmit 下合法），vite/tsc 双兼容。新增纯函数模块（可被 scripts/*.test.mjs 直测）照此办理。
21. **模态弹层与全局快捷键纪律**：弹层只经 store 单槽 `openModal(kind, data?)` 开关（同一时刻至多一个、新开自动关旧；ModelPicker 切换成功、Esc、遮罩、✕ 一律回 `openModal(null)`）；弹层类命令由 runCommand 结果 `data.open` 数据驱动打开、载荷随附，**不要在组件里按命令名自判弹层**；全局快捷键常量只放 `hotkeys.ts`（`ZION_HOTKEYS`）——注册（App.tsx `useGlobalHotkeys`）与速查（HotkeysPanel）必须同源，新增/修改快捷键两处联动；`modal` 非空时全局快捷键整体豁免。

## 人工补充
