// ProjectPanel —— 项目选择面板（启动无最近项目自动打开 / 侧栏「切换项目」）
// 最近项目卡片（v4 令牌，会话卡同款）+ 「浏览…」原生目录选择器
// 切换 = 主进程重建会话上下文（WORKSPACE_DIR 更新 + 旧会话 dispose），返回新会话历史重建 feed
import { useEffect, useState } from 'react';
import { useFeed } from '../store';
import type { ProjectInfo } from '../../../shared/protocol';

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function ProjectPanel() {
  const open = useFeed((s) => s.projectOpen);
  const setProjectOpen = useFeed((s) => s.setProjectOpen);
  const applySession = useFeed((s) => s.applySession);
  const setSessions = useFeed((s) => s.setSessions);
  const setCurrentProject = useFeed((s) => s.setCurrentProject);
  const setTree = useFeed((s) => s.setTree);
  const log = useFeed((s) => s.log);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [busy, setBusy] = useState(false);

  // 打开时刷新最近项目
  useEffect(() => {
    if (!open) return;
    let alive = true;
    window.zion.listProjects().then((l) => alive && setProjects(l)).catch(() => {});
    return () => { alive = false; };
  }, [open]);

  if (!open) return null;

  /** 切换项目：重建 feed + 刷新侧栏（树/会话列表） */
  const applySwitch = async (r: Awaited<ReturnType<typeof window.zion.switchProject>>) => {
    applySession(r.id, `会话 ${r.id.slice(0, 4)}`, r.items);
    setTree([]);
    setCurrentProject(r.path);
    const sessions = await window.zion.listSessions().catch(() => []);
    setSessions(sessions);
    const tree = await window.zion.scanTree().catch(() => []);
    setTree(tree);
    log('ok', `[PRJ] 已切换项目 → ${r.path}`);
  };

  const pick = async (path: string) => {
    if (busy) return;
    setBusy(true);
    log('dim', `[PRJ] 切换项目 → ${path}`);
    try {
      const r = await window.zion.switchProject(path);
      await applySwitch(r);
      setProjectOpen(false);
    } catch (e) {
      log('err', `[PRJ] 切换失败: ${String(e)}`);
    }
    setBusy(false);
  };

  const browse = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await window.zion.browseProject();
      if (r) {
        await applySwitch(r);
        setProjectOpen(false);
      }
    } catch (e) {
      log('err', `[PRJ] 浏览选择失败: ${String(e)}`);
    }
    setBusy(false);
  };

  return (
    <div
      className="ask-mask"
      onMouseDown={(e) => {
        // 有最近项目时可关闭面板（回到当前项目）；无则必须选
        if (e.target === e.currentTarget && projects.length > 0) setProjectOpen(false);
      }}
    >
      <div className="project-panel corner" role="dialog" aria-label="项目选择">
        <div className="pp-title">SELECT PROJECT</div>
        <div className="pp-sub">选择 agent 的工作目录 · 会话上下文将切换到该项目</div>
        {projects.length > 0 && (
          <div className="pp-list">
            {projects.map((p) => (
              <div
                key={p.path}
                className="pp-card"
                role="button"
                tabIndex={0}
                onClick={() => void pick(p.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void pick(p.path);
                  }
                }}
              >
                <div className="pp-card-path">{p.path}</div>
                <div className="pp-card-meta">上次使用 {fmtDate(p.lastUsed)}</div>
              </div>
            ))}
          </div>
        )}
        <button className="ask-btn primary pp-browse" disabled={busy} onClick={() => void browse()}>
          {busy ? '切换中…' : '浏览其他目录…'}
        </button>
        {projects.length > 0 && (
          <button className="ask-btn pp-cancel" onClick={() => setProjectOpen(false)}>
            取消
          </button>
        )}
      </div>
    </div>
  );
}
