// 会话标题推导纯函数单测（node:test，无框架依赖）
// 用法：node --test scripts/derive-title.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSessionTitle } from '../src/renderer/src/title.ts';

test('name 优先于 firstMessage', () => {
  assert.equal(deriveSessionTitle('我的会话', '任意长文本……', 'abc'), '我的会话');
  assert.equal(deriveSessionTitle('  空格名  ', '任意', 'abc'), '空格名');
});

test('长文本：22 字符截断 + 省略号，无引号断裂', () => {
  const long = '为"D:zion-workspace\\project" 修复会话恢复时的渲染问题，涉及 store 状态机与事件流';
  const t = deriveSessionTitle(undefined, long, 'abc');
  assert.ok(!t.includes('"'), `不应含断裂引号: ${t}`);
  assert.ok(!t.includes('zion-workspace'), `不应含路径残尾: ${t}`);
  assert.equal(t.length, 23); // 22 + …
  assert.ok(t.endsWith('…'));
});

test('多行 prompt：取首行完整句', () => {
  const multi = '优化会话恢复的时序问题\n第二步：补充事件流测试\n第三步：回归验证';
  assert.equal(deriveSessionTitle(undefined, multi, 'abc'), '优化会话恢复的时序问题');
});

test('包裹引号与前导符号清理', () => {
  assert.equal(deriveSessionTitle(undefined, '"读 README 并总结"', 'abc'), '读 README 并总结');
  assert.equal(deriveSessionTitle(undefined, '「重构状态机」', 'abc'), '重构状态机');
  assert.equal(deriveSessionTitle(undefined, '- 修复数字雨覆盖 bug', 'abc'), '修复数字雨覆盖 bug');
  assert.equal(deriveSessionTitle(undefined, '> 按 v4 规范收敛 UI', 'abc'), '按 v4 规范收敛 UI');
});

test('空文本/无 name：会话短码兜底', () => {
  assert.equal(deriveSessionTitle(undefined, '', 'abcd1234'), '会话 abcd');
  assert.equal(deriveSessionTitle(undefined, undefined, ''), '会话 ----');
  assert.equal(deriveSessionTitle('', '   ', 'xyz'), '会话 xyz');
});
