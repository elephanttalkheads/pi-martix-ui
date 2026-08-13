// diff 卡 —— v4 规格 §5.8：行号列 + 红删/绿增符号列 + 代码列，glitchIn 分段扫入
// 增删是符号 + 颜色双编码；行号未知（null）时留空。
import type { DiffRow } from '../store';

export default function DiffCard({ file, rows }: { file: string; rows: DiffRow[] }) {
  let plus = 0;
  let minus = 0;
  for (const r of rows) {
    if (r.t === '+') plus++;
    else if (r.t === '-') minus++;
  }
  const dFile = file.startsWith('✎ ') ? file : `✎ ${file}`;

  return (
    <div className="diff reveal corner">
      <div className="diff-head">
        <span className="d-file">{dFile}</span>
        <span className="d-stat">
          <span className="plus">+{plus}</span> <span className="minus">−{minus}</span>
        </span>
        <span className="d-op">modified</span>
      </div>
      <div className="diff-body">
        {rows.map((r, i) => (
          <div key={i} className={`diff-line ${r.t === '+' ? 'add' : r.t === '-' ? 'del' : 'ctx'}`}>
            <span className="ln">{r.n ?? ''}</span>
            <span className="sign">{r.t === '+' ? '+' : r.t === '-' ? '−' : ''}</span>
            <span className="code">{r.c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
