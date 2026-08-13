// App —— v4 四区布局（标题栏 / 侧栏 / 对话区 / 日志抽屉+状态栏）
// 事件接线：agent_start→RUNNING、tool_execution_start→RUNNING、message_update→STREAMING、
// abort→CANCELLING、agent_end→READY；错误回合 → 红日志 + 中止音（状态机仍回 READY）。
// 蠕虫在 tool_execution_start 的同步路径触发（不依赖 React 渲染时序——bash 等快工具
// 的 tool_end 可能先于 useEffect 到达，导致时序竞争漏触发）。
import { useEffect, useRef, useState } from 'react';
import type { AgentSessionEvent } from '../../shared/protocol';
import RainCanvas from './components/RainCanvas';
import SignalCanvas from './components/SignalCanvas';
import Sidebar from './components/Sidebar';
import LogDrawer from './components/LogDrawer';
import Feed from './components/Feed';
import InputBar from './components/InputBar';
import AskDialog, { ToastHost } from './components/AskDialog';
import ProjectPanel from './components/ProjectPanel';
import { SND, useSoundFx } from './components/SoundFx';
import { useFeed, parseEditFromTool, normPath, matchTreeRow, openAncestors, deriveSessionTitle, type EditInfo } from './store';
import { releaseWorm } from './components/SignalCanvas';

