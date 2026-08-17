// 视觉验证：npm run dev 等价路径（vite dev + electron --dev）+ CDP 截图。
// 真实 prompt（编辑任务）→ 抓流式中间态（字形蛾/线圈呼吸/脑波）与闭环态（烧录 diff/校验环/封存带）。
// 用法：node scripts/e2e-visual.mjs [输出目录]
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// 9222 常落 Windows 保留端口段（见 smoke-cdp.mjs 注释），沿用 9633
const PORT = 9633;
const VITE_PORT = 5173;
const APP_DIR = process.cwd();
const OUT_DIR = process.argv[2] ?? 'graphify-out/2026-08-17';
const PROMPT_TEXT = '在 E:/pi-martix-ui/.tmp-visual 下新建 hello.txt，写入三行：alpha、beta、gamma';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
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

let vite; let child;
try {
  mkdirSync(OUT_DIR, { recursive: true });
  const electronBin = execSync('node -e "console.log(require(\'electron\'))"', { encoding: 'utf8' }).trim();

  vite = spawn('npx', ['vite', '--config', 'vite.config.mjs', '--port', String(VITE_PORT)], {
    cwd: APP_DIR, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
  });
  // 等 vite 就绪
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://127.0.0.1:${VITE_PORT}/`); break; } catch { await sleep(500); }
  }

  child = spawn(electronBin, ['.', '--dev', `--remote-debugging-port=${PORT}`], {
    cwd: APP_DIR, stdio: ['ignore', 'pipe', 'pipe'],
  });

  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let seq = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  };
  ws.onclose = () => { for (const res of pending.values()) res(undefined); pending.clear(); };
  const call = (method, params = {}) => new Promise((res) => {
    const id = ++seq;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.delete(id)) res(undefined); }, 15000); // 防挂：超时按失败处理
  });
  const evalJs = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };
  const shot = async (name) => {
    const r = await call('Page.captureScreenshot', { format: 'png' });
    if (r?.data) writeFileSync(join(OUT_DIR, name), Buffer.from(r.data, 'base64'));
    console.log('SHOT:', name);
  };

  // 等渲染层挂载
  for (let i = 0; i < 40; i++) {
    if (await evalJs(`!!document.querySelector('#rain')`)) break;
    await sleep(500);
  }
  console.log('bridge:', await evalJs(`!!window.zion`));

  // 新开一个干净会话（避免混入历史会话内容）
  await evalJs(`(async () => {
    const input = document.querySelector('#cmdline');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '/new');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return true;
  })()`);
  await sleep(1500);

  // 走真实输入路径发 prompt（编辑任务 → write 工具 + 蠕虫 + diff 卡全链）
  await evalJs(`(async () => {
    const input = document.querySelector('#cmdline');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(PROMPT_TEXT)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return true;
  })()`);

  // 流式期间轮询抓拍（字形蛾/继电器线圈/脑波/磁带纹活动轨）——agent 多 LLM turn 间会短暂 READY，只在非 READY 拍
  let streamShots = 0;
  for (let i = 0; i < 60 && streamShots < 3; i++) {
    await sleep(800);
    const st = await evalJs(`document.getElementById('st-state')?.textContent`);
    if (st === 'READY') {
      if (await evalJs(`!!document.querySelector('.settle .tape')`)) break; // 真闭环
      continue;
    }
    streamShots++;
    console.log(`stream#${streamShots} state=${st} caret=${await evalJs(`!!document.querySelector('.caret')`)} coil=${await evalJs(`!!document.querySelector('.unit.run')`)}`);
    await shot(`visual-stream-${streamShots}.png`);
  }

  // 等闭环（READY + 结算行出现），补拍终态
  for (let i = 0; i < 40; i++) {
    const done = await evalJs(`document.getElementById('st-state')?.textContent === 'READY' && !!document.querySelector('.settle .tape')`);
    if (done) break;
    await sleep(1500);
  }
  await sleep(4500); // 烧录 + 校验环 + 封存带播完
  const summary = await evalJs(`JSON.stringify((() => {
    const turns = [...document.querySelectorAll('.turn-agent')];
    const t = turns[turns.length - 1];
    if (!t) return { turn: false };
    return {
      turn: true,
      think: !!t.querySelector('.think .eeg'),
      thinkLines: t.querySelectorAll('.think-body .tl').length,
      unit: t.querySelector('.unit')?.className ?? null,
      dur: t.querySelector('.dur')?.textContent ?? null,
      diff: !!t.querySelector('.diff'),
      rows: t.querySelectorAll('.dl').length,
      ring: !!t.querySelector('.ring rect'),
      settle: t.querySelector('.settle .tape')?.textContent ?? null,
      eol: !!t.querySelector('.settle .eol'),
      rail: !!t.querySelector('.rail.settled .seal'),
      historical: t.classList.contains('historical'),
    };
  })())`);
  console.log('FINAL:', summary);
  await shot('visual-settled.png');

  ws.close();
} finally {
  if (child?.pid) { try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' }); } catch { /* 已退出 */ } }
  if (vite?.pid) { try { execSync(`taskkill /PID ${vite.pid} /T /F`, { stdio: 'ignore' }); } catch { /* 已退出 */ } }
}
console.log('visual done');
