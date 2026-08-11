import type { DiffRow } from '../store';

// diff 卡 —— 移植自 ui-demo addDiffCard：行号列 + 红删/绿增 + 代码列，逐行扫入（40ms/行）。
// 数据卡走 DOM（ADR-0001）；React 自动转义，无需 demo 的 esc()。

export default function DiffCard({ file, rows }: { file: string; rows: DiffRow[] }) {
  return (
    <div className="diff">
      <div className="diff-head">
        <span className="d-file">✎ {file}</span>
        <span className="d-op">modified</span>
      </div>
      <div className="diff-body">
        {rows.map((r, i) => {
          const cls = r.t === '+' ? 'add' : r.t === '-' ? 'del' : 'ctx';
          const sign = r.t === '+' ? '+' : r.t === '-' ? '-' : '·';
          return (
            <div key={i} className={`diff-line ${cls} reveal`} style={{ animationDelay: `${i * 40}ms` }}>
              <span className="ln">{r.n ?? ''}</span>
              <span className="sign">{sign}</span>
              <span className="code">{r.c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
