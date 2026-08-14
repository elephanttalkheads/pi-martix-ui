export type Point = { x: number; y: number };

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PodCableTarget = {
  root: HTMLElement;
  closedImage: HTMLImageElement;
  openImage: HTMLImageElement;
};

export type NeuralSignature = {
  id: number;
  glyphs: string;
  ringFractions: readonly number[];
  staticOffset: number;
};

/** Neo 后脑勺接线口：OpenDesign 最新 256×256 帧的 (82, 114)。 */
export const NEO_SOURCE_ANCHOR = [82 / 256, 114 / 256] as const;

/** 培育仓左侧机械柱：1672×941 横向帧的 (159, 556)。 */
export const POD_RECEIVER_ANCHOR = [159 / 1672, 556 / 941] as const;

import { MATRIX_CHARS } from './matrixGlyphs';

const GLYPHS = MATRIX_CHARS;

const SIGNATURES: readonly NeuralSignature[] = [
  { id: 1, glyphs: `${GLYPHS}01`, ringFractions: [0.28], staticOffset: 1 },
  { id: 2, glyphs: `${GLYPHS.slice(5)}${GLYPHS.slice(0, 5)}02`, ringFractions: [0.34, 0.72], staticOffset: 5 },
  { id: 3, glyphs: `${GLYPHS.slice(11)}${GLYPHS.slice(0, 11)}03`, ringFractions: [0.42], staticOffset: 9 },
  { id: 4, glyphs: `${GLYPHS.slice(17)}${GLYPHS.slice(0, 17)}04`, ringFractions: [0.24, 0.64], staticOffset: 13 },
  { id: 5, glyphs: `${GLYPHS.slice(23)}${GLYPHS.slice(0, 23)}05`, ringFractions: [0.52], staticOffset: 17 },
  { id: 6, glyphs: `${GLYPHS.slice(29)}${GLYPHS.slice(0, 29)}06`, ringFractions: [0.38, 0.78], staticOffset: 21 },
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** FNV-1a：只用于稳定视觉分配，不承载安全语义。 */
export function stableSessionHash(sessionId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash ^= sessionId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function neuralSignatureForSession(sessionId: string): NeuralSignature {
  return SIGNATURES[stableSessionHash(sessionId) % SIGNATURES.length];
}

export function imageAnchor(
  imageRect: RectLike,
  sidebarRect: Pick<RectLike, 'left' | 'top'>,
  normalizedAnchor: readonly [number, number],
): Point {
  return {
    x: imageRect.left - sidebarRect.left + imageRect.width * normalizedAnchor[0],
    y: imageRect.top - sidebarRect.top + imageRect.height * normalizedAnchor[1],
  };
}

/**
 * 用 Sidebar 本地坐标生成可缩放曲线。前三段把线路从 Neo 后脑勺导向左侧总线，
 * 末段短距离接入培育仓左侧机械柱，避免素材缩放时使用固定像素终点。
 */
export function routeNeuralCable(
  source: Point,
  target: Point,
  sidebarWidth: number,
  lane: number,
): string {
  const safeLane = clamp(Math.round(lane), 0, 2);
  const busX = clamp(sidebarWidth * 0.032 + safeLane * 3, 7, 23);
  const sourceExitX = Math.max(busX + 18, source.x - clamp(sidebarWidth * 0.055, 9, 22));
  const deltaY = Math.max(0, target.y - source.y);
  const bendY = source.y + clamp(deltaY * 0.22, 30, 68);
  const targetLead = clamp(sidebarWidth * 0.045, 8, 20);
  const targetEntryX = Math.max(busX + 5, target.x - targetLead);

  return [
    `M ${source.x.toFixed(2)} ${source.y.toFixed(2)}`,
    `C ${(source.x - 8).toFixed(2)} ${source.y.toFixed(2)}, ${sourceExitX.toFixed(2)} ${(source.y + 2).toFixed(2)}, ${sourceExitX.toFixed(2)} ${(source.y + safeLane * 1.5).toFixed(2)}`,
    `C ${busX.toFixed(2)} ${bendY.toFixed(2)}, ${busX.toFixed(2)} ${(target.y - 28).toFixed(2)}, ${targetEntryX.toFixed(2)} ${target.y.toFixed(2)}`,
    `C ${(targetEntryX + 7).toFixed(2)} ${target.y.toFixed(2)}, ${(target.x - 5).toFixed(2)} ${target.y.toFixed(2)}, ${target.x.toFixed(2)} ${target.y.toFixed(2)}`,
  ].join(' ');
}
