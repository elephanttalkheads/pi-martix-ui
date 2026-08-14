import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { SessionInfoLike } from '../../../shared/protocol';
import bundleRing from '../assets/neural-cable-system/neural-bundle-ring.svg';
import podReceiver from '../assets/neural-cable-system/pod-neural-receiver.svg';
import {
  imageAnchor,
  neuralSignatureForSession,
  POD_RECEIVER_ANCHOR,
  routeNeuralCable,
  stableSessionHash,
  type NeuralSignature,
  type PodCableTarget,
  type Point,
} from '../neuralCable';

const MAX_VISIBLE_CABLES = 3;
const TRANSITION_MS = 90;
const PULSE_SPEED_PX_PER_SECOND = 320;
const RETURN_GROW_SPEED_PX_PER_SECOND = 140;
const RETURN_SHRINK_SPEED_PX_PER_SECOND = 240;
const RETURN_FLOW_PX_PER_SECOND = 90;
const RETURN_HOLD_MS = 1000;
const PULSE_REST_MS = 600;
const PULSE_STEP = 8;
const PULSE_TAIL_LENGTH = 4;
const DEFAULT_STREAM_POOL = 64;

type CableGeometry = {
  sessionId: string;
  signature: NeuralSignature;
  lane: number;
  path: string;
  source: Point;
  target: Point;
};

type LayerPhase = 'entering' | 'stable' | 'leaving';

type LayerLayout = {
  width: number;
  height: number;
  cables: CableGeometry[];
  phase: LayerPhase;
};

type NeuralCableLayerProps = {
  sidebarRef: RefObject<HTMLElement | null>;
  deckRef: RefObject<HTMLDivElement | null>;
  sourceRef: RefObject<HTMLSpanElement | null>;
  targetsRef: MutableRefObject<Map<string, PodCableTarget>>;
  targetVersion: number;
  sessions: SessionInfoLike[];
  currentSessionId: string | null;
  hoveredSessionId: string | null;
  openSessionId: string | null;
};

const EMPTY_LAYOUT: LayerLayout = { width: 0, height: 0, cables: [], phase: 'stable' };

