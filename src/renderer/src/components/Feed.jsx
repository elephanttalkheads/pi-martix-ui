import { useFeed } from '../store';

function ToolRow({ item }) {
  const args = item.args ? JSON.stringify(item.args).slice(0, 160) : '';
  return (
    <div className={`feed-tool ${item.status}`}>
      <span className="t-name">▶ {item.toolName}</span>
      {args && <span className="t-args">{args}</span>}
      <span className="t-status">
        {item.status === 'run' ? '…' : item.status === 'ok' ? '[OK]' : '[ERR]'}
      </span>
    </div>
  );
}

export default function Feed() {
  const items = useFeed((s) => s.items);
  const busy = useFeed((s) => s.busy);

  return (
    <div className="feed" id="feed">
      {items.length === 0 && !busy && (
        <div className="feed-empty">ZION :: 会话就绪。输入指令开始。</div>
      )}
      {items.map((it) => {
        if (it.kind === 'user') return <div key={it.id} className="feed-user">&gt; {it.text}</div>;
        if (it.kind === 'system') return <div key={it.id} className="feed-system">{it.text}</div>;
        if (it.kind === 'tool') return <ToolRow key={it.id} item={it} />;
        return (
          <div key={it.id} className="feed-assistant">
            {it.text.split('\n').map((l, i) => (
              <span key={i}>{l}{i < it.text.split('\n').length - 1 && <br />}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
