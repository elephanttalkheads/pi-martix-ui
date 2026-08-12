// 侧栏 —— 神经核心 + Agent 卡片（静态 demo）+ 真实文件树 + 底部信息
// 文件树数据来自主进程扫描（zion:scan-tree）；行元素带 data-path 供蠕虫定位。
// 点击文件行 → onFileSelect(path)（App 发真实读取指令）；点击目录 → 展开/收起。
import { useEffect } from 'react';
import type { FileNode } from '../../../shared/protocol';
import { useFeed } from '../store';
import NeuralCore from './NeuralCore';

const AGENTS = [
  { name: 'NEO-7', desc: '通用推理 · 工具链调用', state: '在线 — 待命', online: true },
  { name: 'TRINITY-2', desc: '代码检索 · 漏洞分析', state: '空闲 — 上次运行 12 分钟前', online: false },
  { name: 'MORPHEUS-0', desc: '长程规划 · 多步任务编排', state: '在线 — 队列中', online: true },
];

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
            role={n.dir ? undefined : 'button'}
            tabIndex={n.dir ? undefined : 0}
            onClick={() => (n.dir ? onToggleDir(n) : onSelectFile(n))}
            onKeyDown={(e) => {
              if (!n.dir && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelectFile(n);
              }
            }}
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
  const activeAgent = useFeed((s) => s.activeAgent);
  const setActiveAgent = useFeed((s) => s.setActiveAgent);
  const log = useFeed((s) => s.log);

  useEffect(() => {
    window.zion?.scanTree().then(setTree).catch(() => {});
  }, [setTree]);

  const toggleDir = (n: FileNode) => {
    const flip = (nodes: FileNode[]): FileNode[] =>
      nodes.map((x) =>
        x.path === n.path ? { ...x, open: !x.open } : x.children ? { ...x, children: flip(x.children) } : x,
      );
    setTree(flip(tree));
    log('dim', `展开目录 ${n.path}`);
  };

  return (
    <aside className="sidebar" aria-label="侧栏">
      <div className="core-wrap">
        <NeuralCore />
        <div className="core-label">
          NEURAL CORE · <b>{activeAgent}</b> · <span id="core-state">IDLE</span>
        </div>
      </div>

      <div className="side-section">
        <h3>Agents</h3>
        {AGENTS.map((a) => (
          <div
            key={a.name}
            className={`agent-card${a.name === activeAgent ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveAgent(a.name);
              log('dim', `切换 Agent → ${a.name}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveAgent(a.name);
                log('dim', `切换 Agent → ${a.name}`);
              }
            }}
          >
            <div className="a-name">{a.name}</div>
            <div className="a-desc">{a.desc}</div>
            <div className="a-state">
              {a.online ? <span className="st-online">●</span> : <span className="st-idle">◐</span>} {a.state}
            </div>
          </div>
        ))}
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
