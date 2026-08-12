// 冒烟验证：启动 electron（dist 产物）→ CDP 检查桥注入 + 渲染层状态
// 用法：node scripts/smoke-cdp.mjs
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

const PORT = 9222;
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

let child;
try {
  // Windows: spawn 需可执行文件本身，npx 是 .cmd —— 直接取 electron 包导出的二进制路径
  const electronBin = execSync('node -e "console.log(require(\'electron\'))"', { encoding: 'utf8' }).trim();
  child = spawn(electronBin, ['.', `--remote-debugging-port=${PORT}`], {
    cwd: APP_DIR, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let mainLog = '';
  child.stdout.on('data', (d) => { mainLog += d; });
  child.stderr.on('data', (d) => { mainLog += d; });

  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
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

  // 等页面加载
  await sleep(2500);

  const r1 = await call('Runtime.evaluate', {
    expression: `JSON.stringify({ zion: !!window.zion, title: document.title, root: !!document.querySelector('#root'), feedEmpty: document.querySelector('.feed-empty')?.textContent || null, hasRain: !!document.querySelector('#rain'), hasScanlines: !!document.querySelector('.scanlines'), hasSignal: !!document.querySelector('#signal'), hasSidebar: !!document.querySelector('.sidebar'), hasCore: !!document.querySelector('#core') })`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('RENDER:', r1.result.value);

  const r2 = await call('Runtime.evaluate', {
    expression: `window.zion.ping()`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('PING:', JSON.stringify(r2.result.value));

  // 检查主进程日志里的桥注入标记
  await sleep(500);
  console.log('MAINLOG has bridge ok:', /preload bridge injected: true/.test(mainLog));
  if (!/preload bridge injected: true/.test(mainLog)) console.log('MAINLOG:', mainLog.slice(-500));

  ws.close();
} finally {
  if (child) child.kill();
}
console.log('smoke done');
