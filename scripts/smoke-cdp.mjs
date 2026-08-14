// 冒烟验证：启动 electron（dist 产物）→ CDP 检查桥注入 + 渲染层状态
// 用法：node scripts/smoke-cdp.mjs
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

// 注意：9222 可能落入 Windows 动态保留端口段（netsh … show excludedportrange，曾实测 9220–9319 被保留），
// 故用 9633；若再遇 bind 失败先查保留段。
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

  // 等渲染层挂载（冷启动快慢不定，轮询 #rain 代替定长等待）
  for (let i = 0; i < 30; i++) {
    const r = await call('Runtime.evaluate', {
      expression: `!!document.querySelector('#rain')`,
      returnByValue: true,
    });
    if (r.result.value) break;
    await sleep(500);
  }

  const r1 = await call('Runtime.evaluate', {
    expression: `JSON.stringify({ zion: !!window.zion, title: document.title, root: !!document.querySelector('#root'), feedEmpty: document.querySelector('.feed-empty')?.textContent || null, hasRain: !!document.querySelector('#rain'), hasScanlines: !!document.querySelector('.scanlines'), hasSignal: !!document.querySelector('#signal'), hasSidebar: !!document.querySelector('.sidebar'), hasNeoAvatar: !!document.querySelector('.neo-avatar') })`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('RENDER:', r1.result.value);

  const r2 = await call('Runtime.evaluate', {
    expression: `window.zion.ping()`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('PING:', JSON.stringify(r2.result.value));

  // 命令执行链路（#24）：runCommand 通道 + 错误路径 + 命令清单 argumentHint
  const r3 = await call('Runtime.evaluate', {
    expression: `window.zion.runCommand('nosuch')`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('RUNCMD unknown:', JSON.stringify(r3.result.value));
  const r4 = await call('Runtime.evaluate', {
    expression: `window.zion.runCommand('session').then(r => ({ ok: r.ok, kind: r.kind }))`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('RUNCMD session:', JSON.stringify(r4.result.value));
  const r5 = await call('Runtime.evaluate', {
    expression: `window.zion.listCommands().then(l => l.filter(i => i.kind === 'command').length)`,
    returnByValue: true, awaitPromise: true,
  });
  console.log('RUNCMD count:', JSON.stringify(r5.result.value));

  // 检查主进程日志里的桥注入标记
  await sleep(500);
  console.log('MAINLOG has bridge ok:', /preload bridge injected: true/.test(mainLog));
  if (!/preload bridge injected: true/.test(mainLog)) console.log('MAINLOG:', mainLog.slice(-500));

  // 断言：桥注入 + runCommand 错误路径正确 + session 命令真实执行
  const bridgeOk = /preload bridge injected: true/.test(mainLog);
  const unknownOk = r3.result.value?.ok === false && /未知命令/.test(r3.result.value?.message ?? '');
  const sessionOk = r4.result.value?.ok === true && r4.result.value?.kind === 'ok';
  const countOk = r5.result.value >= 14; // 内置 14 + 扩展
  if (!bridgeOk || !unknownOk || !sessionOk || !countOk) {
    console.error('SMOKE FAIL: bridge=' + bridgeOk + ' unknown=' + unknownOk + ' session=' + sessionOk + ' count=' + countOk);
    process.exitCode = 1;
  } else {
    console.log('smoke run-command assertions ok');
  }

  ws.close();
} finally {
  // Windows 下 child.kill() 只杀父进程，electron 子进程树会残留——用 taskkill /T 杀整棵树
  if (child?.pid) {
    try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' }); } catch { /* 已退出 */ }
  }
}
console.log('smoke done');
