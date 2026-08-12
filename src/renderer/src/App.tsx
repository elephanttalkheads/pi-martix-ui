// App —— v4 四区布局（标题栏 / 侧栏 / 对话区 / 日志抽屉+状态栏）
// 事件接线：agent_start→RUNNING、tool_execution_start→RUNNING、message_update→STREAMING、
// abort→CANCELLING、agent_end→READY；错误回合 → 红日志 + 中止音（状态机仍回 READY）。
import { useEffect, useState } from 'react';
import type { AgentSessionEvent } from '../../shared/protocol';
import RainCanvas from './components/RainCanvas';
import SignalCanvas from './components/SignalCanvas';
import Sidebar from './components/Sidebar';
import LogDrawer from './components/LogDrawer';
import Feed from './components/Feed';
import InputBar from './components/InputBar';
import { SND, useSoundFx } from './components/SoundFx';
import { useFeed, parseEditFromTool } from './store';

function useAgentEvents() {
  const appendDelta = useFeed((s) => s.appendDelta);
  const toolStart = useFeed((s) => s.toolStart);
  const toolEnd = useFeed((s) => s.toolEnd);
  const setSessionState = useFeed((s) => s.setSessionState);
  const log = useFeed((s) => s.log);

  useEffect(() => {
    if (!window.zion?.onAgentEvent) return;
    let replyScheduled = false;
    const handle = (ev: AgentSessionEvent) => {
      switch (ev.type) {
        case 'message_update': {
          const e = ev.assistantMessageEvent;
          if (e.type === 'text_delta' || e.type === 'thinking_delta') {
            appendDelta(e.delta);
            setSessionState('STREAMING');
          }
          break;
        }
        case 'tool_execution_start':
          toolStart(ev, parseEditFromTool(ev.toolName, ev.args));
          setSessionState('RUNNING');
          log('dim', `[TOOL] ${ev.toolName} 开始`);
          break;
        case 'tool_execution_end':
          toolEnd(ev.toolCallId, ev.isError, ev.result);
          if (ev.isError) {
            SND.abort();
            log('err', `[TOOL] ${ev.toolName} 失败`);
          } else {
            SND.step();
            log('ok', `[TOOL] ${ev.toolName} 完成`);
          }
          break;
        case 'agent_start':
          setSessionState('RUNNING');
          replyScheduled = false;
          break;
        case 'agent_end':
          setSessionState('READY');
          if (!replyScheduled) {
            replyScheduled = true;
            SND.reply();
            log('ok', '[TURN] 回复完成');
          }
          break;
        case 'agent_settled':
          setSessionState('READY');
          break;
        case 'message_end': {
          // stopReason 只存在于 LLM 助手消息分支（AgentMessage 联合的其他成员没有）；
          // 用 in 守卫按运行时语义判定，其余消息类型自动跳过。
          const stop = ev.message as { stopReason?: string } | null;
          if (stop?.stopReason === 'error') {
            setSessionState('READY');
            SND.abort();
            log('err', '[TURN] 回合以错误结束（模型/请求失败）');
          }
          break;
        }
        default:
          break;
      }
    };
    return window.zion.onAgentEvent(handle);
  }, [appendDelta, toolStart, toolEnd, setSessionState, log]);
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
  const sessionState = useFeed((s) => s.sessionState);
  const activeAgent = useFeed((s) => s.activeAgent);
  const sndOn = useFeed((s) => s.sndOn);
  const setSndOn = useFeed((s) => s.setSndOn);
  const tokenCount = useFeed((s) => s.tokenCount);
  const pushUser = useFeed((s) => s.pushUser);
  const log = useFeed((s) => s.log);
  const [termOpen, setTermOpen] = useState(false);
  const [bootAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => new Date());

  // SND 开关与 store 同步：挂载时用持久化值初始化内部 enabled
  useEffect(() => {
    SND.setEnabled(useFeed.getState().sndOn);
  }, []);

  // 点击页面任意处后焦点归还输入框（v4 规格 §7.5）
  useEffect(() => {
    const refocus = () => {
      window.setTimeout(() => {
        const el = document.getElementById('cmdline') as HTMLInputElement | null;
        if (el && !el.disabled) el.focus();
      }, 0);
    };
    document.addEventListener('mousedown', refocus);
    return () => document.removeEventListener('mousedown', refocus);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const p = (n: number) => String(n).padStart(2, '0');
  const up = Math.floor((now.getTime() - bootAt) / 1000);

  const selectFile = (path: string) => {
    pushUser(`读取 ${path}`);
    log('dim', `[FILE] 读取 ${path}`);
    SND.send();
    void window.zion.prompt(`读取 ${path}`);
  };

  return (
    <div id="stage">
      <RainCanvas />
      <SignalCanvas />
      <div className="scanlines" aria-hidden="true" />

      <header className="titlebar">
        <div className="window-controls" aria-hidden="true">
          <span className="dot close" />
          <span className="dot min" />
          <span className="dot max" />
        </div>
        <div className="brand">
          ZION://agent-console <span className="proto">v4.0-minimal</span>
        </div>
        <Clock />
      </header>

      <div className="main">
        <Sidebar onSelectFile={selectFile} />
        <section className="console">
          <div className="conv-head">
            <span className="c-title">主控会话 #0047</span>
            <span className="chip on">MODEL: {activeAgent}</span>
            <span id="chip-state" className={`chip ${sessionState === 'READY' ? 'on' : 'warn'}`}>
              {sessionState}
            </span>
            <span className="spacer" />
            <span className="chip st-dim">上下文 12.4k / 128k</span>
          </div>
          <Feed />
          <InputBar />
        </section>
      </div>

      <LogDrawer open={termOpen} />

      <footer className="statusbar">
        <div className="s-group">
          <span>
            <span className="st-acc">●</span> 已连接 zion 主网
          </span>
          <span className="st-dim">TLS 1.3</span>
        </div>
        <div className="s-group">
          <span className="st-dim">tokens: {tokenCount.toLocaleString()}</span>
          <span className="st-dim">
            uptime: {p(Math.floor(up / 60))}:{p(up % 60)}
          </span>
          <button
            className="st-btn"
            aria-expanded={termOpen}
            onClick={() => {
              setTermOpen(!termOpen);
              log('dim', `[LOG] 日志抽屉 ${termOpen ? '收起' : '展开'}`);
            }}
          >
            日志 {termOpen ? '▴' : '▾'}
          </button>
          <button
            className="st-btn"
            onClick={() => setSndOn(SND.toggle())}
            title="切换 UI 音效"
          >
            SND: {sndOn ? 'ON' : 'OFF'}
          </button>
          <span id="st-state" className={sessionState === 'READY' ? 'ready' : 'run'}>
            {sessionState}
          </span>
        </div>
      </footer>
    </div>
  );
}
