import { useFeed, type FeedItem } from '../store';

function ToolRow({ item }: { item: Extract<FeedItem, { kind: 'tool' }> }) {
  const args = item.args === undefined ? '' : JSON.stringify(item.args).slice(0, 160);
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

function AssistantText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((l, i) => (
        <span key={i}>
          {l}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
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
        switch (it.kind) {
          case 'user':
            return (
              <div key={it.id} className="feed-user">&gt; {it.text}</div>
            );
          case 'system':
            return <div key={it.id} className="feed-system">{it.text}</div>;
          case 'tool':
            return <ToolRow key={it.id} item={it} />;
          case 'assistant':
            return (
              <div key={it.id} className="feed-assistant">
                <AssistantText text={it.text} />
              </div>
            );
        }
      })}
    </div>
  );
}
