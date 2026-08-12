// 工具参数格式化纯函数单测（node:test，无框架依赖）
// 用法：node --test scripts/toolfmt.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatToolArgs, toolExpandTitle } from '../src/renderer/src/toolfmt.ts';

test('bash：command 全文（不截断）', () => {
  const long = 'echo ' + 'a'.repeat(300);
  assert.equal(formatToolArgs('bash', { command: long }), long);
});

test('batch_execute：commands 数组逐行拼接', () => {
  assert.equal(
    formatToolArgs('batch_execute', { commands: [{ command: 'ls' }, { command: 'cat x' }] }),
    'ls\ncat x'
  );
});

test('edit：JSON 结构但截断上限内', () => {
  const args = { file: 'a.ts', edits: [{ type: 'replace', oldText: 'x', newText: 'y' }] };
  const out = formatToolArgs('edit', args);
  assert.ok(out.includes('a.ts'));
  assert.ok(out.length <= 2000);
});

test('其他/未知工具：JSON 兜底', () => {
  assert.ok(formatToolArgs('read', { path: 'p' }).includes('p'));
  assert.ok(formatToolArgs('weird_tool', { question: 'q' }).includes('q'));
});

test('toolExpandTitle：file/path 优先，缺省工具名', () => {
  assert.equal(toolExpandTitle('edit', { file: 'src/x.ts' }), 'edit → src/x.ts');
  assert.equal(toolExpandTitle('read', { path: 'y.md' }), 'read → y.md');
  assert.equal(toolExpandTitle('bash', { command: 'ls' }), 'bash');
});

test('空 args/undefined 安全', () => {
  assert.equal(formatToolArgs('bash', undefined), '{}');
  assert.equal(toolExpandTitle('x', undefined), 'x');
});
