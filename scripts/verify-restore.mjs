// 会话历史全量恢复验证（真实会话）：
// Step A 数据层——listSessions → 逐个 switchSession 检查 items 含 tool block（验证 main 侧 historyFromSession 全量提取）
// Step B 渲染层——切到含工具的会话后 location.reload()（main 进程存活、currentSession 指针保留），
//         走重启恢复路径 get-current → applySession，断言工具卡/diff 卡/思考块进 DOM 且全部 historical 终态
// 前置：dist-renderer/dist-main 已构建（npm run smoke 会先构建）；用法：node scripts/verify-restore.mjs
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

// 9633 避开 Windows 动态保留端口段（见 smoke-cdp.mjs 注释）
const PORT = 9633;
const APP_DIR = process.cwd();

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('CDP 未就绪');
}

async function connect() {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  };
  const call = (method, params = {}) => new Promise((res) => {
    const id = ++seq;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { ws, call };
}

async function waitRain(call) {
  for (let i = 0; i < 30; i++) {
    const r = await call('Runtime.evaluate', { expression: `!!document.querySelector('#rain')`, returnByValue: true });
    if (r.result.value) return;
    await sleep(500);
  }
  throw new Error('渲染层未挂载');
}

let child;
try {
  const electronBin = execSync('node -e "console.log(require(\'electron\'))"', { encoding: 'utf8' }).trim();
  child = spawn(electronBin, ['.', `--remote-debugging-port=${PORT}`], {
    cwd: APP_DIR, stdio: ['ignore', 'pipe', 'pipe'],
  });

  let { ws, call } = await connect();
  await waitRain(call);

  // Step A：数据层——找含工具调用的真实会话（含 diff 数据的优先），切到它
  const rA = await call('Runtime.evaluate', {
    expression: `(async () => {
      const list = await window.zion.listSessions();
      let best = null;
      for (const s of list) {
        try {
          const r = await window.zion.switchSession(s.id);
          const blocks = (r.items ?? []).flatMap((i) => (i.role === 'agent' ? i.blocks : []));
          const tools = blocks.filter((b) => b.kind === 'tool');
          if (!tools.length) continue;
          const edits = tools.filter((b) => b.result !== undefined || (b.args && (b.args.edits || b.args.content || b.args.patch)));
          const thinks = blocks.filter((b) => b.kind === 'thinking');
          const score = tools.length + edits.length * 100;
          if (!best || score > best.score) {
            best = { id: s.id, score, tools: tools.length, edits: edits.length, thinks: thinks.length,
                     names: tools.slice(0, 6).map((t) => t.toolName),
                     withDur: tools.filter((t) => typeof t.dur === 'number').length };
          }
        } catch { /* 内存未落盘会话（path 空）等不可切条目跳过 */ }
      }
      if (best) await window.zion.switchSession(best.id);
      return { sessions: list.length, best };
    })()`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('SCAN:', JSON.stringify(rA.result.value));
  const best = rA.result.value?.best;
  if (!best) {
    console.error('VERIFY FAIL: 没有找到含工具调用的历史会话');
    process.exitCode = 1;
  } else {
    // Step B：reload 走重启恢复路径（main 存活、currentSession 指针保留）
    await call('Runtime.evaluate', { expression: 'location.reload()' });
    await sleep(1500);
    ws.close();
    ({ ws, call } = await connect());
    await waitRain(call);
    await sleep(800); // 等 applySession 渲染
    const rB = await call('Runtime.evaluate', {
      expression: `JSON.stringify({
        turns: document.querySelectorAll('.turn-agent').length,
        historical: document.querySelectorAll('.turn-agent.historical').length,
        trace: document.querySelectorAll('.trace.track').length,
        diff: document.querySelectorAll('.diff').length,
        think: document.querySelectorAll('details.think').length,
        caret: document.querySelectorAll('.caret').length,
        dash: [...document.querySelectorAll('.trace .dur')].filter((d) => d.textContent === '—').length,
      })`,
      returnByValue: true, awaitPromise: true,
    });
    console.log('RESTORED:', rB.result.value);
    const d = JSON.parse(rB.result.value);
    const traceOk = d.trace >= best.tools || d.trace > 0;
    const diffOk = best.edits === 0 || d.diff > 0;
    const thinkOk = best.thinks === 0 || d.think > 0;
    const historicalOk = d.turns > 0 && d.historical === d.turns;
    const caretOk = d.caret === 0;
    if (!traceOk || !diffOk || !thinkOk || !historicalOk || !caretOk) {
      console.error(`VERIFY FAIL: trace=${traceOk} diff=${diffOk} think=${thinkOk} historical=${historicalOk} caret=${caretOk}`);
      process.exitCode = 1;
    } else {
      console.log('verify-restore assertions ok');
    }
  }
  ws.close();
} finally {
  // Windows 下 child.kill() 只杀父进程——taskkill /T 杀整棵树
  if (child?.pid) {
    try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' }); } catch { /* 已退出 */ }
  }
}
console.log('verify-restore done');
