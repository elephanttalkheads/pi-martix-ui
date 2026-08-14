// App —— v4 四区布局（标题栏 / 侧栏 / 对话区 / 日志抽屉+状态栏）
// 事件接线：agent_start→RUNNING、tool_execution_start→RUNNING、message_update→STREAMING、
// abort→CANCELLING、agent_end→READY；错误回合 → 红日志 + 中止音（状态机仍回 READY）。
// 蠕虫在 tool_execution_start 的同步路径触发（不依赖 React 渲染时序——bash 等快工具
// 的 tool_end 可能先于 useEffect 到达，导致时序竞争漏触发）。
import { useEffect, useRef, useState } from 'react';
import type { AgentSessionEvent, ModelOption } from '../../shared/protocol';
import RainCanvas from './components/RainCanvas';
import SignalCanvas from './components/SignalCanvas';
import Sidebar from './components/Sidebar';
import LogDrawer from './components/LogDrawer';
import Feed from './components/Feed';
import InputBar from './components/InputBar';
import AskDialog, { ToastHost } from './components/AskDialog';
import ProjectPanel from './components/ProjectPanel';
import ZionModal from './components/ZionModal';
import ModelPicker from './components/ModelPicker';
import SettingsPanel from './components/SettingsPanel';
import HotkeysPanel from './components/HotkeysPanel';
import { SND, useSoundFx } from './components/SoundFx';
import { useFeed, parseEditFromTool, normPath, matchTreeRow, openAncestors, deriveSessionTitle, type EditInfo } from './store';
import { releaseWorm } from './components/SignalCanvas';

