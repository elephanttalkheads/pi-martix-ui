import { useEffect, useRef, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { SessionInfoLike } from '../../../shared/protocol';
import type { PodCableTarget } from '../neuralCable';
import podClosed from '../assets/session-pod-horizontal-closed.png';
import podDamaged from '../assets/session-pod-horizontal-damaged.png';

type SessionPodProps = {
  session: SessionInfoLike;
  displayIndex: number;
  active: boolean;
  deleteArmed: boolean;
  switching: boolean;
  editing: boolean;
  title: string;
  summary: string;
  onSelect: () => void;
  onPreview: (anchor: HTMLElement) => void;
  onPreviewEnd: () => void;
  onCableTarget?: (sessionId: string, target: PodCableTarget | null) => void;
  titleEditor?: ReactNode;
  actions: ReactNode;
};

export default function SessionPod({
  session,
  displayIndex,
  active,
  deleteArmed,
  switching,
  editing,
  title,
  summary,
  onSelect,
  onPreview,
  onPreviewEnd,
  onCableTarget,
  titleEditor,
  actions,
}: SessionPodProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closedImageRef = useRef<HTMLImageElement | null>(null);
  const openImageRef = useRef<HTMLImageElement | null>(null);
  const stateText = deleteArmed ? '等待删除确认' : active ? '当前会话' : '';
  const ariaLabel = [title, summary, stateText].filter(Boolean).join('。');

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(document.activeElement)) return;
    onPreviewEnd();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onPreviewEnd();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    const closedImage = closedImageRef.current;
    const openImage = openImageRef.current;
    if (!onCableTarget || !root || !closedImage || !openImage) return;
    onCableTarget(session.id, { root, closedImage, openImage });
    return () => onCableTarget(session.id, null);
  }, [onCableTarget, session.id]);

  return (
    <div
      ref={rootRef}
      className={`scard session-pod${active ? ' active' : ''}${deleteArmed ? ' delete-armed' : ''}${editing ? ' is-editing' : ''}`}
      data-session-id={session.id}
      data-od-id={`session-card-${session.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
      role="button"
      tabIndex={0}
      aria-current={active || undefined}
      aria-disabled={switching || undefined}
      aria-label={ariaLabel}
      onClick={onSelect}
      onPointerEnter={(event) => onPreview(event.currentTarget)}
      onPointerLeave={handlePointerLeave}
      onFocus={(event) => onPreview(event.currentTarget)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <span className="pod-visual" aria-hidden="true">
        <img ref={closedImageRef} className="pod-frame pod-frame-closed" src={podClosed} alt="" draggable={false} />
        <img ref={openImageRef} className="pod-frame pod-frame-open" src={podDamaged} alt="" draggable={false} />
      </span>

      <span className="pod-nameplate">
        <span className="pod-index">{String(displayIndex).padStart(2, '0')}</span>
        <span className="pod-title" title={title}>{editing ? titleEditor : title}</span>
        <span className="pod-state" aria-hidden="true">
          {deleteArmed ? '!' : active ? '●' : '○'}
        </span>
        <span
          className="session-pod-actions"
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </span>
      </span>
    </div>
  );
}
