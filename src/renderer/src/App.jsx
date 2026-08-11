import { useEffect } from 'react';
import MatrixBg from './components/MatrixBg';
import Feed from './components/Feed';
import InputBar from './components/InputBar';
import { useFeed } from './store';

// 把主进程推来的 agent 事件折算成 feed 状态
function useAgentEvents() {
  const appendDelta = useFeed((s) => s.appendDelta);
  const toolStart = useFeed((s) => s.toolStart);
  const toolEnd = useFeed((s) => s.toolEnd);
  const setBusy = useFeed((s) => s.setBusy);
  const setError = useFeed((s) => s.setError);

  useEffect(() => {
    if (!window.zion?.onAgentEvent) return;
    const off = window.zion.onAgentEvent((ev) => {
      switch (ev.type) {
        case 'message_update':
          if (ev.assistantMessageEvent?.type === 'text_delta') appendDelta(ev.assistantMessageEvent.delta);
          else if (ev.assistantMessageEvent?.type === 'thinking_delta') appendDelta(ev.assistantMessageEvent.delta);
          break;
        case 'tool_execution_start':
          toolStart({ toolName: ev.toolName, args: ev.args });
          break;
        case 'tool_execution_end':
          toolEnd(ev.toolName, ev.isError);
          break;
        case 'agent_start':
          setBusy(true);
          break;
        case 'agent_end':
          setBusy(false);
          break;
        case 'message_end':
          if (ev.message?.stopReason === 'error') setError('agent 回合以错误结束（见末尾消息）');
          break;
        default:
          break;
      }
    });
    return off;
  }, [appendDelta, toolStart, toolEnd, setBusy, setError]);
}

export default function App() {
  useAgentEvents();

  return (
    <div className="app">
      <MatrixBg />
      <div className="scanlines" />
      <header className="titlebar">
        <div className="brand">ZION://agent-console <span className="proto">v0.2.0</span></div>
        <div className="status-chip" id="chip-model">MODEL: ~/.pi/agent</div>
      </header>
      <main className="main">
        <Feed />
      </main>
      <footer className="statusbar">
        <span id="st-state">READY</span>
      </footer>
      <InputBar />
    </div>
  );
}
