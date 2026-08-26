# Power Plant Sidebar Redesign — 视觉令牌

```css
:root {
  --bg: oklch(0.105 0.018 150);
  --surface: oklch(0.165 0.026 153);
  --fg: oklch(0.9 0.055 145);
  --muted: oklch(0.64 0.035 151);
  --border: oklch(0.34 0.048 151);
  --accent: oklch(0.78 0.19 145);
  --font-display: "Bahnschrift SemiCondensed", "DIN Condensed", sans-serif;
  --font-body: "Microsoft YaHei UI", "Noto Sans CJK SC", sans-serif;
  --font-mono: "Cascadia Mono", "IBM Plex Mono", Consolas, monospace;
}
```

- 近黑空间占据绝大多数像素，暗红只属于培养液，磷光绿只属于生命与锁止信号。
- 巨构尺度通过连续主轴、密集局部结构、深度暗化和遮挡表达，不画装饰性转盘。
- 机械轮廓使用细钢轨与重墨阴影，中央玻璃面积远大于边框。
- 文字只出现在观察读数层，不烘焙进纹理或仓体。
- 动效按物理状态编排：解锁/旋转/回弹/锁止；精简动效直接到达终态。