function sameCableIds(left: LayerLayout, right: LayerLayout): boolean {
  return left.cables.length === right.cables.length
    && left.cables.every((cable, index) => cable.sessionId === right.cables[index]?.sessionId);
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

function NeuralCable({
  cable,
  pathId,
  state,
  reducedMotion,
}: {
  cable: CableGeometry;
  pathId: string;
  state: 'active' | 'hover' | 'dormant';
  reducedMotion: boolean;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const ringRefs = useRef<Array<SVGImageElement | null>>([]);
  const pulseRefs = useRef<Array<SVGTextElement | null>>([]);
  const staticRef = useRef<SVGTextElement | null>(null);
  const [poolSize, setPoolSize] = useState(DEFAULT_STREAM_POOL);
  const { signature } = cable;

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    // 回传流需要铺满整条缆线，字符池按路径长度分配（+2 兜底取整误差）。
    setPoolSize(Math.ceil(length / PULSE_STEP) + 2);
    signature.ringFractions.forEach((fraction, index) => {
      const ring = ringRefs.current[index];
      if (!ring) return;
      const point = path.getPointAtLength(length * fraction);
      ring.setAttribute('x', String(point.x - 4));
      ring.setAttribute('y', String(point.y - 4));
    });
  }, [cable.path, signature]);

  useEffect(() => {
    const path = pathRef.current;
    const chars = pulseRefs.current;
    const staticText = staticRef.current;
    if (!path || state !== 'active' || reducedMotion) {
      chars.forEach((char) => char?.setAttribute('visibility', 'hidden'));
      staticText?.removeAttribute('visibility');
      return;
    }

    // active 链路进入握手循环，静态字符流全程让位。
    staticText?.setAttribute('visibility', 'hidden');

    const length = path.getTotalLength();
    const pulseSpan = (PULSE_TAIL_LENGTH - 1) * PULSE_STEP;
    const outboundMs = ((length + pulseSpan) / PULSE_SPEED_PX_PER_SECOND) * 1000;
    const growMs = (length / RETURN_GROW_SPEED_PX_PER_SECOND) * 1000;
    const shrinkMs = (length / RETURN_SHRINK_SPEED_PX_PER_SECOND) * 1000;
    const cycleMs = outboundMs + growMs + RETURN_HOLD_MS + shrinkMs + PULSE_REST_MS;
    const startedAt = performance.now();
    let animationFrame = 0;

    const hideAll = () => chars.forEach((char) => char?.setAttribute('visibility', 'hidden'));

    const animate = (now: number) => {
      const cycleTime = (now - startedAt) % cycleMs;
      const mutationStep = Math.floor(now / 120);

      // 五段状态机：脉冲出站 → 回传生长 → 维持传输 → 回传收缩 → 休止。
      // SVG path 按 Neo → 仓体定义；slot 0 恒为「亮端」
      //（脉冲相 = 冲向仓体的头部，回传相 = 靠 Neo 端）。
      let anchor = 0;
      let stepSign = 1;
      let tailLimit = length;
      let flowStep = 0;
      let rest = false;

      if (cycleTime < outboundMs) {
        // 脉冲：短促的 4 字符包，Neo → 仓体。
        anchor = cycleTime * PULSE_SPEED_PX_PER_SECOND / 1000;
        stepSign = -1;
      } else if (cycleTime < outboundMs + growMs) {
        // 回传生长：头部伸向 Neo，尾部锚定仓体，长度渐增。
        anchor = length - (cycleTime - outboundMs) * RETURN_GROW_SPEED_PX_PER_SECOND / 1000;
      } else if (cycleTime < outboundMs + growMs + RETURN_HOLD_MS) {
        // 维持传输：两端锚定铺满全缆，内容持续向 Neo 滚动。
        anchor = 0;
        flowStep = Math.floor(
          (cycleTime - outboundMs - growMs) * RETURN_FLOW_PX_PER_SECOND / 1000 / PULSE_STEP,
        );
      } else if (cycleTime < outboundMs + growMs + RETURN_HOLD_MS + shrinkMs) {
        // 回传收缩：头部锚定 Neo，尾部脱离仓体追向 Neo，长度减至 0。
        anchor = 0;
        tailLimit = length
          - (cycleTime - outboundMs - growMs - RETURN_HOLD_MS) * RETURN_SHRINK_SPEED_PX_PER_SECOND / 1000;
      } else {
        // 休止：链路只剩 bed/nerve/ring，无任何字符。
        rest = true;
      }

      chars.forEach((char, index) => {
        if (!char) return;
        const distance = anchor + index * stepSign * PULSE_STEP;
        if (rest || distance < 0 || distance > tailLimit || distance > length) {
          char.setAttribute('visibility', 'hidden');
          return;
        }

        const point = path.getPointAtLength(distance);
        const before = path.getPointAtLength(Math.max(0, distance - 1));
        const after = path.getPointAtLength(Math.min(length, distance + 1));
        const angle = Math.atan2(after.y - before.y, after.x - before.x);
        const jitter = Math.sin(now * 0.011 + index * 1.7 + signature.id) * 1.5;
        const x = point.x - Math.sin(angle) * jitter;
        const y = point.y + Math.cos(angle) * jitter;
        const flowBase = index + flowStep;
        const glyphIndex = (flowBase + signature.staticOffset
          + ((flowBase + mutationStep + signature.id) % 3 === 0 ? mutationStep : 0)) % signature.glyphs.length;

        char.textContent = signature.glyphs[glyphIndex];
        char.setAttribute('x', x.toFixed(2));
        char.setAttribute('y', y.toFixed(2));
        char.setAttribute('transform', `rotate(${(angle * 180 / Math.PI).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`);
        char.setAttribute('fill-opacity', Math.max(0.18, 1 - index / 18).toFixed(2));
        char.setAttribute('visibility', 'visible');
      });
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrame);
      hideAll();
    };
  }, [cable.path, reducedMotion, signature, state]);

  const staticGlyphs = `${signature.glyphs} ${signature.glyphs}`;

  return (
    <g
      className={`neural-cable neural-cable-${state}`}
      data-session-id={cable.sessionId}
      data-signature={`cable-${String(signature.id).padStart(2, '0')}`}
    >
      <path className="neural-cable-bed" d={cable.path} vectorEffect="non-scaling-stroke" />
      <path
        ref={pathRef}
        id={pathId}
        className="neural-cable-nerve"
        d={cable.path}
        vectorEffect="non-scaling-stroke"
      />
      <text ref={staticRef} className="neural-cable-static" dy="3.5">
        <textPath href={`#${pathId}`} startOffset={signature.staticOffset}>
          {staticGlyphs}
        </textPath>
      </text>
      {signature.ringFractions.map((fraction, index) => (
        <image
          // fraction is stable inside each signature and therefore a safe key.
          key={fraction}
          ref={(node) => { ringRefs.current[index] = node; }}
          className="neural-cable-ring"
          href={bundleRing}
          width="8"
          height="8"
          aria-hidden="true"
        />
      ))}
      <image
        className="neural-cable-receiver"
        href={podReceiver}
        x={cable.target.x - 4}
        y={cable.target.y - 5}
        width="8"
        height="10"
        aria-hidden="true"
      />
      <g className="neural-cable-pulse" aria-hidden="true">
        {Array.from({ length: Math.max(poolSize, PULSE_TAIL_LENGTH) }, (_, index) => (
          <text
            key={index}
            ref={(node) => { pulseRefs.current[index] = node; }}
            className={index === 0 ? 'neural-cable-pulse-head' : 'neural-cable-pulse-tail'}
            visibility="hidden"
          />
        ))}
      </g>
    </g>
  );
}

