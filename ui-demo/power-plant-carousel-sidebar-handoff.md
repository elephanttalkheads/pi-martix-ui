# Power Plant Carousel Sidebar — migration handoff

> Status: standalone UI prototype and migration reference. This repository is deprecated; do not integrate the prototype into its production renderer. The intended next home is `deepseek-zion`.

## Entry points

- Demo: `ui-demo/power-plant-carousel-sidebar-prototype.html`
- Motion-axis comparison: `ui-demo/power-plant-q10-rotation-prototype.html`
- Assets: `ui-demo/assets/power-plant-carousel/`

The actual sidebar inside the demo is exactly `280px × 100vh`. The explanatory panel beside it is not part of the sidebar and disappears below 760px.

## Domain mapping

| Product entity | Spatial representation |
| --- | --- |
| Power Plant layer | Workspace |
| Human pod | Session |
| Vertical wall travel | Workspace switch |
| Horizontal 10° ring step | Session switch |
| Session plaque | Current session title, state and time |
| Dormant bay | Infrastructure only; never a fake session |

Each workspace stores three pieces of view state:

```js
{
  sessionIndex,        // logical selected session
  displaySessionIndex, // plaque currently allowed to display
  rotation             // cumulative degrees; 10° per session step
}
```

Returning to a workspace restores all three values.

## Interaction contract

- `W`, `S`, Up/Down, vertical wheel or vertical swipe: switch workspace.
- `A`, `D`, Left/Right, horizontal wheel, Shift+wheel or horizontal swipe: switch session.
- Click either readable neighbour pod: move that session to the front.
- The top boundary is finite; the demo generates additional layers indefinitely downward.
- Production migration must replace procedural layers with real workspaces and keep only dormant infrastructure after the final real workspace.

## Motion contract

- Session: retract → rotate 10° → extend → lock → energy pulse, `620ms`.
- Every bay remains on one horizontal depth plane: its wrapper uses `rotateY(angle) translateZ(88px)` with no `translateY`, vertical fan-out or counter-rotation. The pod therefore keeps its radial orientation while orbiting the vertical axis inside the wall.
- Repeated session input accumulates target angle; the plaque settles only after the last input.
- Workspace: wall and layer field move vertically with depth parallax, `760ms`.
- Rapid workspace input retains only a seven-layer virtual window (`current ± 3`). Cleanup recomputes the active range when the timer fires, so stale timers cannot remove the current layer.
- Reduced mode sets all transitions to their end state immediately and removes continuous atmosphere motion.

## Rendering layers

1. **Generated bitmap wall** — continuous architectural surface, repeated vertically and shifted during workspace changes.
2. **Generated alpha pod** — reused by all 36 physical visual bays.
3. **CSS 3D** — true vertical-axis radial projection, 10° bay spacing, browser perspective and pod extension.
4. **Canvas 2D** — low-cost motes, session energy pulse and workspace scan pulse; DPR capped at 2.
5. **DOM** — workspace stencil, current-session plaque, keyboard focus and accessible labels.

Only the front pod and its two neighbours map readable session data. The remaining real DOM bays are unlabeled dormant infrastructure used to communicate the 36-bay building scale. The earlier circular axle SVG, elliptical tick ring and static red comb were removed: they obscured the radial motion and made the layer read as a flat stacked list.

The prototype currently reuses one strict side-view pod bitmap. That is enough to validate the orbit, but it remains a flat plane at steep angles. A higher-fidelity migration should replace it with a `-80°…80°` multi-angle sprite set (7–9 views) or a small 3D pod mesh without changing the orbit state model.

## State vocabulary

- `READY` — stable green lamp.
- `THINKING` — amber life pulse.
- `STREAMING` — cyan transmission pulse.
- `ERROR` — angular blinking indicator plus visible text; not colour-only.
- `ARCHIVED` — sealed, dimmed, desaturated pod.

Selection is independent from run state: the selected pod is front-facing, extended and paired with the plaque.

## Experience modes

- `CINEMATIC` — full atmosphere, parallax and continuous low-frequency motion.
- `FOCUS` — suppresses distant layers and wall saturation while preserving mechanical navigation.
- `REDUCED` — honours `prefers-reduced-motion` or manual selection and displays animation end states.
- `SND` — optional Web Audio servo and lock sounds; off by default.

## Migration to deepseek-zion

Suggested component seams:

- `PowerPlantSidebar` — navigation, workspace virtual window and mode controls.
- `PowerPlantLayer` — one workspace, the 36-bay projection and current plaque.
- `PowerPlantAtmosphere` — Canvas renderer isolated behind a ResizeObserver.
- `usePowerPlantNavigation` — cumulative ring angle, settle timers and keyboard/wheel intent routing.

Migration requirements:

1. Copy the two assets into the target renderer asset pipeline and import them through its bundler.
2. Replace `fixedWorkspaces`, `createProceduralWorkspace` and `workspaceCache` with the real workspace/session store.
3. Do not migrate `DEMO DATA`, synthetic statuses or infinite fake workspace creation.
4. Scope keyboard listeners to the focused sidebar or target app command system; do not retain the prototype's global listener unchanged.
5. Preserve the seven-layer window, DPR cap, Reduced path and two keyboard-reachable neighbour pods.
6. Keep `current session` and `run status` as separate state dimensions.

## Verification evidence

- Inline JavaScript syntax parsed successfully with Node.
- Chromium render checked at `1000 × 820` and a narrow `500 × 820` viewport.
- Sidebar measured `280px`; current layer contains 36 bays and exactly two keyboard-focusable neighbour pods.
- Session step: `01/07 @ 0°` → `02/07 @ -10°`; plaque settled to `WSL 环境检测确认`.
- Orbit regression: bay 01 changed from `rotateY(0deg) translateZ(88px)` to `rotateY(-10deg) translateZ(88px)`; all visible bays stayed free of vertical translation and counter-rotation.
- Circular axle/rotor, elliptical tick ring and dormant comb are absent from the rendered DOM.
- Workspace step: layer `000` → `001`; returning restored session `02/07 @ -10°`.
- Reduced mode set logical and displayed session indices together with no rotating class left behind.
- Rapid travel to layer 7 retained only layers `4–10`, with layer 7 present and current.
