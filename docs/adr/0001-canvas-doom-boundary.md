# ADR-0001：氛围层用 canvas，数据卡用 DOM

ui-demo v3 是单文件（一个 `<style>` + 一个 `<script>`），canvas 与 DOM 混合、模块间直接操作 DOM 元素。迁移进 React renderer 时，我们按层拆组件（MatrixBg / CrtOverlay / WormLayer 各持一个 canvas，共享 useEffect 生命周期样板），但**氛围层（数字雨/CRT/蠕虫）留在 canvas，消息/diff 卡/工具调用行全部走 React DOM**，不把 diff 卡渲染进 canvas。

**为什么**：diff 卡的数据来自真实工具调用事件（feed 的一部分），用 React 渲染能直接消费 zustand store、获得虚拟 DOM 复用与 CSS 动画；canvas 像素级排版会重复造轮子且无法复用样式变量。氛围层则相反——逐帧 rAF 更新不适合 React 重渲染模型，canvas 是唯一合理选择。

**权衡**：demo 里 diff 卡是 canvas 时代之前的 DOM 产物，本无冲突；真正被否决的方案是"全部塞进一个全屏 canvas 用像素渲染"（像 3D 核心/频谱那样），换来的是 feed 滚动、选中、无障碍全部失效。

**约束**：氛围 canvas 只读模块级 FX 参数（`store.ts` 的 `fx` 对象，target 值），不订阅消息级更新；v3 的 rAF 指数插值条款已被 v4 两档 FX（READY `{1,0.3}` / 忙碌 `{2.2,0.85}`，见 ADR-0002）废止——氛围层直接读 `fx` 即可；新增氛围层必须遵循此边界。
