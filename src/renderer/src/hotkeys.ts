// 全局快捷键常量表（ZION）：实现与 /hotkeys 速查层共用同一数据源，保证展示与行为一致（Q7）。
// 注册在 App.tsx（window keydown，弹层打开时豁免——ZionModal 的 Esc 捕获优先级更高）。
export interface HotkeyDef {
  /** 组合键（如 ['Ctrl', 'P']） */
  keys: string[];
  label: string;
}

export const ZION_HOTKEYS: HotkeyDef[] = [
  { keys: ['Ctrl', 'P'], label: '打开命令面板' },
  { keys: ['Ctrl', 'Shift', 'S'], label: '打开设置面板' },
  { keys: ['Ctrl', 'Shift', 'M'], label: '切换模型' },
  { keys: ['Ctrl', 'K'], label: '切换项目' },
];

export function formatHotkey(h: HotkeyDef): string {
  return h.keys.join(' + ');
}
