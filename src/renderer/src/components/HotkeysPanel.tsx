// HotkeysPanel —— /hotkeys 快捷键速查（Q7：常量表驱动，与 App.tsx 实际注册同源）。
import { ZION_HOTKEYS, formatHotkey } from '../hotkeys';

export default function HotkeysPanel() {
  return (
    <div className="hk-list">
      {ZION_HOTKEYS.map((h) => (
        <div key={formatHotkey(h)} className="hk-row">
          <kbd className="hk-keys">{formatHotkey(h)}</kbd>
          <span className="hk-label">{h.label}</span>
        </div>
      ))}
    </div>
  );
}
