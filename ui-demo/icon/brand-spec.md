# Neo Agent 头像视觉规范

```css
:root {
  --bg: oklch(0.1641 0.0302 157.8);
  --surface: oklch(0.1903 0.0399 155.8);
  --fg: oklch(0.8827 0.2140 152.3);
  --muted: oklch(0.6404 0.1647 150.8);
  --border: oklch(0.2924 0.0650 153.5);
  --accent: oklch(0.8827 0.2140 152.3);
  --font-display: "Press Start 2P", "Fusion Pixel", monospace;
  --font-body: "IBM Plex Sans", "Noto Sans SC", sans-serif;
  --font-mono: "JetBrains Mono", "Noto Sans Mono CJK SC", monospace;
}
```

视觉语言：以图 1 的深黑绿终端色域为底，用图 2 的低分辨率大色块方式重构 Neo，使角色在极小尺寸下仍可识别。

- 轮廓由少量整齐像素阶梯组成，不使用平滑矢量曲线或抗锯齿插画笔触。
- 头像采用正面半身、居中对称构图；墨镜横向贯穿眼部，作为第一识别点。
- 头顶开放，外露大脑使用清楚的脑回分区和像素高光，不呈现血腥写实质感。
- 背景保持极暗、平整，仅允许低对比度数字雨或扫描线，不与角色轮廓竞争。
- 单一磷光绿色承担角色、脑部高光与界面关联；不引入额外彩色强调。
