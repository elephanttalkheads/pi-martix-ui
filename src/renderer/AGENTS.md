# src/renderer（ZION 渲染层）

React 18 + TypeScript(strict) 渲染层：v4 四区 UI（标题栏 / 侧栏 / 对话区 / 日志抽屉+状态栏）、agent 事件流接线、扩展 UI 弹层（AskDialog + toast）、氛围动画（数字雨 / 蠕虫入侵 / Neo 头像）、WebAudio 音效。不做：IPC 通道与凭据（主进程 `main.mjs`）、preload 桥（`preload.cjs`）、协议类型定义（`src/shared/protocol.ts` 是 type-only 依赖）、扩展对话框的 Promise 表/超时兜底（主进程 `src/main/uibridge.mjs`，本模块只经 `window.zion` 消费）。

> 任务涉及架构、状态机、接口契约、动画数值或失败模式时，先读 [DESIGN.md](DESIGN.md)；仅改组件内部样式/文案可跳过。

## 关键入口

- `src/renderer/index.html` — 唯一 HTML 入口：`#root` + `/src/main.tsx`（模块脚本）
- `src/renderer/src/main.tsx` — ReactDOM root（StrictMode），引入 `styles.css`
- `src/renderer/src/App.tsx` — 四区布局 + `useAgentEvents`（事件→store 单一订阅点 + 扩展 UI 订阅：`onUiAsk`→`setUiAsk`、`onUiNotify`→`pushToast`+3s 自动消失）+ 启动会话恢复 + 点击焦点归还 + 挂载 `AskDialog`/`ToastHost`
- `src/renderer/src/store.ts` — zustand store（`useFeed`）+ 模块级 `fx` 对象 + 纯函数（`normPath`/`matchTreeRow`/`openAncestors`/`parseEditFromTool`/`upgradeEditFromResult`/`deriveSessionTitle`（来自 `./title`））；状态含 `revealedEdits`、`expandedTools`（工具链块展开态，`toggleToolExpand` 切换）、`sessionTitle`（当前会话显示标题，重命名当前会话时经 `setSessionTitle` 就地更新）、`uiAsk`（扩展对话框单槽，`setUiAsk` 设值）/`toasts`（扩展通知队列，`pushToast`/`dismissToast`）
- `src/renderer/src/title.ts` — 会话标题推导纯函数 `deriveSessionTitle`（无依赖模块；store.ts re-export；node:test 直测）
- `src/renderer/src/toolfmt.ts` — 工具参数格式化纯函数 `formatToolArgs`/`toolExpandTitle`（无依赖模块；Feed 工具链块展开区用；node:test 直测）
- `src/renderer/src/components/` — `RainCanvas` / `SignalCanvas`(releaseWorm) / `NeoAvatar` / `Sidebar`(会话堆叠卡+悬停操作：✎ 重命名 / ✕ 两段删除确认+文件树) / `LogDrawer` / `Feed`(工具链块 step 行可展开) / `DiffCard` / `AskDialog`(扩展对话框三形态 confirm/input/select + `ToastHost` toast 队列) / `InputBar`(快捷指令+命令面板：`/` 弹出 skills/命令 listbox，面板 state 全在组件本地) / `SoundFx`(SND + useSoundFx)
- `src/renderer/src/env.d.ts` — `window.zion` 全局声明（type-only import `ZionAPI`）
- `src/renderer/src/styles.css` — 全部设计令牌与布局数值（令牌数值照 `ui-demo/index-v4.html`，勿改；顶部本地 `@font-face` 为刻意偏离，见 [DESIGN.md](DESIGN.md)「设计决策与权衡」）
- `src/shared/protocol.ts` — IPC 契约类型（type-only，构建期擦除，无运行时依赖）
- 规格基线：`ui-demo/index-v4.html` + `ui-demo/react/agent-ui-design-spec.md` + `docs/adr/0002-v4-convergence.md`

## 命令（已对照 package.json 核实）

