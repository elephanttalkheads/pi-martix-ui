# ZION Neural Cable — Implementation Decisions

This note records the production decisions that intentionally override or narrow the OpenDesign handoff.

## Anchors

- Neo source anchor: `(82, 114)` in the 256×256 Neo frame, normalized to `(0.3203125, 0.4453125)`.
- Pod receiver anchor: `(159, 556)` in both 1672×941 horizontal pod frames, normalized to `(0.0950956938, 0.5908607864)`.
- The pod anchor intentionally targets the far-left mechanical pillar from the earlier v2 asset review instead of the handoff's default receiver point.
- `deleteArmed` changes the visible pod frame and therefore which image element supplies the measured rectangle, but both frames share the same normalized receiver anchor.

## Identity and capacity

- The six cable variants are six stable neural signatures, not six session slots.
- A stable hash of `session.id` selects signature `01`–`06`.
- Session count remains unlimited. The cable layer renders at most the three sessions currently visible in the deck.

## State and timing

- State priority: `active > hover/focus > dormant > hidden`.
- Dormant cables are completely static. Hover/focus only brightens a dormant cable; it does not start a pulse.
- Only the active session runs a five-phase handshake: a short pulse — a glowing warhead dot followed by a 5-glyph tail — travels from Neo to the pod at approximately `560 px/s` while the static glyph stream yields; once the pulse tail reaches the pod, the return stream grows — tail anchored at the pod, head stretching toward Neo at approximately `140 px/s` until it spans the cable; it then holds for `1 s` with both ends anchored — glyph positions fixed, content mutating out of phase per slot, and a continuous brightness wave sweeping from the pod to Neo exactly once per hold; then it shrinks — head anchored at Neo, tail chasing Neo at approximately `240 px/s` until its length reaches zero; finally the cable rests for `0.6 s`. The two directions never share the cable at the same time. The return glyph pool is sized dynamically to `ceil(pathLength / 8) + 2`. The SVG path and dormant glyph layout remain defined from Neo to pod.
- When deck scrolling changes the visible set, outgoing cables fade for `90 ms`, identities and paths swap, then incoming cables fade for `90 ms`. The DOM never contains a fourth cable during the transition.
- If the current session is outside the visible three slots, no offscreen cable or automatic scrolling is added.

## Terminals and semantics

- The Neo terminal is a subtle visible jack, approximately `18×14 px`.
- The pod terminal is only a tiny `8×10 px` receiver highlight behind the pod art.
- The cable system is a redundant topology/status visualization. Session names, status text, `aria-current`, and existing controls remain the authoritative interface.
- The responsive cable layer is a Sidebar-local SVG and remains separate from `SignalCanvas`, whose responsibility is the one-shot mouth-to-file-tree write signal.