export default function NeuralCableLayer({
  sidebarRef,
  deckRef,
  sourceRef,
  targetsRef,
  targetVersion,
  sessions,
  currentSessionId,
  hoveredSessionId,
  openSessionId,
}: NeuralCableLayerProps) {
  const [layout, setLayout] = useState<LayerLayout>(EMPTY_LAYOUT);
  const renderedRef = useRef<LayerLayout>(EMPTY_LAYOUT);
  const pendingRef = useRef<LayerLayout | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseFrameRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const transitioningRef = useRef(false);
  const mountedRef = useRef(true);
  const applyMeasuredRef = useRef<(next: LayerLayout) => void>(() => {});
  const idPrefix = useId().replace(/[^a-z0-9_-]/gi, '');
  const reducedMotion = useReducedMotion();

  const commitLayout = useCallback((next: LayerLayout) => {
    if (!mountedRef.current) return;
    renderedRef.current = next;
    setLayout(next);
  }, []);

  const applyMeasured = useCallback((next: LayerLayout) => {
    const previous = renderedRef.current;
    if (transitioningRef.current) {
      pendingRef.current = next;
      return;
    }

    if (sameCableIds(previous, next)) {
      commitLayout({ ...next, phase: previous.phase === 'leaving' ? 'leaving' : 'stable' });
      return;
    }

    if (previous.cables.length === 0) {
      commitLayout({ ...next, phase: next.cables.length ? 'entering' : 'stable' });
      if (next.cables.length) {
        phaseFrameRef.current = requestAnimationFrame(() => {
          commitLayout({ ...next, phase: 'stable' });
        });
      }
      return;
    }

    transitioningRef.current = true;
    commitLayout({ ...previous, phase: 'leaving' });
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      commitLayout({ ...next, phase: next.cables.length ? 'entering' : 'stable' });
      phaseFrameRef.current = requestAnimationFrame(() => {
        phaseFrameRef.current = null;
        commitLayout({ ...next, phase: 'stable' });
        transitioningRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) applyMeasuredRef.current(pending);
      });
    }, TRANSITION_MS);
  }, [commitLayout]);

  applyMeasuredRef.current = applyMeasured;

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    const deck = deckRef.current;
    const sourceNode = sourceRef.current;
    if (!sidebar || !deck || !sourceNode) return;

    // StrictMode 冷启动时子组件 effect 的注册/清理会短暂交错；DOM 查询是同一语义的
    // 只读兜底，保证首次测量不依赖 effect 的兄弟执行顺序。
    const collectTargets = () => {
      const targets = new Map(targetsRef.current);
      sidebar.querySelectorAll<HTMLElement>('.session-pod[data-session-id]').forEach((root) => {
        const sessionId = root.dataset.sessionId;
        const closedImage = root.querySelector<HTMLImageElement>('.pod-frame-closed');
        const openImage = root.querySelector<HTMLImageElement>('.pod-frame-open');
        if (sessionId && closedImage && openImage) targets.set(sessionId, { root, closedImage, openImage });
      });
      return targets;
    };

    const measure = () => {
      measureFrameRef.current = null;
      const sidebarRect = sidebar.getBoundingClientRect();
      const deckRect = deck.getBoundingClientRect();
      const sourceRect = sourceNode.getBoundingClientRect();
      if (sidebarRect.width <= 0 || sidebarRect.height <= 0 || sourceRect.width <= 0) return;

      const source = {
        x: sourceRect.left - sidebarRect.left + sourceRect.width / 2,
        y: sourceRect.top - sidebarRect.top + sourceRect.height / 2,
      };
      const availableTargets = collectTargets();
      const deckCenter = (deckRect.top + deckRect.bottom) / 2;
      const visible = sessions
        .map((session) => {
          const target = availableTargets.get(session.id);
          if (!target) return null;
          const rect = target.root.getBoundingClientRect();
          const intersects = rect.bottom > deckRect.top + 1 && rect.top < deckRect.bottom - 1;
          if (!intersects) return null;
          return { session, target, rect, distance: Math.abs((rect.top + rect.bottom) / 2 - deckCenter) };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, MAX_VISIBLE_CABLES)
        .sort((left, right) => left.rect.top - right.rect.top);

      const cables = visible.flatMap(({ session, target }, lane) => {
        const image = openSessionId === session.id ? target.openImage : target.closedImage;
        const imageRect = image.getBoundingClientRect();
        if (imageRect.width <= 0 || imageRect.height <= 0) return [];
        const targetPoint = imageAnchor(imageRect, sidebarRect, POD_RECEIVER_ANCHOR);
        return [{
          sessionId: session.id,
          signature: neuralSignatureForSession(session.id),
          lane,
          source,
          target: targetPoint,
          path: routeNeuralCable(source, targetPoint, sidebarRect.width, lane),
        } satisfies CableGeometry];
      });

      applyMeasuredRef.current({
        width: sidebarRect.width,
        height: sidebarRect.height,
        cables,
        phase: 'stable',
      });
    };

    const scheduleMeasure = () => {
      if (measureFrameRef.current !== null) return;
      measureFrameRef.current = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(sidebar);
    observer.observe(deck);
    observer.observe(sourceNode);
    const imageNodes: HTMLImageElement[] = [];
    collectTargets().forEach((target) => {
      observer.observe(target.root);
      observer.observe(target.closedImage);
      observer.observe(target.openImage);
      imageNodes.push(target.closedImage, target.openImage);
    });
    imageNodes.forEach((image) => image.addEventListener('load', scheduleMeasure));
    deck.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    void document.fonts?.ready.then(scheduleMeasure);
    scheduleMeasure();

    return () => {
      observer.disconnect();
      imageNodes.forEach((image) => image.removeEventListener('load', scheduleMeasure));
      deck.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      if (measureFrameRef.current !== null) cancelAnimationFrame(measureFrameRef.current);
      measureFrameRef.current = null;
    };
  }, [deckRef, openSessionId, sessions, sidebarRef, sourceRef, targetVersion, targetsRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (phaseFrameRef.current !== null) cancelAnimationFrame(phaseFrameRef.current);
      if (measureFrameRef.current !== null) cancelAnimationFrame(measureFrameRef.current);
    };
  }, []);

  return (
    <svg
      className={`neural-cables-layer neural-cables-${layout.phase}`}
      viewBox={`0 0 ${Math.max(1, layout.width)} ${Math.max(1, layout.height)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-visible-cables={layout.cables.length}
    >
      {layout.cables.map((cable) => {
        const state = cable.sessionId === currentSessionId
          ? 'active'
          : cable.sessionId === hoveredSessionId
            ? 'hover'
            : 'dormant';
        const pathId = `neural-${idPrefix}-${stableSessionHash(cable.sessionId).toString(36)}`;
        return (
          <NeuralCable
            key={cable.sessionId}
            cable={cable}
            pathId={pathId}
            state={state}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </svg>
  );
}