function useAgentEvents() {
  const appendDelta = useFeed((s) => s.appendDelta);
  const toolStart = useFeed((s) => s.toolStart);
  const toolEnd = useFeed((s) => s.toolEnd);
  const setSessionState = useFeed((s) => s.setSessionState);
  const log = useFeed((s) => s.log);
  const wormedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!window.zion?.onAgentEvent) return;
    let replyScheduled = false;
    let errored = false; // message_end(error) 标记——agent_end 不再补 reply 音/完成日志

    // 蠕虫触发（同步路径）：定位文件树目标行 → 命中后登记 revealEdit（diff 卡延迟渲染）
    const triggerWorm = (toolCallId: string, edit: EditInfo) => {
      if (wormedRef.current.has(toolCallId)) return;
      wormedRef.current.add(toolCallId);
      log('warn', `[WORM] 神经核心释放蠕虫 → ${edit.file}`);
      const fire = (target: HTMLElement | null) => {
        const toolEl = document.querySelector<HTMLElement>(`.trace[data-toolcall="${toolCallId}"]`);
        releaseWorm(target ?? toolEl, () => {
          SND.breach();
          log('warn', `[PWN] 蠕虫命中 · 取得写入权限`);
          log('ok', `覆写扇区完成 → ${edit.file}`);
          useFeed.getState().revealEdit(toolCallId);
        });
      };
      const fileNorm = normPath(edit.file);
      const hit = matchTreeRow(fileNorm);
      if (hit) {
        fire(hit);
        return;
      }
      // 树中无匹配：刷新工作区树（新文件/目录结构变化）→ 展开祖先目录 → 等渲染完成再匹配
      void window.zion
        .scanTree()
        .then((fresh) => {
          useFeed.getState().setTree(fresh);
          const expanded = openAncestors(useFeed.getState().tree, fileNorm);
          if (expanded) useFeed.getState().setTree(expanded);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => fire(matchTreeRow(fileNorm))),
          );
        })
        .catch(() => fire(null));
    };

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
        case 'tool_execution_start': {
          const edit = parseEditFromTool(ev.toolName, ev.args);
          toolStart(ev, edit);
          setSessionState('RUNNING');
          log('dim', `[TOOL] ${ev.toolName} 开始`);
          if (edit) triggerWorm(ev.toolCallId, edit);
          break;
        }
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
          errored = false;
          break;
        case 'agent_end':
          setSessionState('READY');
          if (!replyScheduled && !errored) {
            replyScheduled = true;
            SND.reply();
            log('ok', '[TURN] 回复完成');
          } else if (!replyScheduled && errored) {
            replyScheduled = true; // 错误回合已由 message_end 标记，不再补完成音/日志
          }
          break;
        case 'agent_settled':
          setSessionState('READY');
          break;
        case 'message_end': {
          // stopReason 只存在于 LLM 助手消息分支（AgentMessage 联合的其他成员没有）；
          // 运行时按字段存在性判定，其余消息类型自动跳过。
          const stop = ev.message as { stopReason?: string } | null;
          if (stop?.stopReason === 'error') {
            setSessionState('READY');
            errored = true;
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

  // 扩展 UI 桥：对话框 + 通知订阅
  const setUiAsk = useFeed((s) => s.setUiAsk);
  const pushToast = useFeed((s) => s.pushToast);
  const dismissToast = useFeed((s) => s.dismissToast);
  useEffect(() => {
    if (!window.zion?.onUiAsk) return;
    const offAsk = window.zion.onUiAsk((ask) => setUiAsk(ask));
    const offNotify = window.zion.onUiNotify((n) => {
      pushToast(n);
      // 3s 自动消失
      window.setTimeout(() => {
        const t = useFeed.getState().toasts.find((x) => x.message === n.message && x.type === n.type);
        if (t) dismissToast(t.id);
      }, 3000);
    });
    return () => {
      offAsk();
      offNotify();
    };
  }, [setUiAsk, pushToast, dismissToast]);
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
  const sessionTitle = useFeed((s) => s.sessionTitle);
  const sndOn = useFeed((s) => s.sndOn);
  const setSndOn = useFeed((s) => s.setSndOn);
  const tokenCount = useFeed((s) => s.tokenCount);
  const pushUser = useFeed((s) => s.pushUser);
  const log = useFeed((s) => s.log);
  const applySession = useFeed((s) => s.applySession);
  const [termOpen, setTermOpen] = useState(false);
  const [bootAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => new Date());

  // 启动：恢复当前会话（continueRecent）→ 历史重建 feed；桥未注入时优雅降级（空界面）
  useEffect(() => {
    if (!window.zion?.getCurrentSession) return;
    let alive = true;
    window.zion
      .getCurrentSession()
      .then(async ({ id, items }) => {
        if (!alive) return;
        const sessions = await window.zion.listSessions().catch(() => []);
        if (!alive) return;
        const info = sessions.find((s) => s.id === id);
        const title = deriveSessionTitle(info?.name, info?.firstMessage, id);
        applySession(id, title, items);
        useFeed.getState().setSessions(sessions);
        // 当前项目（侧栏 Project 标题）
        const proj = await window.zion.getProject().catch(() => null);
        if (alive && proj) useFeed.getState().setCurrentProject(proj.path);
        // 无最近项目 → 自动打开项目选择面板（启动引导）
        const projs = await window.zion.listProjects().catch(() => []);
        if (alive && projs.length === 0) useFeed.getState().setProjectOpen(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [applySession]);

  // SND 开关与 store 同步：挂载时用持久化值初始化内部 enabled
  useEffect(() => {
    SND.setEnabled(useFeed.getState().sndOn);
  }, []);

  // 点击页面任意处后焦点归还输入框（v4 规格 §7.5）
  // 豁免弹层（AskDialog/项目面板/命令面板）：其内部输入不得被抢焦
  useEffect(() => {
    const refocus = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('.ask-mask, .project-panel, .palette, .s-title-edit')) return;
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
    <>
      {/* 氛围层在 #stage 之外（与 demo 结构一致）：fixed 定位，与主舞台同级比较 z-index */}
      <RainCanvas />
      <SignalCanvas />
      <div className="scanlines" aria-hidden="true" />
      <AskDialog />
      <ToastHost />
      <ProjectPanel />

      <div id="stage">
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
            <span className="chip on">SESS: {sessionTitle}</span>
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
    </>
  );
}
