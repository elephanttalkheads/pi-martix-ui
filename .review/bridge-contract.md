# 审查：bridge-contract（src/shared/protocol.ts + src/preload/preload.cjs）

依据：根 AGENTS.md、CONTEXT.md、docs/adr/0001-0003、src/shared/AGENTS.md + DESIGN.md。只读审查，未改文件、未做 git 操作。

## 通道对账（ZionAPI 21 方法 ↔ main.mjs 字面量）

preload 18 个 invoke + 3 个 on，与 main.mjs 18 个 `ipcMain.handle` + 3 个 `webContents.send` **逐一完全匹配**（`zion:ping/scan-tree/list-commands/list-sessions/get-project/list-projects/browse-project/switch-project/get-current/switch-session/new-session/ui-answer/rename-session/delete-session` + `agent:prompt/abort/steer/followUp` + send `agent:event/zion:ui-ask/zion:ui-notify`）。ZionAPI 方法数 = DESIGN.md 声称的 21，无缺失、无错位。返回形状（FileNode/SessionInfoLike/SessionHistoryItem/ProjectInfo/SwitchProjectResult）与 main.mjs 实际产出逐字一致。

## src/shared/protocol.ts

1. **consistency（最严重）**：`uiAnswer(...): Promise<void>` 与 DESIGN.md 接口节「返回 `{ ok: boolean }`…未匹配返回 `{ ok: false }`」及 main.mjs 实际返回 `{ ok: handled }` 三方不一致。契约低报真实载荷；因 `ipcRenderer.invoke` 返回 any，checkJs 无法捕获，`{ ok }` 在渲染层不可达类型。建议改为 `Promise<{ ok: boolean }>`。
2. **judgement**：头部通道清单过时——只列 6/21 通道（DESIGN.md「已知限制」已登记该债，属公开债务）；「散落在 main.mjs 与 preload.cjs **三处**字面量」表述事实错误（仅两文件、每通道两处字面量）。
3. **judgement**：`CommandItem.source` 注释（用户级/共享/扩展包/项目/内置/扩展）与 DESIGN.md（用户/共享/项目/settings/扩展·包名/内置/扩展）及 skillscan.mjs 实际产出（`'settings'`、`` `扩展·${pkg}` ``）不一致：缺 `settings` 值、`扩展·包名` 前缀不同。
4. **judgement（Data Clumps）**：`{ id: string; items: SessionHistoryItem[] }` 在 getCurrentSession/switchSession/newSession 三处签名结伴重复，可提取 `SessionPayload` 类型。
5. **judgement（Mysterious Name 弱信号）**：通道 `zion:get-current` 与同族 `zion:list-sessions`/`zion:new-session`/`zion:switch-session` 命名粒度不一（其余全词、此条缩写）。

## src/preload/preload.cjs

6. **judgement（Duplicated Code）**：onAgentEvent/onUiAsk/onUiNotify 三块「`ipcRenderer.on` 注册 + 返回 removeListener 退订」样板同构，仅通道与载荷类型不同，可提取 `subscribe(channel, cb)` 助手（文件小，属可选项）。
7. **无标准违例**：CJS `.cjs` + sandbox 约束（AGENTS.md 坑 3）✓；`/** @type {typeof import('electron')} */` 注解 require 解构（坑 6）✓；JSDoc `import('../shared/protocol.ts')` 带 `.ts` 后缀（模块硬约束）✓；`/** @type {ZionAPI} */` 标注 api 对象（不变量）✓；listener 内 `IpcRendererEvent` 类型注解并剥事件参数 ✓。

## 类型完备性

UiAsk（id/kind 三形态/title/message?/options?/timeoutMs?）、UiNotify（message/type?）、ProjectInfo（path/lastUsed）、CommandItem（name/description/kind/source）与 DESIGN.md 数据形状节逐字段一致；type-only 纪律（protocol.ts 仅 import type/export type/interface；env.d.ts `import type ... from '../../shared/protocol'` 无后缀）符合硬约束；`AgentSessionEvent` 直接 re-export 未本地重定义；protocol.ts 未定义 Electron 专属类型。

## 汇总

总发现 6 项（0 hard / 1 consistency / 5 judgement）。最严重：`uiAnswer` 返回类型三方不一致（契约失真但无运行时危害，AskDialog 以 `setUiAsk(null)` 关闭不消费返回值）。建议：① 修 `uiAnswer` 为 `Promise<{ ok: boolean }>` 并跑 `npm run typecheck`；② 顺手补全头部通道清单或删除清单改为指向 DESIGN.md 接口节，更正「三处」表述。
