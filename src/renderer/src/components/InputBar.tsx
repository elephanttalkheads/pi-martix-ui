// 输入栏 —— v4 规格 §5.9：快捷指令按钮 + ❯ 提示符 + 切角发送按钮
// 生成中按钮切换为「中断」（红色系）；/clear 本地清空 feed；其余指令原样发真实 prompt。
// 命令面板：输入 / 弹出本机全部 skills + 命令（主进程聚合扫描），↑↓/Enter/Tab/Esc 操作，
// 选中 skill 插入「运行技能 X：」、命令插入 /name（执行语义属宿主 TUI 层，此处仅插入文本）。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFeed } from '../store';
import { SND } from './SoundFx';
import type { CommandItem } from '../../../shared/protocol';

const QUICK_CMDS = ['/status 系统状态', '/trace 回放链路', '检索记忆库', '扫描项目风险'];

export default function InputBar() {
  const [text, setText] = useState('');
  const [items, setItems] = useState<CommandItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionState = useFeed((s) => s.sessionState);
  const sessionTitle = useFeed((s) => s.sessionTitle);
  const busy = sessionState !== 'READY';
  const cancelling = sessionState === 'CANCELLING';
  const sendDisabled = busy || text.trim() === '';
  const streaming = sessionState === 'STREAMING';

  // 启动预取命令面板数据（主进程聚合扫描一次）
  useEffect(() => {
    let alive = true;
    window.zion.listCommands().then((list) => alive && setItems(list)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const query = text.startsWith('/') ? text.slice(1) : '';
  const filtered = useMemo(() => {
    let list = items;
    if (query) {
      const q = query.toLowerCase();
      list = items.filter(
        (i) => i.name.toLowerCase().startsWith(q) || i.name.toLowerCase().includes(q),
      );
    }
    // 命令优先 + 名称字母序（面板截断时保证命令可见）
    return [...list].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'command' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, query]);

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

  /** 选中条目：skill → 插入运行模板；command → 插入 /name */
  const insert = (item: CommandItem) => {
    setText(item.kind === 'skill' ? `运行技能 ${item.name}：` : `/${item.name}`);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onInputChange = (v: string) => {
    setText(v);
    const shouldOpen = v.startsWith('/') && v.length <= 48;
    setOpen(shouldOpen);
    if (shouldOpen) setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insert(filtered[active]);
        return;
      }
    }
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (streaming || cancelling) void abort();
      else void send();
    }
  };

  return (
    <div className="inputbar">
      {open && (
        <div className="palette" role="listbox" aria-label="命令面板">
          {filtered.length === 0 ? (
            <div className="palette-empty">无匹配 skill / 命令</div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.kind + ':' + item.name}
                role="option"
                aria-selected={idx === active}
                className={`palette-row${idx === active ? ' active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(item)}
                onMouseEnter={() => setActive(idx)}
              >
                <span className={`p-kind ${item.kind}`}>{item.kind === 'skill' ? 'S' : '/'}</span>
                <span className="p-name">{item.name}</span>
                <span className="p-desc">{item.description}</span>
                <span className="p-src">{item.source}</span>
              </div>
            ))
          )}
        </div>
      )}
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
          ref={inputRef}
          value={text}
          placeholder={`输入 / 查看 skills 与命令 · 指令给 ${sessionTitle} …`}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
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
      <div className="input-hint">Enter 发送 · 输入 / 弹出 skills+命令 · /clear 清空 · 生成中按钮切换为「中断」</div>
    </div>
  );
}
