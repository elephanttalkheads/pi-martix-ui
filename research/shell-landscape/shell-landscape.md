# Research: Windows Desktop Shell Landscape (2026) for a Matrix-Themed Node-Agent Console

> Courtesy copy — canonical artifact: `D:\pi-martix-ui\.pi-subagents\artifacts\outputs\86ca0bd6\research.md`

Scope: small developer-tool desktop app, Windows-only, single-user, hosting an HTML5 UI with heavy canvas animation (Matrix digital-rain/grid) and embedding/wrapping a Node.js CLI coding agent ("pi"). Frameworks compared: Electron, Tauri v2, .NET + WebView2 (WPF / WinUI 3), pywebview (Python), Neutralino.js.

Research date: Aug 2026. All versions/benchmarks current as of that window.

---

## Summary

For a Windows-only Matrix console whose two hard requirements are (a) deterministic, smooth canvas/WebGL animation and (b) robust lifecycle management of an embedded Node.js CLI agent, **Electron (v43.x stable)** is the lowest-risk primary recommendation: it ships a pinned Chromium 150 (you control exactly when the rendering engine changes), has Node.js natively in the main process so spawning/streaming/killing `pi` is trivial, and its packaging story (NSIS/MSI/winget + delta updates) is the most mature in the industry. The penalties — ~85–200 MB installer and ~150–250 MB idle RAM — are acceptable for a developer tool running on a single user's machine. **Tauri v2.11.x is the strong lean alternative** if installer size (3–15 MB) and idle RAM (40–80 MB) are deal-breakers: the official "Node.js as a sidecar" pattern (SEA-packaged agent binary + `externalBin` + shell-plugin scoping) is documented for exactly this use case, but you inherit Evergreen WebView2 version drift (Microsoft updates the engine monthly outside your control) and a Rust toolchain. .NET WPF/WinUI 3 + WebView2, pywebview, and Neutralino are viable but each has a disqualifying wrinkle for this specific app (see per-framework notes).

## Comparison Table

