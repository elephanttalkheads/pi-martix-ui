// 会话培育仓纯函数单测（node:test，无框架依赖）
// 用法：node --test scripts/session-pod.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstLineSummary } from '../src/renderer/src/sessionPod.ts';

test('全息摘要取第一条非空行并去除两端空白', () => {
  assert.equal(firstLineSummary('\n  第一条有效摘要  \r\n第二条内容'), '第一条有效摘要');
});

test('全息摘要保留完整首行，不在 JS 中截断', () => {
  const long = '这是一条应交给 CSS 根据侧栏宽度自适应省略的完整会话摘要';
  assert.equal(firstLineSummary(long), long);
});

test('全息摘要为空时显示真实空态', () => {
  assert.equal(firstLineSummary(), '尚无会话内容');
  assert.equal(firstLineSummary('  \n \r\n  '), '尚无会话内容');
});
