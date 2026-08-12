// 日志抽屉 —— v4 规格 §5.10（默认收起 height:0，展开 150px）
// 前端自收集（store.logs：事件流 + 状态变迁 + 蠕虫/命中日志），上限 120 行。
import { useEffect, useRef } from 'react';
import { useFeed } from '../store';

export default function LogDrawer({ open }: { open: boolean }) {
  const logs = useFeed((s) => s.logs);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length, open]);

  return (
    <div id="term" className={`term${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="term-head">
        <span className="t-title">运行日志</span>
        <span>stdout / stderr 合并</span>
      </div>
      <div id="term-body" ref={bodyRef} role="log">
        {logs.map((l, i) => (
          <div key={i} className={`t-${l.level}`}>
            <span className="t-dim">[{l.time}]</span> {l.text}
          </div>
        ))}
        {logs.length === 0 && <div className="t-dim">（尚无日志）</div>}
      </div>
    </div>
  );
}
