import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBody } from '../src/renderer/src/markdown.ts';

test('纯文本无围栏 → 全 t 段', () => {
  assert.deepEqual(parseBody('你好，世界。'), [{ k: 't', v: '你好，世界。' }]);
});

test('行内 code 与【高亮】', () => {
  assert.deepEqual(parseBody('用 `npm test` 跑【全部测试】'), [
    { k: 't', v: '用 ' },
    { k: 'c', v: '`npm test`' },
    { k: 't', v: ' 跑' },
    { k: 'h', v: '【全部测试】' },
  ]);
});

test('三反引号代码块（带语言标签）', () => {
  const text = '内容如下：\n```html\n<!DOCTYPE html>\n<html>\n</html>\n```\n完。';
  assert.deepEqual(parseBody(text), [
    { k: 't', v: '内容如下：' },
    { k: 'f', v: '<!DOCTYPE html>\n<html>\n</html>', lang: 'html' },
    { k: 't', v: '完。' },
  ]);
});

test('代码块内不做行内解析', () => {
  const text = '```\n`not-code` 和 【不高亮】\n```';
  assert.deepEqual(parseBody(text), [{ k: 'f', v: '`not-code` 和 【不高亮】', lang: undefined }]);
});

test('未闭合围栏宽容到文末', () => {
  const text = '```js\nconst a = 1;';
  assert.deepEqual(parseBody(text), [{ k: 'f', v: 'const a = 1;', lang: 'js' }]);
});

test('波浪号围栏 ~~~', () => {
  const text = '~~~\nabc\n~~~';
  assert.deepEqual(parseBody(text), [{ k: 'f', v: 'abc', lang: undefined }]);
});

test('多代码块与文本交错', () => {
  const text = 'A\n```x\n1\n```\nB\n```y\n2\n```\nC';
  assert.deepEqual(parseBody(text), [
    { k: 't', v: 'A' },
    { k: 'f', v: '1', lang: 'x' },
    { k: 't', v: 'B' },
    { k: 'f', v: '2', lang: 'y' },
    { k: 't', v: 'C' },
  ]);
});

test('围栏开行后紧跟闭合（空代码块）', () => {
  assert.deepEqual(parseBody('```\n```'), [{ k: 'f', v: '', lang: undefined }]);
});