function useAgentEvents() {
  const queueDelta = useFeed((s) => s.queueDelta);
  const armTurn = useFeed((s) => s.armTurn);
  const closeTurn = useFeed((s) => s.closeTurn);
  const addUsage = useFeed((s) => s.addUsage);
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
            queueDelta(e.delta, e.type === 'thinking_delta' ? 'thinking' : 'text');
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
          armTurn(); // 回合起点（队列化，与后续 delta/tool 保序）
          setSessionState('RUNNING');
          replyScheduled = false;
          errored = false;
          break;
        case 'agent_end':
          closeTurn(); // 回合闭环 → 结算行（中断判定在 store 内按 interrupted 标记）
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
          closeTurn();
          setSessionState('READY');
          break;
        case 'turn_end': {
          // 每个 LLM turn 的 usage 累积进活动回合（结算行 Σtokens；多 turn 工具循环求和）
          const m = ev.message as { usage?: { totalTokens?: number } } | null;
          const tk = m?.usage?.totalTokens;
          if (typeof tk === 'number') addUsage(tk);
          break;
        }
        case 'message_end': {
          // stopReason 只存在于 LLM 助手消息分支（AgentMessage 联合的其他成员没有）；
          // 运行时按字段存在性判定，其余消息类型自动跳过。
          const stop = ev.message as { stopReason?: string } | null;
          if (stop?.stopReason === 'error') {
            closeTurn('error');
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
  }, [queueDelta, armTurn, closeTurn, addUsage, toolStart, toolEnd, setSessionState, log]);

  // 扩展 UI 桥：对话框 + 通知订阅（toast 自动消失由 store.pushToast 统一计时，勿在此重复）
  const setUiAsk = useFeed((s) => s.setUiAsk);
  const pushToast = useFeed((s) => s.pushToast);
  useEffect(() => {
    if (!window.zion?.onUiAsk) return;
    const offAsk = window.zion.onUiAsk((ask) => setUiAsk(ask));
    const offNotify = window.zion.onUiNotify((n) => {
      pushToast(n);
    });
    return () => {
      offAsk();
      offNotify();
    };
  }, [setUiAsk, pushToast]);
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

// 全局快捷键（Q7/ADR-0005）：Ctrl+P 命令面板 / Ctrl+Shift+S 设置 / Ctrl+Shift+M 模型 / Ctrl+K 项目。
// 与 /hotkeys 速查层同源（ZION_HOTKEYS）；模态弹层打开时忽略（弹层内 Esc/焦点优先）。
function useGlobalHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (useFeed.getState().modal) return; // 模态弹层打开时忽略全局快捷键
      if (e.shiftKey) {
        if (k === 's') {
          e.preventDefault();
          useFeed.getState().openModal('settings');
        } else if (k === 'm') {
          e.preventDefault();
          useFeed.getState().openModal('model-picker');
        }
      } else if (k === 'p') {
        e.preventDefault();
        window.dispatchEvent(new Event('zion:open-palette'));
      } else if (k === 'k') {
        e.preventDefault();
        useFeed.getState().setProjectOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

// 模态弹层宿主（ADR-0005）：store.modal 驱动，同一时刻只开一个；载荷随附或组件自拉。
function ModalHost() {
  const modal = useFeed((s) => s.modal);
  const modalData = useFeed((s) => s.modalData);
  const openModal = useFeed((s) => s.openModal);
  const close = () => openModal(null);
  if (!modal) return null;
  const data = modalData ?? {};
  return (
    <ZionModal
      title={
        modal === 'model-picker' ? '选择模型' : modal === 'settings' ? '设置' : '快捷键'
      }
      subtitle={
        modal === 'model-picker'
          ? 'setModel 落盘会话与 settings，会话恢复时沿用'
          : modal === 'settings'
            ? 'ZION 本地设置'
            : '与主界面快捷键行为一致（ZION_HOTKEYS）'
      }
      onClose={close}
      width={modal === 'model-picker' ? 520 : 440}
    >
      {modal === 'model-picker' && <ModelPicker models={(data.models as ModelOption[] | undefined) ?? null} />}
      {modal === 'settings' && (
        <SettingsPanel currentModel={data.currentModel as string | undefined} providers={data.providers as string[] | undefined} />
      )}
      {modal === 'hotkeys' && <HotkeysPanel />}
    </ZionModal>
  );
}

export default function App() {
  useAgentEvents();
  useSoundFx();
  useGlobalHotkeys();
  const sessionState = useFeed((s) => s.sessionState);
  const sessionTitle = useFeed((s) => s.sessionTitle);
  const sndOn = useFeed((s) => s.sndOn);
  const setSndOn = useFeed((s) => s.setSndOn);
  const decOn = useFeed((s) => s.decOn);
  const setDecOn = useFeed((s) => s.setDecOn);
  const tokenCount = useFeed((s) => s.tokenCount);
  const pushUser = useFeed((s) => s.pushUser);
  const log = useFeed((s) => s.log);
  const applySession = useFeed((s) => s.applySession);
  const [termOpen, setTermOpen] = useState(false);
  const [bootAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => new Date());

  // ---- 侧栏拖拽调宽（原生 pointer，宽度直写 CSS 变量，不触发 React 渲染） ----
  // 常量/函数放模块级（见文件底部）：SIDE_MIN/MAX/DEFAULT/STEP/KEY、clampSide
  const mainRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const applySideWidth = (w: number) => {
    const el = mainRef.current;
    if (!el) return;
    el.style.setProperty('--side-w', `${w}px`);
    resizerRef.current?.setAttribute('aria-valuenow', String(w));
  };
  const persistSideWidth = (w: number) => localStorage.setItem(SIDE_KEY, String(w));
  const currentSideWidth = () => {
    const raw = mainRef.current?.style.getPropertyValue('--side-w');
    const v = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(v) ? Math.round(v) : SIDE_DEFAULT;
  };

  // 启动读回持久化宽度
  useEffect(() => {
    const saved = parseInt(localStorage.getItem(SIDE_KEY) ?? '', 10);
    if (Number.isFinite(saved)) applySideWidth(clampSide(saved));
  }, []);

  const onResizePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: currentSideWidth() };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      applySideWidth(clampSide(d.startW + (ev.clientX - d.startX)));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      persistSideWidth(currentSideWidth());
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onResizeKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = currentSideWidth() - (e.shiftKey ? SIDE_STEP_BIG : SIDE_STEP);
    else if (e.key === 'ArrowRight') next = currentSideWidth() + (e.shiftKey ? SIDE_STEP_BIG : SIDE_STEP);
    else if (e.key === 'Escape') next = SIDE_DEFAULT;
    if (next == null) return;
    e.preventDefault();
    const w = clampSide(next);
    applySideWidth(w);
    persistSideWidth(w);
  };

  const resetSideWidth = () => {
    applySideWidth(SIDE_DEFAULT);
    persistSideWidth(SIDE_DEFAULT);
  };

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
  // 豁免弹层与培育仓操作层：内部输入/按钮完成自身焦点流程，不得被抢焦。
  // 挂 mouseup + 选区检测：mouseup 时若有非折叠选区（拖选/双击选词）→ 跳过归还，
  // 否则 focus(input) 会清掉刚建立的选区（Chromium 聚焦可编辑元素行为）；
  // 不挂 mousedown：按下即抢焦会打断双击选词/单击定位光标。
  useEffect(() => {
    const refocus = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('.ask-mask, .project-panel, .palette, .s-title-edit, .session-pod-actions')) return;
      window.setTimeout(() => {
        const s = document.getSelection();
        if (s && !s.isCollapsed) return; // 存在选区（拖选/选词中）：不抢焦点，保住选中复制
        const el = document.getElementById('cmdline') as HTMLInputElement | null;
        if (el && !el.disabled) el.focus();
      }, 0);
    };
    document.addEventListener('mouseup', refocus);
    return () => document.removeEventListener('mouseup', refocus);
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
    void window.zion?.prompt?.(`读取 ${path}`);
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
      <ModalHost />

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

      <div className="main" ref={mainRef}>
        <Sidebar onSelectFile={selectFile} />
        <div
          className="side-resizer"
          ref={resizerRef}
          role="separator"
          aria-orientation="vertical"
          aria-label="调整侧栏宽度（拖拽或 ←/→，Esc 复位）"
          aria-valuemin={SIDE_MIN}
          aria-valuemax={SIDE_MAX}
          aria-valuenow={SIDE_DEFAULT}
          tabIndex={0}
          onDoubleClick={resetSideWidth}
          onPointerDown={onResizePointerDown}
          onKeyDown={onResizeKeyDown}
        />
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
          <button
            className="st-btn"
            onClick={() => setDecOn(!decOn)}
            title="切换 OPERATOR 消息注入解码动画"
          >
            DEC: {decOn ? 'ON' : 'OFF'}
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

// 侧栏拖拽调宽：min 160 / max 480（或窗口一半，取小）/ 默认 232；localStorage 'zion.sidebar-w' 持久化
const SIDE_MIN = 160;
const SIDE_MAX = 480;
const SIDE_DEFAULT = 232;
const SIDE_STEP = 8;
const SIDE_STEP_BIG = 32;
const SIDE_KEY = 'zion.sidebar-w';
function clampSide(w: number): number {
  const max = Math.max(SIDE_MIN, Math.min(SIDE_MAX, Math.round(window.innerWidth / 2)));
  return Math.max(SIDE_MIN, Math.min(max, Math.round(w)));
}
