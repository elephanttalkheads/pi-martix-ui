// diff 卡 —— 烧录显影（3.4A）：新增行逐行烧录（白热闪光→冷却成磷光绿），删除行焦化
// （红闪→45% 余烬），全部落定后边框自绘一周 = 校验环闭合。
// 行级阶梯 90ms/行、封顶 30 行（长 diff 不惩罚）；校验环 delay 由封顶行数推导。
// 增删是符号 + 颜色双编码；行号未知（null）时留空。
// 历史回合/恢复场景由 .turn-agent.historical 的 animation:none 压平为终态（见 Feed）。
import type { DiffRow } from '../store';

/** 烧录阶梯封顶行数（delay = min(i, CAP)×90ms；校验环 delay 同基准 + 烧录时长 0.9s） */
const BURN_CAP = 30;

export default function DiffCard({ file, rows }: { file: string; rows: DiffRow[] }) {
  let plus = 0;
  let minus = 0;
  for (const r of rows) {
    if (r.t === '+') plus++;
    else if (r.t === '-') minus++;
  }
  const dFile = file.startsWith('✎ ') ? file : `✎ ${file}`;
  const ringDelay = (Math.min(rows.length, BURN_CAP) * 0.09 + 0.9).toFixed(2);

  return (
    <div className="diff reveal">
      {/* 校验环：viewBox 100×100 + pathLength=400 + vector-effect，与像素尺寸解耦 */}
      <svg className="ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="1" y="1" width="98" height="98" pathLength={400} style={{ animationDelay: `${ringDelay}s` }} />
      </svg>
      <div className="dhead">
        <span className="dfile">{dFile}</span>
        <span className="plus">+{plus}</span>
        <span className="minus">−{minus}</span>
        <span className="mod">MODIFIED</span>
      </div>
      <div className="diff-body">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`dl ${r.t === '+' ? 'add' : r.t === '-' ? 'del' : 'ctx'}`}
            style={{ animationDelay: `${(Math.min(i, BURN_CAP) * 0.09).toFixed(2)}s` }}
          >
            <span className="ln-no">{r.n ?? ''}</span>
            <span className="ln-sign">{r.t === '+' ? '+' : r.t === '-' ? '−' : '·'}</span>
            <span className="ln-code">{r.c || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
