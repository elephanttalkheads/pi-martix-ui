import { useState } from 'react';
import { useFeed } from '../store';
import { SND } from './SoundFx';

export default function InputBar() {
  const [text, setText] = useState('');
  const busy = useFeed((s) => s.busy);
  const pushUser = useFeed((s) => s.pushUser);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    pushUser(t);
    SND.send();
    const r = await window.zion.prompt(t);
    // r = stopReason（'error'/'aborted' 由事件流呈现）
    if (r && r !== 'ok') console.warn('turn ended:', r);
  };

  const abort = () => {
    SND.abort();
    void window.zion.abort();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="inputbar">
      <div className="input-row">
        <span className="prompt-sign">❯</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="输入指令…"
          rows={2}
          spellCheck={false}
        />
        {busy ? (
          <button className="send-btn stop" onClick={abort}>■ 中止</button>
        ) : (
          <button className="send-btn" onClick={() => void send()}>发送</button>
        )}
      </div>
      <div className="input-hint">Enter 发送 · Shift+Enter 换行</div>
    </div>
  );
}
