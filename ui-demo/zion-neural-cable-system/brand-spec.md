# ZION 脑机接口连接线视觉规范

基于 `D:\pi-martix-ui\src\renderer\src\styles.css` 的现有 ZION 令牌；连接线只使用项目既有绿色体系，不引入红色、青蓝或额外强调色。

```css
:root {
  --bg: oklch(12.935% 0.02637 156.773);
  --surface: oklch(19.420% 0.04047 156.631);
  --fg: oklch(88.266% 0.21396 152.335);
  --muted: oklch(64.040% 0.16466 150.756);
  --border: oklch(30.979% 0.06890 153.324);
  --accent: oklch(86.856% 0.27758 144.466);

  --font-display: "Share Tech Mono", "Sarasa Term SC", ui-monospace, monospace;
  --font-body: "Sarasa Term SC", "Microsoft YaHei", sans-serif;
  --font-mono: "Matrix Code", "Share Tech Mono", ui-monospace, monospace;
}
```

视觉语言：

1. 线体是“被约束在路径上的字符神经束”，不是工业软管。
2. 常驻线路低亮、细且稳定；仅当前会话出现一次移动信号头。
3. 机械端头只做深绿像素化锁扣，不能比培育仓本体更抢眼。
4. 所有状态共享同一条几何路径；hover/focus 只调整可读性，不改变路径。
5. 透明层永远位于名称牌、全息层、操作按钮和滚动条之后。
