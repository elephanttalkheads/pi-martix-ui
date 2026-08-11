import { useState } from 'react';
import { useFeed } from '../store';

export default function InputBar() {
  const [text, setText] = useState('');
  const busy = useFeed((s) => s.busy);
  const pushUser = useFeed((s) => s.pushUser);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    pushUser(t);
    const r = await window.zion.prompt(t);
    // r = stopReason（'error'/'aborted' 由事件流呈现）
    if (r && r !== 'ok') console.warn('turn ended:', r);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="inputbar">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder="输入指令… (Enter 发送, Shift+Enter 换行)"
        rows={2}
        spellCheck={false}
      />
      {busy ? (
        <button className="send-btn danger" onClick={() => window.zion.abort()}>■ 中止</button>
      ) : (
        <button className="send-btn" onClick={send}>发送</button>
      )}
    </div>
  );
}
