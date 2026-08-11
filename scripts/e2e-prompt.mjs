// 真实 prompt E2E：electron → CDP → window.zion.prompt('...') → 事件流 → feed
import { spawn, execSync } from 'node:child_process';

const PORT = 9223;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    await sleep(500);
  }
  throw new Error('CDP 未就绪');
}

let child;
try {
  const electronBin = execSync('node -e "console.log(require(\'electron\'))"', { encoding: 'utf8' }).trim();
  child = spawn(electronBin, ['.', `--remote-debugging-port=${PORT}`], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
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

  await sleep(2500);

  const t0 = Date.now();
  const r = await call('Runtime.evaluate', {
    expression: `window.zion.prompt('用一句话回答：1+1等于几？不要用工具。')`,
    returnByValue: true, awaitPromise: true,
  });
  const stopReason = r.result?.value ?? r.result?.description;
  console.log(`PROMPT DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s stopReason=`, JSON.stringify(stopReason));

  await sleep(800); // 等事件流消化
  const r2 = await call('Runtime.evaluate', {
    expression: `(() => {
      const els = [...document.querySelectorAll('.msg.agent')];
      return JSON.stringify({ assistantCount: els.length, lastText: els.at(-1)?.querySelector('.msg-body')?.textContent?.slice(0, 200) || null, toolRows: document.querySelectorAll('.trace').length });
    })()`,
    returnByValue: true,
  });
  console.log('FEED:', r2.result.value);
  ws.close();
} finally {
  if (child) child.kill();
}
console.log('e2e done');
