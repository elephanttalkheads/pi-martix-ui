---
name: ett-init
description: Initialize ETT-managed project and module documentation. Use only when the user explicitly invokes /skill:ett-init.

disable-model-invocation: true

---

# Initialize project documentation

`$ARGUMENTS` is either empty or one repository-local file or directory path. Reject flags, multiple paths, paths outside the Git worktree, and symbolic-link boundaries.

1. Read `eccToolkit/references/project-docs.md` (all paths in this Skill are relative to the project root).
2. From the project root, run `node eccToolkit/runtime/docs.mjs discover` with an optional `--path` argument passed as one safely quoted literal. Treat its JSON as evidence, not as permission to write. If the repository still carries the legacy layout (a `.claude/ett-docs.json` index or module `CLAUDE.md` content bodies), first run `node eccToolkit/runtime/docs.mjs migrate-canon` and report its result before continuing.
3. Inspect ambiguous candidates. Decide the final module list from source entry points, package/build manifests, responsibility boundaries, and existing indexed modules. Ordinary utility folders, fixtures, tests, generated output, and dependency directories are not modules by themselves.
4. Present one initialization plan containing the scan boundary, root recommendation, final modules, files to create or update, module README migrations/deletions, and every low-confidence or unclassified item. Use `AskUserQuestion` for one explicit approval. Do not write before approval.
5. Delegate each approved module to the `ett:doc-maintainer` Agent in `init` mode. Give it one module only. Modules may be processed independently, but no subagent may write root coordination state. If no subagent delegation tool is available in the current harness (for example pi without the pi-subagents extension), read the installed doc-maintainer agent file from the target's agents directory and follow its instructions directly for that module.
6. Reread every source README and the resulting module documents. If any valuable content is missing or uncertain, retain the README and mark the run blocked.
7. Update the project index by calling `docs.mjs index --path <scan-boundary>` with every final module inside that boundary supplied through repeated `--module <path>` arguments. A full-repository run replaces the full module list; a local run preserves entries outside its boundary. Only when the whole run is unblocked (no retained README, no unresolved item) append `--sync` so each in-scope module is marked `pending` and resolved lazily to the commit containing this index; never pass `--sync` for a blocked run.
8. For each fully migrated, approved non-root README, call `docs.mjs remove-readme --module <path>`; never delete the repository root README. Run `docs.mjs root-rule apply` after module edits so the root `AGENTS.md` preserves project content and contains exactly one ETT-managed documentation rule block.
9. Run `docs.mjs validate`. Fix managed documentation problems and rerun validation. Do not hide warnings or unresolved migrations.

Report the initialized modules, written and deleted files, preserved README files, index changes, each module's `quality` grade, and validation result; name every module scoring below 70 or marked `unresolved`. Never run `git add` or `git commit`.
