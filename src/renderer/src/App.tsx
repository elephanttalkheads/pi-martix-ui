import { useEffect, useState } from 'react';
import type { AgentSessionEvent } from '../../shared/protocol';
import MatrixBg from './components/MatrixBg';
import CrtOverlay from './components/CrtOverlay';
import WormLayer from './components/WormLayer';
import Feed from './components/Feed';
import InputBar from './components/InputBar';
import { SND, useSoundFx } from './components/SoundFx';
import { useFeed, parseEditFromTool } from './store';

// 主进程推来的 agent 事件 → feed 状态 + FX 折算 + 音效挂钩
// FX 折算规则（CONTEXT.md）：agent_start → busy+FX 抬升；tool start → load 脉冲（SND.step）；
// tool end ok → blip；agent_end → 回复音；错误回合 → 中止音 + 状态栏红脉冲。
function useAgentEvents() {
  const appendDelta = useFeed((s) => s.appendDelta);
  const toolStart = useFeed((s) => s.toolStart);
  const toolEnd = useFeed((s) => s.toolEnd);
  const setBusy = useFeed((s) => s.setBusy);
  const setError = useFeed((s) => s.setError);

  useEffect(() => {
    if (!window.zion?.onAgentEvent) return;
    const handle = (ev: AgentSessionEvent) => {
      switch (ev.type) {
        case 'message_update': {
          const e = ev.assistantMessageEvent;
          if (e.type === 'text_delta' || e.type === 'thinking_delta') appendDelta(e.delta);
          break;
        }
        case 'tool_execution_start':
          toolStart(ev, parseEditFromTool(ev.toolName, ev.args));
          SND.step();
          break;
        case 'tool_execution_end':
          toolEnd(ev.toolCallId, ev.isError, ev.result);
          if (ev.isError) SND.abort();
          else SND.blip();
          break;
        case 'agent_start':
          setBusy(true);
          break;
        case 'agent_end':
          setBusy(false);
          SND.reply();
          break;
        case 'agent_settled':
          setBusy(false);
          break;
        case 'message_end': {
          // stopReason 只存在于 LLM 助手消息分支（AgentMessage 联合的其他成员没有）；
          // 用 in 守卫按运行时语义判定，其余消息类型自动跳过。
          const stop = ev.message as { stopReason?: string } | null;
          if (stop?.stopReason === 'error') {
            setError('agent 回合以错误结束（见末尾消息）');
            SND.abort();
          }
          break;
        }
        default:
          break;
      }
    };
    return window.zion.onAgentEvent(handle);
  }, [appendDelta, toolStart, toolEnd, setBusy, setError]);
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="clock">
      {p(now.getHours())}:{p(now.getMinutes())}:{p(now.getSeconds())}
    </span>
  );
}

export default function App() {
  useAgentEvents();
  useSoundFx();
  const busy = useFeed((s) => s.busy);
  const error = useFeed((s) => s.error);
  const sndOn = useFeed((s) => s.sndOn);
  const setSndOn = useFeed((s) => s.setSndOn);

  const state = error ? 'ERROR' : busy ? 'STREAMING' : 'READY';

  return (
    <div className="app">
      <MatrixBg />
      <WormLayer />
      <CrtOverlay />
      <header className="titlebar">
        <div className="brand" data-text="ZION://agent-console">
          ZION://agent-console <span className="proto">v0.3.0</span>
        </div>
        <div className="title-right">
          <span className="status-chip">MODEL: ~/.pi/agent</span>
          <Clock />
        </div>
      </header>
      <main className="main">
        <section className="console">
          <div className="conv-head">
            <span className="c-title">OPERATOR CONSOLE</span>
            <span className={`chip ${busy ? 'on' : ''}`}>{state}</span>
            <span className="spacer" />
            <span className="chip">{sndOn ? 'SND: ON' : 'SND: OFF'}</span>
          </div>
          <Feed />
          <InputBar />
        </section>
      </main>
      <footer className={`statusbar ${error ? 'err' : ''}`}>
        <span id="st-state" className={busy ? 'warn' : error ? 'err' : ''}>
          {state}
        </span>
        <div className="s-group">
          <button
            className="snd-toggle"
            onClick={() => setSndOn(SND.toggle())}
            title="切换 UI 音效"
          >
            SND: {sndOn ? 'ON' : 'OFF'}
          </button>
          <span className="st-dim">ZION v0.3.0</span>
        </div>
      </footer>
    </div>
  );
}
