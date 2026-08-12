// 输入栏 —— v4 规格 §5.9：快捷指令按钮 + ❯ 提示符 + 切角发送按钮
// 生成中按钮切换为「中断」（红色系）；/clear 本地清空 feed；其余指令原样发真实 prompt。
import { useState } from 'react';
import { useFeed } from '../store';
import { SND } from './SoundFx';

const QUICK_CMDS = ['/status 系统状态', '/trace 回放链路', '检索记忆库', '扫描项目风险'];

export default function InputBar() {
  const [text, setText] = useState('');
  const sessionState = useFeed((s) => s.sessionState);
  const sessionTitle = useFeed((s) => s.sessionTitle);
  const busy = sessionState !== 'READY';
  const cancelling = sessionState === 'CANCELLING';
  const sendDisabled = busy || text.trim() === '';
  const streaming = sessionState === 'STREAMING';

  const send = async (raw?: string) => {
    const value = (raw ?? text).trim();
    if (!value || busy) return;
    const pushUser = useFeed.getState().pushUser;
    const reset = useFeed.getState().reset;
    const log = useFeed.getState().log;
    if (value === '/clear') {
      reset();
      log('dim', '[CMD] 清空会话视图');
      setText('');
      return;
    }
    pushUser(value);
    setText('');
    SND.send();
    log('dim', `[SND] 发送指令 · ${value.slice(0, 40)}`);
    try {
      await window.zion.prompt(value);
      log('dim', '[TURN] 回合结束');
    } catch {
      log('err', '[TURN] 回合异常结束');
    }
  };

  const abort = async () => {
    const setSessionState = useFeed.getState().setSessionState;
    const markInterrupted = useFeed.getState().markInterrupted;
    const log = useFeed.getState().log;
    setSessionState('CANCELLING');
    SND.abort();
    log('warn', '[INT] 操作员中断当前生成');
    markInterrupted();
    await window.zion.abort();
  };

  return (
    <div className="inputbar">
      <div className="quick-cmds">
        {QUICK_CMDS.map((c) => (
          <button key={c} className="qcmd" onClick={() => send(c)} disabled={busy}>
            {c}
          </button>
        ))}
      </div>
      <div className="input-row">
        <span className="prompt-sign">❯</span>
        <input
          id="cmdline"
          value={text}
          placeholder={`输入指令给 ${sessionTitle} …`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (streaming || cancelling) void abort();
              else void send();
            }
          }}
          disabled={cancelling}
        />
        <button
          className={`send-btn${busy ? ' stop' : ''}`}
          onClick={() => (busy ? void abort() : void send())}
          disabled={!busy && sendDisabled}
        >
          {busy ? '中断' : '发送'}
        </button>
      </div>
      <div className="input-hint">Enter 发送 · 支持 /status /trace /clear · 生成中按钮切换为「中断」</div>
    </div>
  );
}
