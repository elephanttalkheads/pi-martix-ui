// Neo 头像 —— 侧栏顶部像素头像（闭嘴/张嘴两帧叠加，class 切换）。
// 张嘴仅由蠕虫释放驱动：store.wormActive > 0（releaseWorm 开始 +1、done -1）；
// 释放瞬间带 700ms 脉冲（is-burst）。REDUCED 下张嘴不循环切帧（styles.css 媒体查询）。
import type { Ref } from 'react';
import { useFeed } from '../store';
import { NEO_SOURCE_ANCHOR } from '../neuralCable';
import neoIdle from '../assets/neo-avatar/neo-idle.png';
import neoTalking from '../assets/neo-avatar/neo-talking.png';
import neuralJack from '../assets/neural-cable-system/neo-neural-jack.svg';

export default function NeoAvatar({ sourceRef }: { sourceRef?: Ref<HTMLSpanElement> }) {
  const talking = useFeed((s) => s.wormActive > 0);
  return (
    <div className="core-visual">
      <div
        className={`neo-avatar${talking ? ' is-talking is-burst' : ''}`}
        role="img"
        aria-label={talking ? 'Neo Agent 正在释放蠕虫' : 'Neo Agent 空闲'}
      >
        <img className="neo-frame neo-frame-idle" src={neoIdle} alt="" draggable={false} />
        <img className="neo-frame neo-frame-talking" src={neoTalking} alt="" draggable={false} />
        <span
          ref={sourceRef}
          className="neo-neural-source"
          style={{ left: `${NEO_SOURCE_ANCHOR[0] * 100}%`, top: `${NEO_SOURCE_ANCHOR[1] * 100}%` }}
          aria-hidden="true"
        >
          <img src={neuralJack} alt="" draggable={false} />
        </span>
      </div>
    </div>
  );
}
