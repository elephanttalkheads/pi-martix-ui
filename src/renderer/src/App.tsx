import { useEffect } from 'react';
import type { AgentSessionEvent } from '../../shared/protocol';
import MatrixBg from './components/MatrixBg';
import Feed from './components/Feed';
import InputBar from './components/InputBar';
import { useFeed } from './store';

// 把主进程推来的 agent 事件折算成 feed 状态（事件类型见 shared/protocol.ts）
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
          toolStart({ toolName: ev.toolName, args: ev.args });
          break;
        case 'tool_execution_end':
          toolEnd(ev.toolName, ev.isError);
          break;
        case 'agent_start':
          setBusy(true);
          break;
        case 'agent_end':
        case 'agent_settled':
          setBusy(false);
          break;
        case 'message_end': {
          // stopReason 只存在于 LLM 助手消息分支（AgentMessage 联合的其他成员没有）；
          // 用 in 守卫按运行时语义判定，其余消息类型自动跳过。
          const stop = ev.message as { stopReason?: string } | null;
          if (stop?.stopReason === 'error') setError('agent 回合以错误结束（见末尾消息）');
          break;
        }
        default:
          break;
      }
    };
    return window.zion.onAgentEvent(handle);
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
