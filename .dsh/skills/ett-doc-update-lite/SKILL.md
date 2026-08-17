---
name: ett-doc-update-lite
description: 轻量同步已受影响模块的文档描述与索引（修正过时描述，为新模块创建 AGENTS.md/DESIGN.md 并入索引）。只由用户显式调用 /skill:ett-doc-update-lite；模型不得自动触发。

disable-model-invocation: true

---

# 轻量同步模块文档

`$ARGUMENTS` 为空或一个仓库内文件/目录路径。拒绝 flags、多路径、越界路径与符号链接边界。绝不 `git add` / `git commit`。

1. 从项目根运行 `node eccToolkit/runtime/docs.mjs changes`（可选路径作为单个安全引用的字面量传参）。该命令需要有效的 `eccToolkit/ett-docs.json`；报 `INDEX_REQUIRES_MIGRATION` 时先运行 `migrate-canon` 并报告；报索引缺失/损坏/版本不受支持时停止并让用户运行 init Skill。`.ettignore` 已排除的路径同时从候选、changes 与未映射变更中剔除。
2. 合并审阅 staged、unstaged 与 untracked 变更；无 `HEAD` 时把全部未忽略文件视为新增。只对**受影响模块**工作，不扫描全仓库。
3. **为受影响模块修正描述**：逐模块读 `AGENTS.md`、`DESIGN.md` 与相关源码/测试，把受管主体内过时的描述改正（命令、路径、约束、失效内容整段重写），不追加变更日志。`AGENTS.md` 只保留**无法从代码直接得出**的约束与决策理由，不写从代码/清单可查的入口与命令，**不指向** `DESIGN.md`；`DESIGN.md` 记录给人看的架构地图（目标、流程、接口、决策、不变量、失败模式、限制）。`## 人工补充` 逐字保留；与已核实代码冲突时报告冲突并停止，不擅自改写。
4. **为新增模块建文档（一句话）**：新模块按 `eccToolkit/templates/` 两个模板各建最小准确内容的 `AGENTS.md` 与 `DESIGN.md`（各以 `## 人工补充` 结尾，无占位/臆测），代码目录删除则从索引移除。低置信度、疑似退役、证据不可读与人工补充冲突作为阻断，不硬编。
5. 调用 `docs.mjs index --path <扫描边界>`，把最终模块清单逐项以 `--module` 传入（缺失清单是硬性前置——CLI 拒绝写入返回非 0，除非显式 `--force`）。仅当整轮无阻断时才追加 `--sync` 把边界内模块标为 `pending`；阻断运行不得传 `--sync`。再运行 `docs.mjs validate`。
6. 校验或语义协调被阻断时，声明不得 `git commit`；否则报告：影响的模块、更新的文件、新增/移除/重命名模块、校验结果，并点名带 `STALE_ABSOLUTE_PATH` 警告的模块供用户安排清理。

本流程只允许修改文档与 `eccToolkit/ett-docs.json`。需要完整语义协调（README 迁移、质量自评分、重命名语义、解码旧内容）时改用完整版 `/skill:ett-doc-update`。
