// Neo 头像 —— 侧栏顶部像素头像（闭嘴/张嘴两帧叠加，class 切换）。
// 张嘴仅由蠕虫释放驱动：store.wormActive > 0（releaseWorm 开始 +1、done -1）；
// 释放瞬间带 700ms 脉冲（is-burst）。REDUCED 下张嘴不循环切帧（styles.css 媒体查询）。
import { useFeed } from '../store';
import neoIdle from '../assets/neo-avatar/neo-idle.png';
import neoTalking from '../assets/neo-avatar/neo-talking.png';

export default function NeoAvatar() {
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
      </div>
    </div>
  );
}
