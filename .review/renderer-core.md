# renderer-core 只读审查（store.ts / App.tsx / main.tsx / title.ts / toolfmt.ts / env.d.ts / index.html）

标准来源：根 AGENTS.md、CONTEXT.md、ADR-0001/0002/0003、src/renderer/AGENTS.md+DESIGN.md、ui-demo/react/agent-ui-design-spec.md。已核对 SDK 0.84.1 d.ts 事件字段（tool_execution_start{toolCallId,toolName,args}、tool_execution_end{result,isError}、message_update.assistantMessageEvent、message_end.message、agent_settled）。typecheck + node:test 11 例全过——类型问题已工具强制，以下均 judgement/consistency，无 hard violation。

## store.ts

- **[judgement] Mysterious Name**：`FeedState` 名不副实——实为全应用状态（sessions/tree/currentProject/projectOpen/uiAsk/toasts/wormActive）。DESIGN 通称 `useFeed`（文档一致），但 CONTEXT「feed」仅指消息流，类型名不揭示用途。
- **[judgement] Duplicated Code**：`msgTime()` 与 `applySession` 内联 `toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit'})` 同形状两处，可提取。
- **[judgement] Speculative Generality**：`AgentInfo` 死类型，DESIGN「已知限制」已自陈，属文档化债务。
- **[judgement] 文档措辞**：AGENTS.md 列 `matchTreeRow` 为"纯函数"，实则查询 `document`。
- **[judgement] 启发式局限**：`parseBashEdit` 的 sed 正则在 `-i` 后遇引号表达式漏判（`sed -i 's/x/y/' file` 不产 diff 卡）；`2>file` 被当写入目标。DESIGN 已声明"可能漏判"权衡。
- **[judgement] 解析缺口**：`rowsFromPatch` 未排除 unified diff 文件头——`--- a/x`/`+++ b/x` 被渲染为假增删行；规格未提，实现比文档粗。
- **[consistency] 通过**：FX 仅 `setSessionState` 改写（grep 唯一 `Object.assign(fx,…)`），两档 `{1,0.3}/{2.2,0.85}` 逐字合 ADR-0002/§8；LOG_MAX=120、tokenCount delta×2、4 态无第 5 态、applySession 清 token+expandedTools 而 reset 不清、`/clear` 仅清视图、EDIT_TOOLS/tryParseOne 优先级/upgradeEditFromResult/MAX_DIFF_ROWS=200 均合 DESIGN。

## App.tsx

- **[judgement] 注释漂移**：`message_end` 注释称"用 in 守卫"，实现是 cast+可选链（合硬约束 8），注释与实现不符。
- **[judgement] Duplicated Code**：Clock 组件与 App uptime 时钟重复"1s interval+padStart"形状。
- **[judgement] 防御缺口**：启动 effect 直呼 `window.zion.getCurrentSession()` 无守卫；DESIGN 失败模式只覆盖两个订阅 effect——桥未注入时同步抛 TypeError（`.catch` 接不住），env.d.ts 非可选声明又掩盖此路径。最严重项之一。
- **[judgement] 错误回合双音/误日志**：`message_end`(error)→SND.abort，随后 `agent_end` 时 replyScheduled 仍 false→SND.reply+`[TURN] 回复完成`——中止音+回复音齐响并误记"完成"（agent_end 为回合终态必触发；e2e 不覆盖错误回合，未能运行时证实）。
- **[consistency] 通过**：事件→状态映射逐条合 DESIGN（agent_start 重置 replyScheduled、agent_settled、错误回 READY）；订阅清理正确（onAgentEvent 退订作 cleanup、扩展 UI 双退订）；triggerWorm 同步路径+wormedRef 去重+scanTree→openAncestors→双 rAF→`.trace` 兜底合 DESIGN；启动链 getCurrentSession→listSessions→deriveSessionTitle→applySession→setSessions→getProject→setCurrentProject 一致；硬编码装饰合"已知限制"自述。

## 其余文件

- title.ts **[consistency] 通过**：首行→剥内嵌引号对→去包裹引号→去前导符号→22 截断+'…'→短码兜底，逐字合 DESIGN；回退首行/空白压缩为注释自述，不冲突。
- toolfmt.ts **[judgement]**：bash 分支 JSON 兜底未套 `MAX_JSON` 截断，同文件规则不一致；其余合 DESIGN。
- env.d.ts **[judgement]**：`zion: ZionAPI` 非可选 vs 消费点 `window.zion?.` 防御——类型与运行时语义不一致（诚实做法 `zion?: ZionAPI`）；type-only 合硬约束 12。
- main.tsx / index.html：StrictMode、`#root`+`/src/main.tsx`、lang=zh-CN 均合文档，无发现。

## 汇总

总发现 12 项，全为 judgement/consistency，无 hard violation；数值规格逐字核对无偏差。最严重：启动链桥缺失无守卫（崩溃路径）、错误回合 abort+reply 双音/误日志。建议：① agent_end 时若错误已由 message_end 标记则跳过 SND.reply；② 启动 effect 加 `window.zion?.` 守卫且 env.d.ts 改可选；③ 顺手修"in 守卫"注释与 msgTime 复用。另注（仓库级）：根 AGENTS.md 引用的 docs/sdk.md 在本仓不存在。
