// 会话脑机链路纯函数单测（node:test，无 DOM/React 依赖）
// 用法：node --test scripts/neural-cable.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  imageAnchor,
  neuralSignatureForSession,
  POD_RECEIVER_ANCHOR,
  routeNeuralCable,
  stableSessionHash,
} from '../src/renderer/src/neuralCable.ts';

test('会话 id 稳定映射到六种神经签名', () => {
  const first = neuralSignatureForSession('session-alpha');
  assert.equal(neuralSignatureForSession('session-alpha').id, first.id);
  assert.ok(first.id >= 1 && first.id <= 6);
  assert.notEqual(stableSessionHash('session-alpha'), stableSessionHash('session-beta'));
});

test('素材归一化锚点转换为 Sidebar 本地坐标', () => {
  const point = imageAnchor(
    { left: 30, top: 60, width: 1672, height: 941 },
    { left: 10, top: 20 },
    POD_RECEIVER_ANCHOR,
  );
  assert.equal(point.x, 179);
  assert.equal(point.y, 596);
});

test('响应式曲线固定从测量锚点起止且不产生无效数值', () => {
  const path = routeNeuralCable({ x: 80, y: 110 }, { x: 28, y: 320 }, 232, 1);
  assert.match(path, /^M 80\.00 110\.00/);
  assert.match(path, /28\.00 320\.00$/);
  assert.doesNotMatch(path, /NaN|Infinity/);
  assert.equal(path, routeNeuralCable({ x: 80, y: 110 }, { x: 28, y: 320 }, 232, 1));
});
