# Neo Agent 头像素材

- `neo-idle.png`：闭嘴透明静态帧。
- `neo-talking.png`：张嘴透明说话帧。
- 两张图片均为 256×256 RGBA PNG，只保留人物主体；由 Vite 静态导入并写入 Electron 的 `dist-renderer/assets` 构建产物。
- 组件入口：`components/NeoAvatar.tsx`。
- 动画触发：仅在蠕虫释放期间张嘴（store `wormActive > 0`，见 `components/SignalCanvas.tsx` 的 `releaseWorm`），释放瞬间 700ms 脉冲；`prefers-reduced-motion: reduce` 时不循环切帧、不脉冲。

透明高分辨率母版保存在 `ui-demo/icon/agent-neo-pixel-avatar*.png`；带背景的原图备份以 `*-with-background.png` 命名。不要在运行时代码中引用绝对磁盘路径。
