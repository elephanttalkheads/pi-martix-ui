// SettingsPanel —— /settings 收纳式设置面板（Q4/Q10）：
// SND/DEC 开关（renderer 侧 localStorage）+ 当前模型只读行（点击跳模型选择器）+ 已认证 provider 只读行。
// 主进程 runCommand('settings') 附 currentModel / providers 载荷；快捷键路径无载荷 → 自拉。
import { useEffect, useState } from 'react';
import { useFeed } from '../store';

export default function SettingsPanel({
  currentModel: initialModel,
  providers: initialProviders,
}: {
  currentModel?: string;
  providers?: string[];
}) {
  const sndOn = useFeed((s) => s.sndOn);
  const decOn = useFeed((s) => s.decOn);
  const setSndOn = useFeed((s) => s.setSndOn);
  const setDecOn = useFeed((s) => s.setDecOn);
  const openModal = useFeed((s) => s.openModal);
  const [currentModel, setCurrentModel] = useState<string | undefined>(initialModel);
  const [providers, setProviders] = useState<string[] | undefined>(initialProviders);

  // 无载荷（快捷键路径）→ 自拉当前模型与认证 provider
  useEffect(() => {
    if (currentModel !== undefined && providers !== undefined) return;
    let alive = true;
    window.zion
      ?.runCommand?.('settings')
      ?.then((r) => {
        if (!alive || !r.ok || !r.data) return;
        if (typeof r.data.currentModel === 'string') setCurrentModel(r.data.currentModel);
        if (Array.isArray(r.data.providers)) setProviders(r.data.providers as string[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentModel, providers]);

  return (
    <div className="sp-body">
      <section className="sp-section">
        <h3 className="sp-h">氛围</h3>
        <label className="sp-row">
          <span className="sp-name">SND · UI 音效</span>
          <input
            type="checkbox"
            checked={sndOn}
            onChange={(e) => setSndOn(e.target.checked)}
            className="sp-check"
          />
        </label>
        <label className="sp-row">
          <span className="sp-name">DEC · 注入解码动画</span>
          <input
            type="checkbox"
            checked={decOn}
            onChange={(e) => setDecOn(e.target.checked)}
            className="sp-check"
          />
        </label>
      </section>
      <section className="sp-section">
        <h3 className="sp-h">模型</h3>
        <button
          className="sp-row sp-click"
          onClick={() => openModal('model-picker')}
          title="打开模型选择器"
        >
          <span className="sp-name">当前模型</span>
          <span className="sp-val">{currentModel ?? '—'}</span>
        </button>
      </section>
      <section className="sp-section">
        <h3 className="sp-h">认证</h3>
        <div className="sp-row">
          <span className="sp-name">已登录 provider</span>
          <span className="sp-val">{providers && providers.length ? providers.join(' · ') : '无'}</span>
        </div>
        <p className="sp-hint">登录/登出由 pi auth 管理（~/.pi/agent/auth.json）</p>
      </section>
    </div>
  );
}