```bash
npm run dev            # vite dev（127.0.0.1:5173，root=src/renderer）+ electron
npm run build:renderer # vite build → dist-renderer/
npm run typecheck      # 渲染层半边：tsc --noEmit -p tsconfig.json（include: src/renderer/src + src/shared）
npm run smoke          # build:renderer + CDP 冒烟：断言 #rain/.scanlines/#signal/.sidebar/.neo-avatar 与桥注入
npm run e2e            # build:renderer + 真实 prompt E2E（deepseek → 事件流 → feed）
node --test scripts/derive-title.test.mjs scripts/toolfmt.test.mjs # 纯函数单测（deriveSessionTitle / toolfmt）；不在 package.json，node:test 直跑（Node ≥23.6 原生 TS type-stripping，.ts 免构建）
```

## 本模块硬约束

1. **FX 不进 React 渲染路径**：氛围组件（RainCanvas）直接 `import { fx } from '../store'` 读取 speed/energy；不要复制进组件 state，也不要自行插值。`fx` 是模块级对象，仅 `setSessionState` 时改写（两档取值见 [DESIGN.md](DESIGN.md)「架构与主要流程」FX 派生）。
2. **蠕虫触发留在事件回调同步路径**（App.tsx `triggerWorm`）：不得改为 useEffect 触发——快工具（bash 等）的 `tool_execution_end` 可能先于 React 渲染到达，异步化会漏触发。
3. **diff 卡渲染以 `revealedEdits` 为准**：Feed 中 DiffCard 仅在 `item.edit && revealedEdits[toolCallId] && rows.length > 0` 时渲染；不要在 `toolStart` 时直接渲染。
4. **动画/音效数值照 v4 规格原样提取**（FS=18、拖尾 0.035、`90/fx.speed` 节流、12% 亮头、L 路径 8px 采样、TAIL=18、扰码 620ms、闪烁 900ms、SND 7 音参数）：禁止"优化"数值（ADR 0002）。
5. **reduced-motion 全套降级**：`REDUCED` 常量在模块加载时求值；数字雨画静态帧、Neo 头像张嘴停静态帧且不脉冲、蠕虫直接命中；新动画必须自带降级分支。
6. **z-index 分层不可破坏**：`#rain`=-1（恒在 UI 之下）、`#stage`=5、`.scanlines`=40（pointer-events:none）、`#signal`=60（pointer-events:none，蠕虫画布不拦截交互）；`.palette`=30（命令面板，须低于 `.scanlines`=40）；`.toast-host`=85（toast 须低于对话框遮罩）；`.ask-mask`=90（扩展对话框遮罩，须高于一切）。
7. **会话状态机只有 4 态**（READY/RUNNING/STREAMING/CANCELLING），错误回合不加第 5 态。事件→状态映射与 FX 规则见 [DESIGN.md](DESIGN.md)「架构与主要流程」。
8. **stopReason 只存在于 LLM 助手消息分支**：`message_end` 里用 `(ev.message as { stopReason?: string } | null)` 按运行时语义判定；直接 `msg.stopReason` 在 strict 下报错。
9. **SND 持久化键 `zion.snd`**（localStorage，`'0'`=关，默认开）；AudioContext 必须经 `useSoundFx` 首次手势解锁，否则被浏览器策略静音。
10. **消息文本渲染统一走 Feed 的 Body**：行内 `` `code` `` 与 【高亮词】解析；不要另写 markdown 渲染。
11. **`/clear` 仅本地清视图**（store.reset），不触碰主进程会话；其余输入（快捷按钮、命令面板插入文本）一律原样走 `window.zion.prompt`——渲染层不解释任何命令执行语义（归宿主 TUI 层；插入模板见 [DESIGN.md](DESIGN.md)「架构与主要流程」命令面板）。
12. **类型纪律**：`shared/protocol.ts` 只做 `import type`；运行时能力一律经 `window.zion` 白名单，渲染进程零 Node 访问。
13. **弹层应答必须成对**：AskDialog 的 `answer()` 同时执行 `window.zion.uiAnswer(ask.id, result)` 与 `setUiAsk(null)`——只清 state 不应答，主进程 Promise 表条目会挂到超时兜底才继续（机制见 [DESIGN.md](DESIGN.md)「设计决策与权衡」）。

## 人工补充