| Metric | Electron 43 | Tauri v2 | .NET 10 + WebView2 (WPF / WinUI 3) | pywebview (Python) | Neutralino.js |
|---|---|---|---|---|---|
| Latest stable (Aug 2026) | **43.3.0** (Chromium 150, Node 24.18.1, V8 15.0); v44 in beta | **v2.11.5** (Jul 1, 2026) | .NET **10.0.10** (LTS, Nov 11 2025 GA, supported to Nov 2028); WinUI 3 via Windows App SDK **2.3.1** (Jul 16, 2026) | **6.2.1** (Apr 15, 2026) | **v6.8.0** |
| Installer size (Win) | 85 MB (hello world) → 150–250 MB real apps; measured 201 MB (Beekeeper 5.9.2 NSIS) | 3–15 MB simple; 12 MB measured real app (Tabularis 0.16.0 NSIS); ≤40 MB with heavy assets | Framework-dependent ~5–20 MB app + .NET Desktop Runtime prereq (~60–70 MB download); self-contained ~100–170 MB; WinUI 3 unpackaged needs WinAppSDK runtime redist | PyInstaller-frozen ~20–60 MB (bundles CPython; no browser bundled) | ~2–5 MB (binary ~1–2 MB; official sample apps <1 MB compressed) |
| Idle RAM (terminal-like app) | 150–250 MB empty; 250–500 MB with a real UI; fixed overhead: GPU process ~266 MB + network service ~36 MB | 42 MB hello-world (Jul 2026 bench); ~60–120 MB with UI on WebView2 | WebView2 first instance ~250 MB (MS team estimate) + .NET host ~30–80 MB → ~250–330 MB | CPython ~30–60 MB + WebView2 ~150–250 MB → ~200–300 MB | ~6–7 MB (official sample) to ~20–60 MB real apps |
| WebView2 runtime dependency | **None** — bundles its own Chromium | Uses system WebView2 (Evergreen) | Uses system WebView2 (Evergreen) | Uses system WebView2 (EdgeChromium backend) | Uses system WebView2 on Windows |
| WebView2 on Win10 21H2+ / Win11 | N/A | Win11: preinstalled; Win10: not in the OS, but pushed via Windows Update to ~all active devices (consumers 2022, managed Jan 2023); ~2 MB bootstrapper fallback recommended | same | same | same |
| Canvas/WebGL animation | Bundled Chromium 150 — **pinned, deterministic**; engine regressions arrive on your upgrade schedule | WebView2 = Chromium-based (Edge Stable ≈ 142.x); same engine family, but Evergreen updates land monthly outside your control — documented 4K canvas regression in Runtime 142 | same as Tauri | same as Tauri | same as Tauri |
| Packaging options | electron-builder/Forge: NSIS, MSI, portable exe, MSIX, winget; electron-updater delta patches | Tauri bundler: NSIS, MSI (WiX), MSIX (external), in-app updater, winget | MSIX (first-class), MSI/WiX, Inno/NSIS (community), single-file publish, winget | PyInstaller (onefile/onedir) + NSIS/Inno/MSI wrapper; no official updater | `neu build` → binary + resources; NSIS wrapping manual; no official updater |
| Build-toolchain friction | Low — Node/npm; no native compile unless you add node-pty etc. (then MSVC rebuild) | Medium–high — Rust compile (first build ~48 s vs 22 s Electron, incremental 3.5 s vs 2.1 s); must QA against WebView2 version variance | Medium — Visual Studio + .NET SDK, C#; WinUI 3 notably more friction than WPF (younger framework, e.g. WebView2 drag-drop only since WinAppSDK 2.0) | Low–medium — pip + PyInstaller; freezing is fiddly and triggers AV false positives; Python version pinning | Low — neu CLI (Node-based), no compilation; tiny ecosystem, docs and tooling thin |
| Security posture | Chromium sandbox, `contextIsolation` on by default (v12+), `nodeIntegration` off, Fuses hardening; largest attack surface (bundles a full browser) | Capability/allowlist system, Rust backend, no browser bundled; sidecar spawns scoped by permission | WebView2 renderer runs isolated (app container for packaged apps; Fixed-Version v120+ needs icacls grants on Win10); Evergreen runtime security-patched by MS | No OS-level sandbox by default; must configure WebView2 settings manually; PyPI supply chain + arbitrary Python code | Small native API surface with permission allowlist; small maintainer team |
| Known pitfalls (canvas / child process) | GPU process 266 MB fixed cost; WebGL contexts leak if canvases not disposed (VS Code: 167 MB/10 idle terminals); Electron 40+ PartitionAlloc inflates RSS (measure `heapUsed`); renderer OOM ~4 GB; killing process trees needs `taskkill /T /F` to avoid orphaned node children | Sidecar naming `{name}-{target-triple}` is fragile; `spawn()` success ≠ healthy process (verify with real evidence); WebView2 Evergreen canvas regressions outside your control; no Node in renderer — all agent I/O must cross the Rust IPC boundary | WebView2 ~250 MB floor for first instance; per-WebView renderer ~30 MB each; reload loops leak unless you force GC/navigate-away; WinUI 3 drag-drop/ecosystem gaps | MSHTML (IE11) fallback backend is terrible for canvas — must force EdgeChromium; js_api bridge serializes objects (slow for high-frequency updates); PyInstaller AV false positives | Limited process management APIs — long-running agents need the extension mechanism; community reports cases where Neutralino used *more* RAM than Electron for the same app (issue #1226) |

---

## Per-Framework Findings

### 1. Electron (latest stable v43.3.0 — Chromium 150.0.7871.212, Node v24.18.1, V8 15.0; v44 beta; majors every 8 weeks, latest 3 majors supported)

1. **Version reality**: Electron 43 shipped Jun 30, 2026; 43.3.0 is current stable (Aug 4, 2026); 44 is in beta. Support window: latest 3 majors (42/43/44), ~8-week cadence. Node 24.x embedded is the current LTS line — a good match for an npm-installed `pi` agent. [Electron releases](https://releases.electronjs.org/) · [endoflife.date/electron](https://endoflife.date/electron)
2. **Size**: Hello-world NSIS ~85 MB; real apps 150–250 MB. Measured real-world pair: Beekeeper Studio 5.9.2 (Electron) Windows installer 201 MB vs Tabularis 0.16.0 (Tauri) 12 MB — the delta is essentially Chromium's fixed floor, ~120 MB of engine per app. [Tabularis/HackerNoon](https://hackernoon.com/six-months-with-tauri-the-benefits-and-the-bill)
3. **Idle RAM**: empty app ~150–250 MB (2026 community consensus); a production React terminal UI realistically lands at 250–500 MB. Fixed overhead per the yaw.sh audit: GPU process 266 MB idle (no API to reduce it), network service 36 MB. [yaw.sh Electron audit](https://yaw.sh/blog/electron-performance-audit/) · [Fora Soft 2026 guide](https://www.forasoft.com/blog/article/electron-desktop-app-development-guide-for-business)
4. **Canvas/WebGL**: bundled Chromium 150 = deterministic; identical engine to Edge/WebView2 on Windows, so Matrix-rain-scale Canvas2D (hundreds–low-thousands of glyphs) is trivially smooth. Known traps: WebGL contexts leak if canvases are not explicitly disposed (VS Code fix: 10 idle xterm terminals → 167 MB leaked GPU memory); PartitionAlloc (Chromium 144+/Electron 40+) keeps RSS high after cleanup — measure `heapUsed`, not RSS. [VS Code issue #279579](https://github.com/microsoft/vscode/issues/279579) · [daintree memory plan](https://github.com/daintreehq/daintree/issues/4141)
5. **Embedded Node agent (pi)**: first-class. Spawn `pi` from the main process via `child_process.spawn`, stream stdout/stderr to the renderer over IPC, `taskkill /T /F` for tree-kill on Windows. node-pty-style PTY handling is battle-tested (VS Code, Tabby, Hyper). Pitfalls: orphaned grandchildren on crash, renderer OOM ~4 GB, asar + native-module rebuild friction only if you add compiled modules.
6. **Packaging/security**: electron-builder (NSIS, MSI, portable, MSIX) or Forge; electron-updater delta patches; winget publishing is routine. Security defaults strong (contextIsolation on, sandbox on, Fuses). Main risk is simply the large bundled-browser attack surface. [Electron security tutorial](https://www.electronjs.org/docs/latest/tutorial/security)

### 2. Tauri v2 (v2.11.5, Jul 1 2026)

1. **Version reality**: v2 line stable since Oct 2024; frequent servicing (2.10/2.11 in H1 2026). Mobile (iOS/Android) exists but is irrelevant for a Windows-only app. [Tauri releases](https://v2.tauri.app/release/tauri/)
2. **Size/RAM**: 3–15 MB installers; 12 MB measured for a real DB IDE; ~29 MiB installed for a real API client (Ironcall). Idle RAM 42 MB hello-world (Jul 2026 independent bench), ~60–120 MB with a real UI on WebView2; 279 MB for the Linux/WebKitGTK Ironcall client — Windows (WebView2) numbers sit in the lower band because WebView2 subprocesses are shared with Edge. [tech-insider.org bench](https://tech-insider.org/tauri-vs-electron-2026/) · [Ironcall](https://dev.to/ironcall/our-api-client-is-a-29-mb-binary-and-starts-in-01s-heres-the-tauri-vs-electron-footprint-with-2h18)
3. **Canvas/WebGL**: WebView2 is Chromium-based, so renderer performance ≈ Electron on Windows. The catch is Evergreen version drift: the runtime updates monthly with Edge, outside your control, and regressions do happen — WebView2 Runtime 142 broke stacked WebGL→2D→2D canvas apps at ≥3840 px width (~160→50 FPS; fixed only by downgrading to 141; reproduced in Chrome/Edge 142). [WebView2Feedback #5426](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5426). A fixed-version runtime (bundled, pinned) exists but costs ~150 MB and stops auto-updating — defeating Tauri's size advantage.
4. **Embedded Node agent (pi)**: officially documented pattern — package `pi` as a Node SEA binary (esbuild CJS bundle + `postject` + Node binary copy), declare under `bundle.externalBin` with the mandatory `{name}-{target-triple}` suffix, spawn via `@tauri-apps/plugin-shell` with capability scoping. Real-world precedent: shipping an AI coding agent as a Tauri sidecar over JSON-RPC-on-stdio. Pitfalls: naming is fragile (one wrong character = silent runtime miss), `spawn()` success ≠ process healthy (verify via real evidence/backoff), agent I/O crosses the Rust↔JS IPC boundary, and the Node-version must match the SEA's (pi's own node_modules must be bundled — the system-installed `pi` can instead be spawned from PATH via a scoped `shell:allow-execute` entry, which is simpler for a single-user tool). [Tauri sidecar docs](https://v2.tauri.app/develop/sidecar/) · [Node.js as a sidecar](https://v2.tauri.app/learn/sidecar-nodejs/) · [SEA sidecar pattern writeup](https://serverlessdna.com/strands/ai-agents/sea-sidecar-pattern)
5. **Toolchain**: Rust + Node; first build ~48 s vs Electron 22 s (incremental 3.5 s vs 2.1 s). You own WebView2 version-variance QA (CSS/GPU-compositing quirks across Evergreen updates). [tech-insider bench](https://tech-insider.org/tauri-vs-electron-2026/)

### 3. .NET 10 + WebView2 (WPF or WinUI 3)

1. **Version reality**: .NET 10 LTS GA Nov 11, 2025, patch 10.0.10 (Jul 14, 2026), supported to Nov 14, 2028; WPF got perf/fluent improvements in .NET 10. WinUI 3 ships via Windows App SDK: stable 2.3.1 (Jul 16, 2026); the 2.0 line (Apr 2026) is the first SemVer major since 1.0 (2021) — a sign the framework is stabilizing, but it is still the youngest of the options. [.NET 10 announcement](https://devblogs.microsoft.com/dotnet/announcing-dotnet-10/) · [WinAppSDK 2.3.1](https://github.com/microsoft/WindowsAppSDK/releases/tag/v2.3.1)
2. **Size/RAM**: framework-dependent WPF app is small (~5–20 MB) but requires the .NET Desktop Runtime (~60–70 MB) on the machine; self-contained ~100–170 MB. WebView2 dominates RAM: MS team estimate ~250 MB for the first WebView2 instance, ~100+ MB each subsequent (renderer alone ~30 MB per instance). [WebView2Feedback #799](https://github.com/MicrosoftEdge/WebView2Feedback/issues/799)
3. **Canvas/WebGL**: identical engine to Tauri (WebView2), so the same Evergreen-version caveats apply. Notably, WebView2 rendering beats WPF-native animation for smoothness — a real dotnet/wpf discussion found CSS animation inside WebView2 smoother than WPF Storyboards. Since your UI (Matrix rain) renders inside the web content, WPF's animation pipeline is not on the critical path at all. [dotnet/wpf #11607](https://github.com/dotnet/wpf/discussions/11607)
4. **Embedded Node agent (pi)**: no Node runtime — you spawn the system `pi` exe via `System.Diagnostics.Process` and bridge over stdio/JSON, or host a local WebSocket/HTTP. Fine, but you rebuild process plumbing (PTY, streaming, kill-tree) that Electron gives you free.
5. **Known pitfalls**: per-WebView renderer growth on reload loops (mitigate with GC nudges or navigate-away); WinUI 3 gaps (e.g. WebView2 drag-and-drop only landed in WinAppSDK 2.0); unpackaged Fixed-Version runtime ≥v120 requires icacls grants on Win10. [WebView2Feedback #3678](https://github.com/MicrosoftEdge/WebView2Feedback/issues/3678) · [WebView2 performance docs](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance)

### 4. pywebview (v6.2.1, Apr 15 2026)

1. **Version reality**: active (6.0–6.2 through 2025–26), BSD-3, ~5.9k stars, 160 contributors. On Windows the default backend is EdgeChromium (WebView2) with an MSHTML (IE11) fallback — must force EdgeChromium for canvas work. [GitHub](https://github.com/r0x0r/pywebview) · [PyPI](https://pypi.org/project/pywebview/)
2. **Size/RAM**: freezing via PyInstaller yields ~20–60 MB installers; RAM = CPython (~30–60 MB) + WebView2 (~150–250 MB) → ~200–300 MB idle. Not meaningfully lighter than Electron, with worse packaging ergonomics.
3. **Embedded Node agent (pi)**: Python `subprocess.Popen` works, and Python is a fine orchestration layer — but you'd be maintaining a second runtime (Python) solely to host a webview, when pi itself is Node.
4. **Pitfalls**: js_api bridge serializes JS↔Python values (slow for high-frequency canvas/token streams — prefer WebSocket/stdio); PyInstaller AV false positives; Python version/environment drift on end-user machines. Nothing here beats Electron or Tauri for this specific app.

### 5. Neutralino.js (v6.8.0)

1. **Version reality**: active small project (6.x through 2025–26); uses OS webview (WebView2 on Windows). [Releases](https://github.com/neutralinojs/neutralinojs/releases)
2. **Size/RAM**: the strongest numbers on paper — ~5–6 MB SDK, sample apps <1 MB, ~6–7 MB RAM for official samples. But the official evaluation is a trivial window; a real Matrix UI + agent pushes it to the ~20–60 MB band, and there are reports of Neutralino apps using *more* RAM than Electron for identical workloads (issue #1226). [neutralinojs/evaluation](https://github.com/neutralinojs/evaluation) · [issue #1226](https://github.com/neutralinojs/neutralinojs/issues/1226)
3. **Embedded Node agent (pi)**: weakest fit — Neutralino's process API (`os.execCommand`) is for short-lived commands; long-running agents require the custom extension mechanism (Node/Python child processes registered with the binary). No first-class sidecar/stdio-streaming story like Tauri's.
4. **Pitfalls**: tiny ecosystem and maintainer team, thin packaging tooling (manual NSIS), same Evergreen WebView2 caveats. Fine for a demo/utility, risky as the foundation of a product you iterate on weekly.

---

## Cross-cutting: WebView2 runtime reality on Win10 21H2+ and Win11

- **Win11: preinstalled.** The Evergreen WebView2 Runtime ships as part of Windows 11 — zero runtime bytes to ship. [Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)
- **Win10: not part of the OS, but near-universally present.** Microsoft pushed the runtime to consumer Win10 devices via Windows Update (mid-2022) and to managed devices after Jan 16, 2023; docs say "the vast majority of active Windows 10 devices" have it, and recommend handling the small remainder. [Windows Blogs](https://blogs.windows.com/msedgedev/2022/12/14/delivering-microsoft-edge-webview2-runtime-to-managed-windows-10-devices/)
- **Fallback is cheap**: the Evergreen bootstrapper is ~2 MB (online install) or the standalone installer for offline; MSIX apps can declare it as an external dependency. Tauri's NSIS/MSI bundler wires the bootstrapper in by default.
- **Current version**: Evergreen runtime tracks Edge Stable (≈142.x in mid-2026; 142.0.3595.94 hit the Update Catalog Nov 2025). Your app cannot pin the Evergreen version — that is the single biggest risk for a canvas-heavy app. [Edge 142 release notes](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/release-notes/142)
- **Caveat for 2026**: Windows 10 21H2/22H2 are past end-of-support (consumer EOL Oct 14, 2025; ESU thereafter). On those machines WebView2 still works, but you are shipping for a shrinking, unpatched population; the runtime itself keeps updating.

## Cross-cutting: canvas/WebGL animation performance (Windows)

- On Windows, Electron, WebView2 (Tauri/.NET/pywebview/Neutralino) all render with Blink/Chromium. A cross-platform study (10→10,000 animated objects) found: DOM/CSS degrades after ~500 objects; Canvas2D is smooth to a few thousand; WebGL is the only tech holding 5,000–10,000 objects stable. Matrix digital rain (hundreds of glyphs, maybe thousands at 4K with glow) is squarely Canvas2D territory and trivially achievable in any of these shells. [MDPI benchmark](https://www.mdpi.com/2313-433X/12/1/45)
- The real differentiator is **engine change control**: Electron pins Chromium (you choose the upgrade); WebView2 Evergreen changes monthly underneath you (evidence: Runtime 142's 4K stacked-canvas regression, ~160→50 FPS, affecting both Edge and WebView2 apps). [WebView2Feedback #5426](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5426)
- Dispose WebGL contexts explicitly (VS Code shipped a fix for a 167 MB GPU leak from 10 idle terminal canvases) and budget GPU-process memory (~266 MB in Electron; similar in WebView2). [VS Code #279579](https://github.com/microsoft/vscode/issues/279579)

## Cross-cutting: embedding the Node.js CLI agent (pi)

- **Electron**: zero-friction. Node 24 in the main process; `spawn('pi')`, stdio streaming, PTY via node-pty if needed, tree-kill with `taskkill /T /F`. This is the architecture of VS Code/Claude Code terminals.
- **Tauri**: documented pattern — Node SEA sidecar or scoped spawn of system `pi`. Adds a build pipeline (esbuild→SEA→postject→triple-naming), a capability scope, and an IPC boundary; the crash-isolation (agent dies, UI survives) is actually a plus. Real precedent exists for exactly an AI coding agent. [serverlessdna.com](https://serverlessdna.com/strands/ai-agents/sea-sidecar-pattern)
- **.NET / pywebview / Neutralino**: all spawn an external process and hand-roll the bridge. More plumbing, no advantage for this app.

---

## Recommendation

**Primary: Electron (pin v43.x, upgrade on the 8-week cadence).** Rationale, in priority order:
1. The app's visual identity is canvas animation → pinned Chromium gives deterministic rendering and your own upgrade schedule. Evergreen WebView2 (all other options) changes the engine monthly and has a documented 4K-canvas regression on record.
2. The agent is a Node.js CLI → Electron embeds Node 24 natively; spawning, streaming, and killing `pi` is the least-friction path and the most battle-tested pattern in the industry.
3. Single-user Windows-only → the 85–200 MB installer and ~250–500 MB RAM are acceptable; VS Code/Slack-scale apps prove users tolerate it.
4. Packaging (NSIS/MSI/winget/electron-updater deltas) is the most mature of the five.

Mitigations to plan for: single BrowserWindow, disable `backgroundThrottling` for the canvas window, dispose WebGL contexts on teardown, measure `heapUsed` (PartitionAlloc inflates RSS), `taskkill /T /F` on agent shutdown, contextIsolation on with a minimal preload.

**Runner-up: Tauri v2 (v2.11.x) if installer size/RAM are hard requirements** (<20 MB, <100 MB idle). Use the official sidecar pattern for `pi` (SEA-packaged, or scoped spawn of the system-installed `pi`), pin nothing (Evergreen) and add a canvas smoke-test (4K, stacked WebGL+2D) to your release checklist to catch runtime regressions early; the Fixed-Version runtime option (~150 MB, no auto-update) is the escape hatch if a regression ever lands. Accept Rust toolchain and WebView2-variance QA costs.

**Not recommended for this app**: .NET WPF/WinUI 3 (WebView2 RAM floor ~250 MB + rebuild all agent plumbing; only choose if you want the most Windows-native shell and are a C# team), pywebview (adds a second runtime for no advantage), Neutralino.js (weakest agent-process story, smallest ecosystem, and even a RAM regression report vs Electron on record).

---

## Sources

### Kept
- Electron releases / endoflife.date — current stable 43.3.0, Chromium 150, Node 24.18.1, support policy. (https://releases.electronjs.org/) (https://endoflife.date/electron)
- Electron Performance docs — official guidance on renderer/GPU memory and process model. (https://electronjs.org/docs/latest/tutorial/performance)
- yaw.sh Electron process audit — GPU process 266 MB / network 36 MB fixed overhead, real measurements. (https://yaw.sh/blog/electron-performance-audit/)
- Tabularis "six months with Tauri" — measured installer sizes 12 MB (Tauri) vs 201 MB (Electron), WebView2-variance trade-offs. (https://hackernoon.com/six-months-with-tauri-the-benefits-and-the-bill)
- Tauri releases v2.11.5; Tauri sidecar docs; Node.js-as-a-sidecar guide — the official embedded-agent pattern. (https://v2.tauri.app/release/tauri/) (https://v2.tauri.app/develop/sidecar/) (https://v2.tauri.app/learn/sidecar-nodejs/)
- tech-insider.org July 2026 benchmark — Tauri 42 MB idle / 3.2 MB bundle vs Electron 168 MB / 85 MB; build-time deltas. (https://tech-insider.org/tauri-vs-electron-2026/)
- serverlessdna.com SEA sidecar pattern — shipping a Node.js AI agent inside a Tauri desktop app, real implementation notes. (https://serverlessdna.com/strands/ai-agents/sea-sidecar-pattern)
- Microsoft Learn: Distribute your app and the WebView2 Runtime; Evergreen vs fixed version; WebView2 end-user FAQ — Win11 preinstalled, Win10 rollout, ~2 MB bootstrapper, registry detection keys. (https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)
- Windows Blogs: delivering WebView2 runtime to Windows 10 — consumer (2022) and managed-device (Jan 2023) rollout, "vast majority" coverage statement. (https://blogs.windows.com/msedgedev/2022/12/14/delivering-microsoft-edge-webview2-runtime-to-managed-windows-10-devices/)
- WebView2Feedback #5426 — Runtime 142 4K stacked-canvas regression (~160→50 FPS), also in Chrome/Edge 142. (https://github.com/MicrosoftEdge/WebView2Feedback/issues/5426)
- WebView2Feedback #799 — MS team RAM estimates (~250 MB first instance, ~100 MB subsequent; renderer ~30 MB). (https://github.com/MicrosoftEdge/WebView2Feedback/issues/799)
- WebView2 performance best practices (MS Learn) — multi-process model, memory targets, TrySuspendAsync. (https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance)
- .NET 10 announcement + support policy — LTS, Nov 11 2025 GA, WPF improvements. (https://devblogs.microsoft.com/dotnet/announcing-dotnet-10/) (https://dotnet.microsoft.com/en-us/platform/support/policy)
- Windows App SDK release channels + 2.3.1 — WinUI 3 stable versioning, drag-drop milestone, support table. (https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/release-channels)
- pywebview releases/6.2.1 — current version, EdgeChromium backend on Windows. (https://github.com/r0x0r/pywebview/releases) (https://pypi.org/project/pywebview/)
- Neutralino releases v6.8.0 + official evaluation repo — size/RAM claims (6–7 MB samples). (https://github.com/neutralinojs/neutralinojs/releases) (https://github.com/neutralinojs/evaluation)
- VS Code #279579 — WebGL context leak from idle terminal canvases (167 MB / 10 terminals). (https://github.com/microsoft/vscode/issues/279579)
- dotnet/wpf #11607 — WPF-native animation stutters where WebView2 CSS animation is smooth. (https://github.com/dotnet/wpf/discussions/11607)
- MDPI animation benchmark — DOM degrades ~500 objects, Canvas2D good to thousands, WebGL to 10k. (https://www.mdpi.com/2313-433X/12/1/45)
- Edge 142 web platform release notes / Update Catalog — Evergreen runtime ≈ 142.x in mid-2026. (https://learn.microsoft.com/en-us/microsoft-edge/web-platform/release-notes/142)

### Dropped
- SEO "vs" listicles without measurements (trybuildpilot.com, pkgpulse.com, rustify.rs, forasoft.com) — used only for cross-checking consensus ranges, not as evidence; their numbers align with the primary sources cited above.
- suguggest.com Neutralino-vs-pywebview page — no substance.
- Older Electron-v10-era working-set comparison (noseratio/CompareWebViews) — engine versions too old to be current evidence; MS team estimates cited instead.

## Gaps
- No first-party Microsoft figure for current WebView2 idle RAM; the ~250 MB first-instance figure is a 2021 Microsoft engineer comment (still the best available, corroborated by developer reports).
- No published side-by-side benchmark of *this exact workload* (xterm-style WebView2 terminal + canvas rain) across the five shells; numbers above are per-shell baselines plus community terminal-app evidence (Tabby/Hyper/xterm.js 15–40 MB per instance).
- Suggested next step before committing: build the identical minimal Matrix-rain + spawned-`pi` prototype in Electron 43 and Tauri 2.11, measure (a) idle RAM via PSS, (b) 4K fullscreen canvas FPS over 24h to catch Evergreen drift, (c) agent kill/restart latency and orphan behavior.

---

*Environment note: memory_search was unavailable in this run; no durable project context existed for this greenfield research task.*
