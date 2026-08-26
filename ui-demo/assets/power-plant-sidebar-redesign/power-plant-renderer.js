  (() => {
    "use strict";
    window.__powerPlantBoot = { phase: "script-start", error: null };
    document.documentElement.dataset.ppBoot = "script-start";
    window.addEventListener("error", event => {
      window.__powerPlantBoot.error = {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      };
      document.documentElement.dataset.ppError = `${event.message} @ ${event.lineno}:${event.colno}`;
    });

    const TAU = Math.PI * 2;
    const SLOT_COUNT = 6;
    const SLOT_STEP = TAU / SLOT_COUNT;
    const LAYER_SPACING = 184;
    const CAMERA_DISTANCE = 620;
    const CAMERA_FOCAL = 560;
    const CAMERA_X = 47;
    const CAMERA_PITCH = 0.11;
    const POD_R0 = 58;
    const POD_R1 = 242;
    const POD_HEIGHT = 56;
    const POD_DEPTH = 25;

    const palette = {
      void: "#07100d",
      deepest: "#030806",
      steel: "#1b2823",
      steelLight: "#607a6e",
      steelDark: "#0b1411",
      seam: "#789183",
      green: "#45df78",
      greenHot: "#b8ffd0",
      greenDim: "#1f6b3c",
      red: "#c12a42",
      redHot: "#ff6670",
      redDark: "#590d1b",
      amber: "#e2a03a",
      danger: "#ea4a48",
      cyan: "#70c7c0",
      ink: "#020403"
    };

    const workspaces = [
      {
        code: "L-01",
        name: "侧边栏迁移舱",
        sessions: [
          { title: "Power Plant 重设计", state: "busy", label: "忙碌" },
          { title: "旋转空间验证", state: "done", label: "完成" },
          { title: "Electron 接入说明", state: "ready", label: "待命" },
          { title: "遮挡与透视复核", state: "error", label: "错误" },
          { title: "资产管线归档", state: "done", label: "完成" }
        ]
      },
      {
        code: "L-02",
        name: "ZION 视觉协议",
        sessions: [
          { title: "数字雨材质研究", state: "done", label: "完成" },
          { title: "生物机械链路", state: "busy", label: "忙碌" },
          { title: "状态编舞规范", state: "ready", label: "待命" }
        ]
      },
      {
        code: "L-03",
        name: "运行时与渲染",
        sessions: [
          { title: "Canvas 深度排序", state: "done", label: "完成" },
          { title: "高分屏采样控制", state: "ready", label: "待命" },
          { title: "快速输入收敛", state: "busy", label: "忙碌" },
          { title: "滚轮导航边界", state: "done", label: "完成" },
          { title: "降低动效路径", state: "ready", label: "待命" },
          { title: "控制台清洁度", state: "error", label: "错误" }
        ]
      },
      {
        code: "L-04",
        name: "迁移交付层",
        sessions: [
          { title: "原型验收记录", state: "done", label: "完成" },
          { title: "素材清单核对", state: "done", label: "完成" },
          { title: "业务状态映射", state: "ready", label: "待命" },
          { title: "已知限制归档", state: "busy", label: "忙碌" }
        ]
      }
    ].map((workspace, index) => ({
      ...workspace,
      index,
      angle: 0,
      targetAngle: 0,
      velocity: 0,
      activeIndex: 0,
      targetIndex: 0,
      motion: "locked",
      lockPulse: 0,
      lastIntent: 0
    }));

    const sidebar = document.getElementById("powerSidebar");
    const canvas = document.getElementById("plantCanvas");
    // Keep the Canvas on the normal compositor path. A desynchronized context
    // can expose a newer backing buffer than the frame Chromium/Electron
    // actually composites, which made screenshots and some embedded previews
    // show the tower background without the rotating assemblies.
    const ctx = canvas.getContext("2d", { alpha: false });
    const ui = {
      workspaceName: document.getElementById("workspaceName"),
      sessionCount: document.getElementById("sessionCount"),
      sessionName: document.getElementById("sessionName"),
      sessionState: document.getElementById("sessionState"),
      motionState: document.getElementById("motionState"),
      depthCode: document.getElementById("depthCode"),
      depthText: document.getElementById("depthText"),
      motionToggle: document.getElementById("motionToggle"),
      motionModeLabel: document.getElementById("motionModeLabel"),
      liveStatus: document.getElementById("liveStatus")
    };

    const textures = {};
    const textureSources = {
      metal: "./assets/power-plant-sidebar-redesign/bio-industrial-metal-256.png",
      fluid: "./assets/power-plant-sidebar-redesign/dark-red-fluid-256.png",
      condensation: "./assets/power-plant-sidebar-redesign/condensation-mask-256.png"
    };

    let width = 280;
    let height = 800;
    let dpr = 1;
    let lastTime = performance.now();
    let focusIndex = 0;
    let cameraLayer = 0;
    let cameraVelocity = 0;
    let hoverTarget = null;
    let hitTargets = [];
    let wheelLockUntil = 0;
    let manualReduced = null;
    let debugAssemblies = 0;
    const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");

    function isReduced() {
      return manualReduced === null ? reducedQuery.matches : manualReduced;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function wrap(index, length) {
      return ((index % length) + length) % length;
    }

    function normalizeAngle(angle) {
      let result = angle % TAU;
      if (result > Math.PI) result -= TAU;
      if (result < -Math.PI) result += TAU;
      return result;
    }

    function nearestEquivalentAngle(baseAngle, referenceAngle) {
      return baseAngle + Math.round((referenceAngle - baseAngle) / TAU) * TAU;
    }

    function shade(hex, factor, alpha = 1) {
      const raw = hex.replace("#", "");
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      return `rgba(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)}, ${alpha})`;
    }

    function worldPoint(theta, radial, tangent, vertical) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      return {
        x: c * radial - s * tangent,
        y: vertical,
        z: s * radial + c * tangent
      };
    }

    function project(point, layerY) {
      const scale = CAMERA_FOCAL / Math.max(220, CAMERA_DISTANCE + point.z);
      return {
        x: CAMERA_X + point.x * scale,
        // A shallow elevated view separates the near and far pods vertically
        // during hand-off. Every rigid part uses this projection, so joints,
        // rails, cables and shadows keep their mechanical connection.
        y: layerY - point.y * scale - point.z * CAMERA_PITCH * scale,
        z: point.z,
        scale
      };
    }

    function localPoint(theta, radial, tangent, vertical, layerY) {
      return project(worldPoint(theta, radial, tangent, vertical), layerY);
    }

    function path(points, close = true) {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      if (close) ctx.closePath();
    }

    function fillPolygon(points, fill, stroke, lineWidth = 1, patternName = null, patternAlpha = 0) {
      path(points);
      ctx.fillStyle = fill;
      ctx.fill();
      if (patternName && textures[patternName]) {
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const minX = Math.floor(Math.min(...xs)) - 2;
        const minY = Math.floor(Math.min(...ys)) - 2;
        const maxX = Math.ceil(Math.max(...xs)) + 2;
        const maxY = Math.ceil(Math.max(...ys)) + 2;
        ctx.save();
        path(points);
        ctx.clip();
        ctx.globalAlpha = patternAlpha;
        ctx.fillStyle = textures[patternName];
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();
      }
      if (stroke) {
        path(points);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    }

    function stroke3D(theta, coordinates, layerY, color, widthValue, alpha = 1) {
      const points = coordinates.map(([r, t, y]) => localPoint(theta, r, t, y, layerY));
      path(points, false);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.7, widthValue * points.reduce((sum, p) => sum + p.scale, 0) / points.length);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function stateColor(state) {
      if (state === "empty") return palette.steelDark;
      if (state === "busy") return palette.amber;
      if (state === "error") return palette.danger;
      if (state === "done") return palette.green;
      return palette.greenDim;
    }

    function drawDeepTower(time) {
      const background = ctx.createLinearGradient(0, 0, width, 0);
      background.addColorStop(0, palette.deepest);
      background.addColorStop(0.26, "#0c1713");
      background.addColorStop(0.56, "#06100d");
      background.addColorStop(1, "#020604");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const drift = ((cameraLayer * LAYER_SPACING) % 86 + 86) % 86;
      ctx.save();
      ctx.globalAlpha = 0.22;
      for (let x = 20; x < 112; x += 11) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = -90; y < height + 90; y += 28) {
          const bend = Math.sin((y + x * 3 + time * 0.015) * 0.02) * (x % 3 + 1);
          ctx.lineTo(x + bend, y + drift);
        }
        ctx.strokeStyle = x % 22 === 0 ? palette.seam : palette.steelLight;
        ctx.lineWidth = x % 22 === 0 ? 2.4 : 1;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.13;
      for (let level = -3; level < workspaces.length + 7; level += 1) {
        const y = height * 0.43 + (level - cameraLayer) * LAYER_SPACING;
        if (y < -100 || y > height + 100) continue;
        ctx.fillStyle = palette.redDark;
        for (let i = 0; i < 7; i += 1) {
          const px = 86 + i * 31 + ((level + i) % 2) * 8;
          ctx.fillRect(px, y - 3 + (i % 3) * 8, 14, 4);
        }
        ctx.strokeStyle = palette.steelLight;
        ctx.beginPath();
        ctx.moveTo(42, y + 62);
        ctx.lineTo(width, y + 62);
        ctx.stroke();
      }
      ctx.restore();

      const pit = ctx.createLinearGradient(0, height * 0.5, 0, height);
      pit.addColorStop(0, "rgba(0,0,0,0)");
      pit.addColorStop(1, "rgba(0,4,2,0.82)");
      ctx.fillStyle = pit;
      ctx.fillRect(0, height * 0.5, width, height * 0.5);
    }

    function drawWallSegment(theta, layerY, light, slotIndex) {
      const y0 = -31;
      const y1 = 31;
      const r0 = 11;
      const r1 = 55;
      const t0 = -25;
      const t1 = 25;
      const frontT = Math.cos(theta) >= 0 ? t0 : t1;
      const backT = -frontT;

      const side = [
        localPoint(theta, r0, frontT, y0, layerY),
        localPoint(theta, r1, frontT, y0, layerY),
        localPoint(theta, r1, frontT, y1, layerY),
        localPoint(theta, r0, frontT, y1, layerY)
      ];
      const top = [
        localPoint(theta, r0, backT, y1, layerY),
        localPoint(theta, r1, backT, y1, layerY),
        localPoint(theta, r1, frontT, y1, layerY),
        localPoint(theta, r0, frontT, y1, layerY)
      ];
      fillPolygon(top, shade(palette.steelLight, light * 0.66), shade(palette.ink, 1, 0.8), 1, "metal", 0.12);
      fillPolygon(side, shade(palette.steel, light), shade(palette.seam, light * 0.72, 0.75), 1, "metal", 0.24);

      for (let y = -22; y <= 22; y += 11) {
        stroke3D(theta, [[17, frontT - 0.2, y], [49, frontT - 0.2, y]], layerY, shade(palette.seam, light, 0.48), 0.8);
      }

      const marker = localPoint(theta, 35, frontT - 0.4, -4, layerY);
      if (marker.scale > 0.62 && Math.abs(Math.cos(theta)) > 0.33) {
        ctx.fillStyle = shade(palette.green, light, 0.54);
        ctx.font = `${Math.max(6, 7 * marker.scale)}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono")}`;
        ctx.textAlign = "center";
        ctx.fillText(String(slotIndex + 1).padStart(2, "0"), marker.x, marker.y);
      }
    }

    function drawConnector(theta, layerY, light, state) {
      const frontT = Math.cos(theta) >= 0 ? -12 : 12;
      const ringA = localPoint(theta, 55, frontT, 0, layerY);
      const ringB = localPoint(theta, 72, frontT, 0, layerY);
      const radiusA = Math.max(4, 13 * ringA.scale);
      const radiusB = Math.max(4, 12 * ringB.scale);

      const body = [
        localPoint(theta, 54, frontT, -12, layerY),
        localPoint(theta, 73, frontT, -11, layerY),
        localPoint(theta, 73, frontT, 11, layerY),
        localPoint(theta, 54, frontT, 12, layerY)
      ];
      fillPolygon(body, shade(palette.steelLight, light * 0.78), shade(palette.ink, 1, 0.9), 1, "metal", 0.18);

      ctx.save();
      ctx.strokeStyle = shade(palette.seam, light, 0.8);
      ctx.lineWidth = Math.max(1, ringA.scale * 1.4);
      ctx.beginPath();
      ctx.ellipse(ringA.x, ringA.y, radiusA * Math.max(0.16, Math.abs(Math.cos(theta))), radiusA, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(ringB.x, ringB.y, radiusB * Math.max(0.16, Math.abs(Math.cos(theta))), radiusB, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();

      const lamp = localPoint(theta, 64, frontT - 0.6, 16, layerY);
      ctx.fillStyle = stateColor(state);
      ctx.shadowColor = stateColor(state);
      ctx.shadowBlur = state === "ready" ? 2 : 7;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, Math.max(1.4, 2.2 * lamp.scale), 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawPod(theta, layerY, light, session, slotIndex, workspaceIndex) {
      const frontT = Math.cos(theta) >= 0 ? -POD_DEPTH / 2 : POD_DEPTH / 2;
      const backT = -frontT;
      const halfH = POD_HEIGHT / 2;
      const occupied = Boolean(session);

      const shadow = [
        localPoint(theta, POD_R0 + 8, backT + 7, -halfH - 6, layerY),
        localPoint(theta, POD_R1 - 4, backT + 7, -halfH - 5, layerY),
        localPoint(theta, POD_R1 - 4, frontT + 7, -halfH - 1, layerY),
        localPoint(theta, POD_R0 + 8, frontT + 7, -halfH - 2, layerY)
      ];
      fillPolygon(shadow, `rgba(0,0,0,${0.42 + (1 - light) * 0.25})`, null);

      const topFace = [
        localPoint(theta, POD_R0, backT, halfH, layerY),
        localPoint(theta, POD_R1 - 12, backT, halfH - 1, layerY),
        localPoint(theta, POD_R1, frontT, halfH - 5, layerY),
        localPoint(theta, POD_R0, frontT, halfH, layerY)
      ];
      fillPolygon(topFace, shade(palette.steelLight, light * 0.72), shade(palette.ink, 1, 0.92), 1, "metal", 0.16);

      const glass = [
        localPoint(theta, POD_R0 + 14, frontT - 0.1, -halfH + 7, layerY),
        localPoint(theta, POD_R1 - 22, frontT - 0.1, -halfH + 9, layerY),
        localPoint(theta, POD_R1 - 18, frontT - 0.1, halfH - 9, layerY),
        localPoint(theta, POD_R0 + 14, frontT - 0.1, halfH - 7, layerY)
      ];
      const glassGradient = ctx.createLinearGradient(glass[0].x, glass[0].y, glass[2].x, glass[2].y);
      if (occupied) {
        glassGradient.addColorStop(0, shade(palette.redDark, Math.max(0.82, light * 0.92)));
        glassGradient.addColorStop(0.38, shade(palette.red, Math.max(0.88, light * 1.14)));
        glassGradient.addColorStop(0.72, shade(palette.redHot, Math.max(0.48, light * 0.72)));
        glassGradient.addColorStop(1, shade(palette.redDark, Math.max(0.7, light * 0.82)));
      } else {
        glassGradient.addColorStop(0, shade(palette.deepest, 0.9));
        glassGradient.addColorStop(0.48, shade(palette.steelDark, Math.max(0.52, light * 0.64)));
        glassGradient.addColorStop(1, shade(palette.deepest, 0.72));
      }
      fillPolygon(glass, glassGradient, shade(palette.redHot, Math.max(0.68, light * 0.88), occupied ? 0.72 : 0.24), 1.15, occupied ? "fluid" : null, occupied ? 0.2 : 0);

      if (occupied) {
        const sheen = [
          localPoint(theta, POD_R0 + 22, frontT - 0.3, halfH - 12, layerY),
          localPoint(theta, POD_R1 - 36, frontT - 0.3, halfH - 14, layerY)
        ];
        stroke3D(theta, [[POD_R0 + 22, frontT - 0.3, halfH - 12], [POD_R1 - 36, frontT - 0.3, halfH - 14]], layerY, shade(palette.redHot, Math.max(0.7, light), 0.46), 1.1);
      }

      if (occupied && Math.abs(Math.cos(theta)) > 0.18) {
        const bodyShade = shade(palette.ink, 1, clamp(0.45 + light * 0.24, 0.45, 0.72));
        const head = localPoint(theta, POD_R1 - 55, frontT - 0.7, 5, layerY);
        ctx.fillStyle = bodyShade;
        ctx.beginPath();
        ctx.ellipse(head.x, head.y, Math.max(2, 7 * head.scale * Math.max(0.34, Math.abs(Math.cos(theta)))), Math.max(2.8, 7 * head.scale), 0, 0, TAU);
        ctx.fill();

        const torso = [
          localPoint(theta, POD_R1 - 65, frontT - 0.7, 9, layerY),
          localPoint(theta, POD_R1 - 118, frontT - 0.7, 13, layerY),
          localPoint(theta, POD_R1 - 137, frontT - 0.7, 2, layerY),
          localPoint(theta, POD_R1 - 112, frontT - 0.7, -8, layerY),
          localPoint(theta, POD_R1 - 68, frontT - 0.7, -5, layerY)
        ];
        fillPolygon(torso, bodyShade, null);
        stroke3D(theta, [[POD_R1 - 126, frontT - 0.7, -2], [POD_R1 - 165, frontT - 0.7, -12]], layerY, bodyShade, 5.2);
        stroke3D(theta, [[POD_R1 - 126, frontT - 0.7, 0], [POD_R1 - 166, frontT - 0.7, 10]], layerY, bodyShade, 4.2);
        stroke3D(theta, [[POD_R1 - 93, frontT - 0.8, 9], [POD_R1 - 123, frontT - 0.8, 19]], layerY, bodyShade, 2.6);
        stroke3D(theta, [[POD_R1 - 92, frontT - 0.8, 5], [POD_R1 - 118, frontT - 0.8, -17]], layerY, bodyShade, 2.6);

        stroke3D(theta, [[POD_R1 - 52, frontT - 0.9, 12], [POD_R1 - 29, frontT - 0.9, 18]], layerY, shade(palette.cyan, light, 0.25), 0.9);
        stroke3D(theta, [[POD_R1 - 75, frontT - 0.9, -5], [POD_R0 + 20, frontT - 0.9, -16]], layerY, shade(palette.redHot, light, 0.34), 0.8);
      }

      if (textures.condensation && occupied) {
        const glassXs = glass.map(point => point.x);
        const glassYs = glass.map(point => point.y);
        ctx.save();
        path(glass);
        ctx.clip();
        ctx.globalAlpha = 0.17 * light;
        ctx.fillStyle = textures.condensation;
        ctx.fillRect(
          Math.min(...glassXs),
          Math.min(...glassYs),
          Math.max(...glassXs) - Math.min(...glassXs),
          Math.max(...glassYs) - Math.min(...glassYs)
        );
        ctx.restore();
      }

      const railColor = shade(palette.steelLight, light * 1.08, 0.96);
      stroke3D(theta, [[POD_R0, frontT, halfH], [POD_R1 - 10, frontT, halfH - 5]], layerY, shade(palette.ink, 1, 0.94), 5.2);
      stroke3D(theta, [[POD_R0, frontT, halfH], [POD_R1 - 10, frontT, halfH - 5]], layerY, railColor, 2.2);
      stroke3D(theta, [[POD_R0, frontT, -halfH], [POD_R1 - 10, frontT, -halfH + 5]], layerY, shade(palette.ink, 1, 0.94), 5.2);
      stroke3D(theta, [[POD_R0, frontT, -halfH], [POD_R1 - 10, frontT, -halfH + 5]], layerY, railColor, 2.2);

      const nose = localPoint(theta, POD_R1 - 4, frontT, 0, layerY);
      const noseWidth = Math.max(2.4, 12 * nose.scale * Math.max(0.18, Math.abs(Math.cos(theta))));
      ctx.fillStyle = shade(palette.steelLight, light * 0.82);
      ctx.strokeStyle = shade(palette.ink, 1, 0.94);
      ctx.lineWidth = Math.max(1, nose.scale * 1.4);
      ctx.beginPath();
      ctx.ellipse(nose.x, nose.y, noseWidth, halfH * 0.82 * nose.scale, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      for (const r of [POD_R0 + 8, POD_R0 + 16]) {
        stroke3D(theta, [[r, frontT, -halfH + 4], [r, frontT, halfH - 4]], layerY, shade(palette.seam, light, 0.72), 1.1);
      }

      const outerPoints = [
        localPoint(theta, POD_R0 - 1, frontT, -halfH - 2, layerY),
        localPoint(theta, POD_R1 + 5, frontT, -halfH - 2, layerY),
        localPoint(theta, POD_R1 + 5, frontT, halfH + 2, layerY),
        localPoint(theta, POD_R0 - 1, frontT, halfH + 2, layerY)
      ];
      if (workspaceIndex === focusIndex && occupied && Math.abs(normalizeAngle(theta)) < 1.34) {
        const xs = outerPoints.map(p => p.x);
        const ys = outerPoints.map(p => p.y);
        hitTargets.push({
          workspaceIndex,
          sessionIndex: slotIndex,
          angle: normalizeAngle(theta),
          x0: Math.min(...xs) - 5,
          x1: Math.max(...xs) + 5,
          y0: Math.min(...ys) - 5,
          y1: Math.max(...ys) + 5
        });
      }

      if (hoverTarget && hoverTarget.workspaceIndex === workspaceIndex && hoverTarget.sessionIndex === slotIndex) {
        path(outerPoints);
        ctx.strokeStyle = shade(palette.greenHot, 1, 0.82);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function drawAssembly(workspace, slotIndex, theta, layerY, workspaceIndex) {
      debugAssemblies += 1;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const depth = s * 170;
      const facing = clamp((c + 0.34) / 1.34, 0.08, 1);
      const nearBoost = clamp(1 - depth / 760, 0.72, 1.2);
      const light = clamp((0.23 + facing * 0.77) * nearBoost, 0.17, 1.08);
      const session = slotIndex < workspace.sessions.length ? workspace.sessions[slotIndex] : null;

      drawWallSegment(theta, layerY, light, slotIndex);
      stroke3D(theta, [[29, -17, 25], [44, -14, 20], [60, -11, 18], [82, -9, 20]], layerY, shade(palette.steelLight, light * 0.8), 2.3, 0.84);
      stroke3D(theta, [[24, 16, -23], [43, 15, -20], [57, 13, -17], [76, 11, -20]], layerY, shade(palette.ink, 1, 0.88), 4.8);
      stroke3D(theta, [[24, 16, -23], [43, 15, -20], [57, 13, -17], [76, 11, -20]], layerY, shade(palette.steelLight, light * 0.58), 1.7);
      drawConnector(theta, layerY, light, session ? session.state : "empty");
      drawPod(theta, layerY, light, session, slotIndex, workspaceIndex);
    }

    function drawWorkspace(workspace, layerY, workspaceIndex, time) {
      const distance = Math.abs(workspaceIndex - cameraLayer);
      const layerAlpha = clamp(1 - distance * 0.17, 0.18, 1);
      ctx.save();
      ctx.globalAlpha = layerAlpha;

      const assemblies = [];
      for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
        const theta = normalizeAngle(workspace.angle + slotIndex * SLOT_STEP);
        if (Math.abs(theta) > Math.PI * 0.44) continue;
        const center = worldPoint(theta, (POD_R0 + POD_R1) / 2, 0, 0);
        assemblies.push({ slotIndex, theta, depth: center.z });
      }
      // The observation slit is centered on theta=0. Edge assemblies belong
      // behind the selected front assembly, so paint them first. Sorting by
      // raw Z made a tip-on neighbour cover the selected pod at rest.
      assemblies.sort((a, b) => Math.abs(b.theta) - Math.abs(a.theta));

      const lockGlow = workspace.lockPulse * (0.55 + Math.sin(time * 0.03) * 0.18);
      if (lockGlow > 0.02) {
        const glow = ctx.createRadialGradient(88, layerY, 3, 88, layerY, 106);
        glow.addColorStop(0, `rgba(69,223,120,${lockGlow * 0.18})`);
        glow.addColorStop(1, "rgba(69,223,120,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, layerY - 80, width, 160);
      }

      if (workspaceIndex === focusIndex) {
        const activeGlow = ctx.createRadialGradient(182, layerY, 18, 182, layerY, 150);
        activeGlow.addColorStop(0, "rgba(193,42,66,0.16)");
        activeGlow.addColorStop(0.55, "rgba(89,13,27,0.07)");
        activeGlow.addColorStop(1, "rgba(89,13,27,0)");
        ctx.fillStyle = activeGlow;
        ctx.fillRect(42, layerY - 82, width - 42, 164);
      }

      for (const assembly of assemblies) {
        drawAssembly(workspace, assembly.slotIndex, assembly.theta, layerY, workspaceIndex);
      }

      ctx.restore();
    }

    function drawFixedShaftAndMasks(time) {
      ctx.save();
      const shaft = ctx.createLinearGradient(0, 0, 48, 0);
      shaft.addColorStop(0, "#020604");
      shaft.addColorStop(0.52, "#15231d");
      shaft.addColorStop(0.82, "#263a31");
      shaft.addColorStop(1, "#07100d");
      ctx.fillStyle = shaft;
      ctx.fillRect(0, 0, 43, height);
      if (textures.metal) {
        ctx.globalAlpha = 0.26;
        ctx.fillStyle = textures.metal;
        ctx.fillRect(0, 0, 43, height);
        ctx.globalAlpha = 1;
      }

      for (let x = 8; x <= 35; x += 9) {
        ctx.strokeStyle = x === 26 ? palette.steelLight : palette.steel;
        ctx.lineWidth = x === 26 ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x - 4, height * 0.3, x + 5, height * 0.7, x, height);
        ctx.stroke();
      }

      for (let index = -2; index < workspaces.length + 3; index += 1) {
        const y = height * 0.43 + (index - cameraLayer) * LAYER_SPACING;
        if (y < -100 || y > height + 100) continue;

        ctx.fillStyle = "rgba(0,0,0,0.66)";
        ctx.fillRect(39, y - 50, 16, 100);
        const lip = ctx.createLinearGradient(34, y, 92, y);
        lip.addColorStop(0, "#24362e");
        lip.addColorStop(0.35, "#101b17");
        lip.addColorStop(1, "rgba(3,8,6,0)");
        ctx.fillStyle = lip;
        ctx.fillRect(34, y - 46, 62, 9);
        ctx.fillRect(34, y + 37, 62, 9);

        ctx.strokeStyle = "rgba(120,145,131,0.42)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(48, y, 31, -Math.PI * 0.48, Math.PI * 0.48);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(48, y, 36, -Math.PI * 0.34, Math.PI * 0.34);
        ctx.stroke();

        for (let tooth = -28; tooth <= 28; tooth += 8) {
          ctx.fillStyle = tooth % 16 === 0 ? palette.steelLight : palette.steel;
          ctx.fillRect(42, y + tooth, 9, 2);
        }

        if (index >= 0 && index < workspaces.length) {
          const workspace = workspaces[index];
          const focused = index === focusIndex;
          ctx.font = `${focused ? 9 : 8}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono")}`;
          ctx.textAlign = "left";
          ctx.fillStyle = focused ? palette.greenHot : "rgba(120,145,131,0.58)";
          ctx.fillText(workspace.code, 7, y - 55);
          ctx.strokeStyle = focused ? "rgba(69,223,120,0.52)" : "rgba(120,145,131,0.2)";
          ctx.beginPath();
          ctx.moveTo(39, y - 55);
          ctx.lineTo(focused ? 76 : 58, y - 55);
          ctx.stroke();
        }
      }

      const fixedShadow = ctx.createLinearGradient(41, 0, 88, 0);
      fixedShadow.addColorStop(0, "rgba(0,0,0,0.74)");
      fixedShadow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fixedShadow;
      ctx.fillRect(41, 0, 48, height);

      ctx.restore();
    }

    function drawAtmosphere(time) {
      ctx.save();
      const pulse = 0.5 + Math.sin(time * 0.0007) * 0.5;
      for (let i = 0; i < 22; i += 1) {
        const seed = i * 97.31;
        const x = 60 + ((seed * 1.83) % 210);
        const y = ((seed * 3.17 + time * (0.006 + (i % 4) * 0.002)) % (height + 80)) - 40;
        const radius = i % 5 === 0 ? 1.4 : 0.7;
        ctx.fillStyle = i % 7 === 0 ? `rgba(226,61,80,${0.06 + pulse * 0.05})` : "rgba(69,223,120,0.055)";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    function resize() {
      const rect = sidebar.getBoundingClientRect();
      width = 280;
      height = Math.max(560, Math.round(rect.height));
      dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const [name, image] of Object.entries(textureImages)) {
        if (image.complete && image.naturalWidth) textures[name] = ctx.createPattern(image, "repeat");
      }
    }

    function updatePhysics(dt) {
      const reduced = isReduced();
      const cameraDiff = focusIndex - cameraLayer;
      if (reduced) {
        cameraLayer = focusIndex;
        cameraVelocity = 0;
      } else {
        cameraVelocity += cameraDiff * 30 * dt;
        cameraVelocity *= Math.exp(-9 * dt);
        cameraLayer += cameraVelocity * dt;
      }

      for (const workspace of workspaces) {
        if (reduced) {
          workspace.angle = workspace.targetAngle;
          workspace.velocity = 0;
          if (workspace.motion !== "locked") settleWorkspace(workspace);
        } else {
          const diff = workspace.targetAngle - workspace.angle;
          workspace.velocity += diff * 45 * dt;
          workspace.velocity *= Math.exp(-9.4 * dt);
          workspace.angle += workspace.velocity * dt;
          if (workspace.motion !== "locked" && Math.abs(diff) < 0.0022 && Math.abs(workspace.velocity) < 0.008) {
            workspace.angle = workspace.targetAngle;
            workspace.velocity = 0;
            settleWorkspace(workspace);
          }
        }
        workspace.lockPulse = Math.max(0, workspace.lockPulse - dt * 1.9);
      }
    }

    function settleWorkspace(workspace) {
      workspace.activeIndex = workspace.targetIndex;
      workspace.motion = "locked";
      workspace.lockPulse = 1;
      if (workspace.index === focusIndex) {
        const session = workspace.sessions[workspace.activeIndex];
        ui.liveStatus.textContent = `${workspace.name} 已锁定会话：${session.title}，状态${session.label}`;
      }
      updateReadout();
    }

    function render(time) {
      const renderStart = performance.now();
      debugAssemblies = 0;
      hitTargets = [];
      drawDeepTower(time);

      for (let index = 0; index < workspaces.length; index += 1) {
        const layerY = height * 0.43 + (index - cameraLayer) * LAYER_SPACING;
        if (layerY < -110 || layerY > height + 110) continue;
        drawWorkspace(workspaces[index], layerY, index, time);
      }

      drawFixedShaftAndMasks(time);
      if (!isReduced()) drawAtmosphere(time);
      document.documentElement.dataset.ppAssemblies = String(debugAssemblies);
      document.documentElement.dataset.ppHits = String(hitTargets.length);
      document.documentElement.dataset.ppBoxes = hitTargets.map(target =>
        `${target.sessionIndex}:${Math.round(target.x0)},${Math.round(target.y0)},${Math.round(target.x1)},${Math.round(target.y1)}`
      ).join("|");
      document.documentElement.dataset.ppFrameMs = (performance.now() - renderStart).toFixed(1);
      document.documentElement.dataset.ppState = workspaces.map(workspace =>
        `${workspace.index}:${workspace.activeIndex}:${workspace.targetIndex}:${workspace.motion}`
      ).join("|");
    }

    function frame(time) {
      const dt = Math.min(0.032, Math.max(0.001, (time - lastTime) / 1000));
      lastTime = time;
      updatePhysics(dt);
      render(time);
      requestAnimationFrame(frame);
    }

    function updateReadout() {
      const workspace = workspaces[focusIndex];
      const session = workspace.sessions[workspace.targetIndex];
      ui.workspaceName.textContent = `${workspace.code} · ${workspace.name}`;
      ui.sessionCount.textContent = `${String(workspace.targetIndex + 1).padStart(2, "0")} / ${String(workspace.sessions.length).padStart(2, "0")}`;
      ui.sessionName.textContent = session.title;
      ui.sessionState.textContent = session.label;
      ui.sessionState.dataset.state = session.state;
      ui.motionState.textContent = workspace.motion === "locked" ? "机械锁止" : "项目转环旋转中";
      ui.depthCode.textContent = workspace.code;
      ui.depthText.textContent = `下潜 ${String(focusIndex * 128).padStart(3, "0")}m`;
      ui.motionToggle.setAttribute("aria-pressed", String(isReduced()));
      ui.motionModeLabel.textContent = isReduced() ? "精简" : "完整";
    }

    function changeSession(delta) {
      const workspace = workspaces[focusIndex];
      const nextIndex = wrap(workspace.targetIndex + delta, workspace.sessions.length);
      workspace.targetIndex = nextIndex;
      workspace.targetAngle = nearestEquivalentAngle(-nextIndex * SLOT_STEP, workspace.targetAngle);
      workspace.motion = "rotating";
      workspace.lastIntent = performance.now();
      updateReadout();
    }

    function selectSession(sessionIndex) {
      const workspace = workspaces[focusIndex];
      if (sessionIndex === workspace.targetIndex) return;
      workspace.targetIndex = sessionIndex;
      workspace.targetAngle = nearestEquivalentAngle(-sessionIndex * SLOT_STEP, workspace.targetAngle);
      workspace.motion = "rotating";
      workspace.lastIntent = performance.now();
      updateReadout();
    }

    function changeWorkspace(delta) {
      const next = clamp(focusIndex + delta, 0, workspaces.length - 1);
      if (next === focusIndex) return;
      focusIndex = next;
      hoverTarget = null;
      updateReadout();
      ui.liveStatus.textContent = `观察位置移动到 ${workspaces[focusIndex].name}`;
    }

    function pointerTarget(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const matches = hitTargets
        .filter(target => x >= target.x0 && x <= target.x1 && y >= target.y0 && y <= target.y1)
        .sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle));
      return matches[0] || null;
    }

    sidebar.addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "a" || event.key === "ArrowLeft") {
        event.preventDefault();
        changeSession(-1);
      } else if (key === "d" || event.key === "ArrowRight") {
        event.preventDefault();
        changeSession(1);
      } else if (key === "w" || event.key === "ArrowUp") {
        event.preventDefault();
        changeWorkspace(-1);
      } else if (key === "s" || event.key === "ArrowDown") {
        event.preventDefault();
        changeWorkspace(1);
      }
    });

    sidebar.addEventListener("wheel", event => {
      event.preventDefault();
      const now = performance.now();
      if (now < wheelLockUntil || Math.abs(event.deltaY) < 8) return;
      wheelLockUntil = now + 240;
      changeWorkspace(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    canvas.addEventListener("pointermove", event => {
      hoverTarget = pointerTarget(event);
      canvas.style.cursor = hoverTarget ? "pointer" : "default";
    });

    canvas.addEventListener("pointerleave", () => {
      hoverTarget = null;
      canvas.style.cursor = "default";
    });

    canvas.addEventListener("click", event => {
      const target = pointerTarget(event);
      if (target) selectSession(target.sessionIndex);
      sidebar.focus({ preventScroll: true });
    });

    document.getElementById("previousWorkspace").addEventListener("click", () => changeWorkspace(-1));
    document.getElementById("nextWorkspace").addEventListener("click", () => changeWorkspace(1));
    document.getElementById("previousSession").addEventListener("click", () => changeSession(-1));
    document.getElementById("nextSession").addEventListener("click", () => changeSession(1));
    ui.motionToggle.addEventListener("click", () => {
      manualReduced = !isReduced();
      updateReadout();
    });

    reducedQuery.addEventListener?.("change", () => {
      if (manualReduced === null) updateReadout();
    });

    const textureImages = {};
    for (const [name, source] of Object.entries(textureSources)) {
      const image = new Image();
      textureImages[name] = image;
      image.addEventListener("load", () => {
        textures[name] = ctx.createPattern(image, "repeat");
      });
      image.src = source;
    }

    new ResizeObserver(resize).observe(sidebar);
    window.__powerPlantBoot.phase = "renderer-ready";
    document.documentElement.dataset.ppBoot = "renderer-ready";
    resize();
    updateReadout();
    window.__powerPlantDebug = {
      get state() {
        return {
          focusIndex,
          cameraLayer,
          debugAssemblies,
          hitTargets: hitTargets.map(target => ({ ...target })),
          workspaces: workspaces.map(workspace => ({
            angle: workspace.angle,
            targetAngle: workspace.targetAngle,
            activeIndex: workspace.activeIndex,
            targetIndex: workspace.targetIndex,
            motion: workspace.motion
          }))
        };
      }
    };
    requestAnimationFrame(frame);
  })();
