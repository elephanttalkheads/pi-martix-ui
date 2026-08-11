# Research: pi RPC Mode as a Long-Lived Sidecar Process

Primary source: `docs/rpc.md` (full read) at `C:\Users\zyf\AppData\Local\nvm\v24.19.0\node_modules\@earendil-works\pi-coding-agent` (pi v0.84.1), plus `docs/sdk.md` "Run Modes" and "RPC Mode Alternative" sections, and `src/modes/rpc/rpc-client.ts` reference.

> Note: this is the reconstructed brief for the rpc research ticket (the original subagent run completed without writing a file). Grounded directly in the local docs.

## Summary

`pi --mode rpc` is a full JSONL-over-stdio protocol for embedding pi in non-Node hosts (Rust, .NET, Python, etc.). The command surface covers the entire session lifecycle: prompt/steer/follow_up/abort, session new/switch/fork/clone, model & thinking control, bash execution with abort, compaction & retry control, export_html, and stats. Agent events stream to stdout so a UI can render live deltas, tool calls, and lifecycle changes. It is the right choice only when the host is not Node.js or when process isolation is a hard requirement; the SDK (`AgentSession`) is the preferred path for Node-based hosts (Electron).

## 1. Framing rules (must-follow)
- Strict JSONL, LF (`\n`) is the **only** record delimiter.
- Client must split on `\n` only; strip a trailing `\r` if present (accept `\r\n` input).
- **Do not use Node `readline`** — it splits on U+2028/U+2029 (valid inside JSON strings). Use `readline`-free line splitting or a byte-level parser.

## 2. Command surface (v0.84.1)
- **Prompting**: `prompt` (text, options incl. streaming behavior), `steer`, `follow_up`, `abort`
- **State**: `get_state`, `get_messages`
- **Model**: `set_model`, `cycle_model`, `get_available_models`
- **Thinking**: `set_thinking_level`, `cycle_thinking_level`, `get_available_thinking_levels`
- **Queue modes**: `set_steering_mode`, `set_follow_up_mode`
- **Compaction**: `compact`, `set_auto_compaction`
- **Retry**: `set_auto_retry`, `abort_retry`
- **Bash**: `bash` (user `!cmd`), `abort_bash`; `bash_execution_update` events carry the originating command id
- **Session**: `get_session_stats`, `export_html`, `switch_session`, `fork`, `clone`, `new_session`

## 3. Streaming events
- Agent events stream to stdout as JSON lines: message text/thinking deltas, tool execution start/update/end, message/turn/agent lifecycle, queue updates, auto-retry, compaction, bash execution updates, session info changes.
- Responses are `type: "response"`; correlation via optional `id` field on command → response.

## 4. Session lifecycle in a sidecar
- `new_session` starts a fresh session; `switch_session`/`fork`/`clone` manage multiple sessions from one process. One `pi --mode rpc` process can host multiple sessions and switch among them — same as `AgentSessionRuntime`.
- Session persistence is on by default (`~/.pi/agent/sessions/...`); `--no-session` disables it.

## 5. Windows operational notes
- Spawn `pi --mode rpc` via `child_process.spawn` (or equivalent), `windowsHide: true` to avoid console flashes, wire stdin/stdout as binary-safe streams (encoding utf8, split on `\n` only).
- Tree-kill on shutdown: Windows needs `taskkill /T /F` to avoid orphaned grandchildren.
- Restart/recovery: an RPC sidecar is stateless on the wire — the host reconnects to a new process and restores via session files (`get_messages`, session path); treat the process as disposable.
- `export_html` gives a ready-made HTML render of a session — usable for "trace playback" style features.

## 6. Gaps vs SDK (what a UI misses)
- No type safety / no in-process agent state access; must parse JSON events.
- Extensions' `ctx.ui` interactions need the same custom bridge work as the SDK (extension UI is headless in RPC too).
- All cross-boundary calls have serialization overhead vs in-process `AgentSession`.
- SDK's `createAgentSession()` is explicitly recommended over spawning a subprocess for Node/TS hosts.

## Recommendation
For this project (Electron main process = Node.js): **use the SDK, not RPC**. RPC remains the fallback if a future shell decision moves away from Node (e.g., Tauri), or if crash-isolation of the agent from the UI becomes a requirement.
