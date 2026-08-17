---
name: ett-doc-update
description: 完整协调 ETT 受管模块文档与工作区变更（语义 reconciliation、README 迁移、质量自评分、重建索引）。只由用户显式调用 /skill:ett-doc-update；模型不得自动触发。

disable-model-invocation: true

---

# Synchronize project documentation

`$ARGUMENTS` is either empty or one repository-local file or directory path. Reject flags, multiple paths, paths outside the Git worktree, and symbolic-link boundaries. Never stage or commit files.

1. Read `eccToolkit/references/project-docs.md` (all paths in this Skill are relative to the project root).
2. From the project root, run `node eccToolkit/runtime/docs.mjs changes` with the optional path passed as one safely quoted literal. This command requires a valid `eccToolkit/ett-docs.json`; if it reports `INDEX_REQUIRES_MIGRATION`, run `node eccToolkit/runtime/docs.mjs migrate-canon` first and report its result; if it reports a missing, corrupt, or unsupported index otherwise, stop and instruct the user to run the init Skill. Files excluded by a repository-root `.ettignore` (gitignore-style, supports `!` and `**`) are already filtered from candidates, changes, and unmapped changes; if the user intends a `.ettignore`-excluded path as a module, pass it explicitly to `index --module` and it is honored with a warning.
3. Review staged, unstaged, and untracked changes together. When `HEAD` does not exist, treat all non-ignored files as new. Inspect relevant diffs and current files rather than relying on line counts.
4. For every affected existing module, delegate exactly that module to the `ett:doc-maintainer` Agent in `update` mode. Require full semantic reconciliation of managed sections, not an appended change summary. If no subagent delegation tool is available in the current harness (for example pi without the pi-subagents extension), read the installed doc-maintainer agent file from the target's agents directory and follow its instructions directly for that module.
5. Add high-confidence new modules automatically and delegate their initial documents. Ask the user about low-confidence candidates. Treat ambiguous deletions, suspected module retirement, unreadable evidence, and conflicts in `## 人工补充` as blocking.
6. For a clear Git rename, migrate the module entry and update documents at the new path. Remove an index entry when the module directory was deleted with its code. Do not delete a retained README or documentation containing a non-empty manual section during routine synchronization.
7. Call `docs.mjs index --path <scan-boundary>` with the complete final module list as one `--module` per module inside that boundary; a missing module list is a blocking precondition — the CLI rejects the write (non-zero, no index change) unless you pass `--force`, so never call `index` without the full list. Then call `docs.mjs root-rule apply` and `docs.mjs validate`. Only when the whole run is unblocked append `--sync` to the index call so each in-scope module is marked `pending`; `collectChanges` resolves that marker lazily to the commit containing this index. A blocked run must not pass `--sync`, leaving baselines untouched so the next run re-examines those modules.
8. If validation or semantic reconciliation is blocked, state that `git commit` must not proceed. Otherwise report affected modules, files updated, new/removed/renamed modules, each module's `quality` grade, and validation success; name every module scoring below 70, marked `unresolved`, or with a `STALE_ABSOLUTE_PATH` warning so the user can schedule its cleanup.

This workflow may modify only documentation and `eccToolkit/ett-docs.json`. It must never run `git add` or `git commit`.
