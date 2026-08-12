// UI 桥核心单测（node:test，无 electron）
// 用法：node --test scripts/uibridge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUiBridge } from '../src/main/uibridge.mjs';

test('confirm：派发 + handleAnswer 回传 true', async () => {
  const asks = [];
  const b = createUiBridge({ onAsk: (a) => asks.push(a) });
  const p = b.confirm('允许?', '访问项目资源');
  assert.equal(asks.length, 1);
  assert.equal(asks[0].kind, 'confirm');
  assert.equal(asks[0].title, '允许?');
  const handled = b.handleAnswer(asks[0].id, true);
  assert.equal(handled, true);
  assert.equal(await p, true);
  assert.equal(b.pendingCount(), 0);
});

test('input：placeholder 透传 + 回传字符串', async () => {
  const asks = [];
  const b = createUiBridge({ onAsk: (a) => asks.push(a) });
  const p = b.input('输入路径', 'D:\\x');
  assert.equal(asks[0].message, 'D:\\x');
  b.handleAnswer(asks[0].id, 'D:\\y');
  assert.equal(await p, 'D:\\y');
});

test('select：选项透传 + 取消（undefined）', async () => {
  const asks = [];
  const b = createUiBridge({ onAsk: (a) => asks.push(a) });
  const p = b.select('选择', ['A', 'B']);
  assert.deepEqual(asks[0].options, ['A', 'B']);
  b.handleAnswer(asks[0].id, undefined);
  assert.equal(await p, undefined);
});

test('timeout：超时自动 resolve undefined 且不悬挂', async () => {
  const asks = [];
  const b = createUiBridge({ onAsk: (a) => asks.push(a) });
  const p = b.confirm('超时', 'x', { timeout: 50 });
  assert.equal(await p, undefined);
  assert.equal(b.pendingCount(), 0);
});

test('signal：abort 后 resolve undefined；已 abort 立即 resolve', async () => {
  const ac = new AbortController();
  const asks = [];
  const b = createUiBridge({ onAsk: (a) => asks.push(a) });
  const p = b.confirm('a', 'b', { signal: ac.signal });
  ac.abort();
  assert.equal(await p, undefined);
  const ac2 = new AbortController();
  ac2.abort();
  const p2 = b.confirm('c', 'd', { signal: ac2.signal });
  assert.equal(await p2, undefined);
});

test('notify：单向派发', () => {
  const notes = [];
  const b = createUiBridge({ onNotify: (n) => notes.push(n) });
  b.notify('完成', 'ok');
  assert.deepEqual(notes[0], { message: '完成', type: 'ok' });
});

test('重复应答安全：二次 handleAnswer 返回 false', async () => {
  const asks = [];
  const b = createUiBridge({ onAsk: (a) => asks.push(a) });
  const p = b.confirm('x', 'y');
  assert.equal(b.handleAnswer(asks[0].id, true), true);
  assert.equal(b.handleAnswer(asks[0].id, false), false);
  assert.equal(await p, true);
});
