// 侧栏 —— Neo 头像 + 会话列表（真实 SDK 会话）+ 文件树 + 底部信息
// 会话卡：标题（firstMessage 摘要）+ 消息数 + 上次活动时间；点击切换（懒创建实例）；
// 「新建会话」按钮。文件树行带 data-path 供蠕虫定位；点击文件行发读取指令。
import { useEffect, useRef, useState } from 'react';
import type { FileNode, SessionInfoLike } from '../../../shared/protocol';
import { useFeed, deriveSessionTitle } from '../store';
import NeoAvatar from './NeoAvatar';

/** 会话显示标题：name → firstMessage 摘要 → 会话短码（统一 deriveSessionTitle，store.ts 单测覆盖） */
function titleFor(s: SessionInfoLike): string {
  if (s.name) return deriveSessionTitle(s.name, undefined, s.id);
  return deriveSessionTitle(undefined, s.firstMessage, s.id);
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });

function TreeRows({
  nodes,
  onToggleDir,
  onSelectFile,
}: {
  nodes: FileNode[];
  onToggleDir: (node: FileNode) => void;
  onSelectFile: (node: FileNode) => void;
}) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.path} className={`ft-node${n.dir ? ' dir' : ''}${n.open ? ' open' : ''}`}>
          <div
            className="ft-row"
            data-path={n.path}
            onClick={() => (n.dir ? onToggleDir(n) : onSelectFile(n))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (n.dir) onToggleDir(n);
                else onSelectFile(n);
              }
            }}
            role={n.dir ? 'button' : undefined}
            tabIndex={n.dir ? 0 : undefined}
          >
            <span className="ft-caret">{n.dir ? '▸' : ''}</span>
            <span className="ft-name">{n.name}</span>
            {!n.dir && n.size && <span className="ft-size">{n.size}</span>}
          </div>
          {n.dir && n.children && (
            <div className="ft-children">
              <TreeRows nodes={n.children} onToggleDir={onToggleDir} onSelectFile={onSelectFile} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function Sidebar({ onSelectFile }: { onSelectFile: (path: string) => void }) {
  const tree = useFeed((s) => s.tree);
  const setTree = useFeed((s) => s.setTree);
  const sessionTitle = useFeed((s) => s.sessionTitle);
  const sessionState = useFeed((s) => s.sessionState);
  const sessions = useFeed((s) => s.sessions);
  const currentSessionId = useFeed((s) => s.currentSessionId);
  const setSessions = useFeed((s) => s.setSessions);
  const setSessionTitle = useFeed((s) => s.setSessionTitle);
  const applySession = useFeed((s) => s.applySession);
  const log = useFeed((s) => s.log);
  const [switching, setSwitching] = useState(false);
  /** 重命名编辑态：编辑中的会话 id + 草稿 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  /** 删除确认态：待确认的会话 id（2.5s 自动复位） */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);

  // 初始：文件树 + 会话列表
  useEffect(() => {
    window.zion?.scanTree().then(setTree).catch(() => {});
    window.zion?.listSessions().then(setSessions).catch(() => {});
  }, [setTree, setSessions]);

  // 堆叠卡：测量每卡完整高度 → --h（负 margin 覆盖量 = 完整高 - 露出区 88px）
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    deck.querySelectorAll<HTMLElement>('.scard').forEach((el) => {
      el.style.setProperty('--h', el.scrollHeight + 2 + 'px');
    });
  }, [sessions, currentSessionId]);

  const toggleDir = (n: FileNode) => {
    const flip = (nodes: FileNode[]): FileNode[] =>
      nodes.map((x) =>
        x.path === n.path ? { ...x, open: !x.open } : x.children ? { ...x, children: flip(x.children) } : x,
      );
    setTree(flip(tree));
    log('dim', `展开目录 ${n.path}`);
  };

  const selectSession = async (s: SessionInfoLike) => {
    if (s.id === currentSessionId || switching) return;
    setSwitching(true);
    log('dim', `[SESS] 切换会话 → ${titleFor(s)}`);
    try {
      const { id, items } = await window.zion.switchSession(s.id);
      applySession(id, titleFor(s), items);
      log('ok', `[SESS] 已切换 · ${items.length} 条历史`);
    } catch (e) {
      log('err', `[SESS] 切换失败: ${String(e)}`);
    }
    setSwitching(false);
    void window.zion.listSessions().then(setSessions).catch(() => {});
  };

  const newSession = async () => {
    if (switching) return;
    setSwitching(true);
    log('dim', '[SESS] 新建会话');
    try {
      const { id, items } = await window.zion.newSession();
      applySession(id, `会话 ${id.slice(0, 4)}`, items);
      log('ok', '[SESS] 新会话就绪');
    } catch (e) {
      log('err', `[SESS] 新建失败: ${String(e)}`);
    }
    setSwitching(false);
    void window.zion.listSessions().then(setSessions).catch(() => {});
  };

  // 删除两段确认：第一击进入确认态（2.5s 复位），确认态下再击执行
  const askDelete = (s: SessionInfoLike) => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    if (confirmId === s.id) {
      void doDelete(s);
      return;
    }
    setConfirmId(s.id);
    confirmTimer.current = setTimeout(() => setConfirmId(null), 2500);
  };

  const doDelete = async (s: SessionInfoLike) => {
    if (switching) return;
    setSwitching(true);
    log('warn', `[SESS] 删除会话 → ${titleFor(s)}`);
    try {
      const list = await window.zion.deleteSession(s.id);
      setSessions(list);
      if (s.id === currentSessionId) {
        // 当前会话被删：后端指针已落到最近会话，重新拉取当前
        const cur = await window.zion.getCurrentSession();
        const info = list.find((x) => x.id === cur.id);
        applySession(cur.id, info ? titleFor(info) : `会话 ${cur.id.slice(0, 4)}`, cur.items);
      }
      log('ok', '[SESS] 已删除（移入 .trash 可恢复）');
    } catch (e) {
      log('err', `[SESS] 删除失败: ${String(e)}`);
    }
    setSwitching(false);
    setConfirmId(null);
  };

  const startRename = (s: SessionInfoLike) => {
    setDraft(titleFor(s));
    setEditingId(s.id);
  };

  const commitRename = async (s: SessionInfoLike) => {
    const name = draft.trim();
    setEditingId(null);
    if (!name || name === titleFor(s)) return;
    log('dim', `[SESS] 重命名 → ${name}`);
    try {
      const list = await window.zion.renameSession(s.id, name);
      setSessions(list);
      if (s.id === currentSessionId) setSessionTitle(name);
      log('ok', '[SESS] 重命名已持久化');
    } catch (e) {
      log('err', `[SESS] 重命名失败: ${String(e)}`);
    }
  };

  return (
    <aside className="sidebar" aria-label="侧栏">
      <div className="core-wrap">
        <NeoAvatar />
        <div className="core-label">
          NEO · <b>{sessionTitle}</b> ·{' '}
          <span id="core-state">{sessionState === 'READY' ? 'IDLE' : 'ACTIVE'}</span>
        </div>
      </div>

      <div className="side-section">
        <h3>会话</h3>
        <div className="deck" ref={deckRef}>
          {sessions.map((s) => {
            const active = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                className={`scard${active ? ' active' : ''}`}
                role="button"
                tabIndex={0}
                aria-current={active || undefined}
                onClick={() => void selectSession(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void selectSession(s);
                  }
                }}
              >
                <div className="s-title-row">
                  {editingId === s.id ? (
                    <input
                      className="s-title-edit"
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') { e.preventDefault(); void commitRename(s); }
                        else if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => void commitRename(s)}
                    />
                  ) : (
                    <div className="s-title">{titleFor(s)}</div>
                  )}
                </div>
                <div className="s-summary">{s.firstMessage || '（空会话）'}</div>
                <div className="s-meta">
                  <span className="s-meta-info">
                    {s.messageCount} 条消息 · 上次活动 {fmtTime(s.modified)}
                  </span>
                  <span className="s-ops" onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`s-op${confirmId === s.id ? ' danger' : ''}`}
                      title="删除会话（.trash 可恢复）"
                      aria-label={`删除会话 ${titleFor(s)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        askDelete(s);
                      }}
                    >
                      {confirmId === s.id ? '确认?' : '✕'}
                    </button>
                    <button
                      className="s-op"
                      title="重命名会话"
                      aria-label={`重命名会话 ${titleFor(s)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startRename(s);
                      }}
                    >
                      ✎
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div className="ft-row" style={{ color: 'var(--text-tertiary)' }}>
              （尚无会话）
            </div>
          )}
          <button className="new-btn" disabled={switching} onClick={() => void newSession()}>
            ＋ 新建会话
          </button>
        </div>
      </div>

      <div className="side-section">
        <h3>Project</h3>
        <div id="file-tree">
          {tree.length === 0 ? (
            <div className="ft-row" style={{ color: 'var(--text-tertiary)' }}>
              （工作区为空）
            </div>
          ) : (
            <TreeRows nodes={tree} onToggleDir={toggleDir} onSelectFile={(n) => onSelectFile(n.path)} />
          )}
        </div>
      </div>

      <div className="side-foot">
        <div>
          <span className="ok">● 已连接 zion 主网</span>
        </div>
        <div>workspace: zion-workspace</div>
      </div>
    </aside>
  );
}
