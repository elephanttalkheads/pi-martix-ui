# 工作区会话区 DOM 实测尺寸

本文记录 `http://127.0.0.1:3080/` 左侧工作区会话列表的实际 DOM 尺寸，为“矩阵机房 / MATRIX DRIVE VAULT”像素风机柜素材和纵向布局提供基准。

## 测量基线

| 项目 | 实测值 |
| --- | --- |
| 测量日期 | 2026-08-20 |
| 页面标题 | DeepSeek Harness |
| 页面地址 | `http://127.0.0.1:3080/` |
| 测量方式 | Kimi WebBridge，借用用户当前打开的真实浏览器标签页，通过 `getBoundingClientRect()` 和 `getComputedStyle()` 读取 |
| 浏览器视口 | `1536 × 639 CSS px` |
| `devicePixelRatio` | `1.25` |
| 工作区数量 | 4 |
| 会话数量 | 11 |
| 当前选中会话 | 新会话 |

本文中的尺寸均为 **CSS 像素**。如果生成高分辨率位图素材，应由渲染方案决定倍率，不应直接把 `devicePixelRatio` 乘入 CSS 布局尺寸。

## DOM 定位

本次实测使用的完整选择器：

```css
#root > div > div > div.pI_x6G_sidebarCol > div > div > div.hHd-Xa_regionArea > div > div > div.qDHVXG_listArea > div > div
```

当前构建中的主要类名：

| 层级 | 类名 |
| --- | --- |
| 会话区外层 | `.qDHVXG_listArea` |
| 滚动列表 | `.qDHVXG_list` |
| 单个工作区分组 | `.qDHVXG_groupSection` |
| 工作区标题行 | `.YDXeBa_projectRow` |
| 会话行 | `.YDXeBa_sessionRow` |
| 会话标题 | `.YDXeBa_title` |
| 会话时间 | `.YDXeBa_time` |

类名可能随构建发生变化。长期自动化测量应优先结合 `role="tree"` 和 `role="treeitem"`，不要只依赖哈希类名。

## 会话区容器

| 对象 | 边界尺寸 | 位置 | 计算样式与滚动数据 |
| --- | --- | --- | --- |
| `.qDHVXG_listArea` | `256 × 421.2` | `x=8, y=162` | `width:252px; padding-left:4px; display:flex` |
| `.qDHVXG_list` | `254 × 421.2` | `x=8, y=162` | 内容宽 `240px`；`padding:0 2px 16px 4px`；`margin:0 2px 0 -4px`；`overflow:auto` |

滚动列表数据：

```text
clientWidth  = 246px
clientHeight = 421px
scrollWidth  = 246px
scrollHeight = 538px
```

列表内的工作区和会话行统一从 `x=12` 开始，实际行宽为 `240px`。

## 工作区标题行（机柜顶）

工作区标题行 `.YDXeBa_projectRow` 的实测值：

| 属性 | 实测值 |
| --- | --- |
| 外边界 | `240 × 34px` |
| `box-sizing` | `border-box` |
| 内边距 | `0 8px` |
| 子元素间距 | `6px` |
| 布局 | `display:flex; align-items:center` |
| 圆角 | `8px` |
| 字号 | `14px` |
| 字重 | `400` |
| 文字颜色 | `rgb(15, 17, 21)` |

横向位置：

```text
工作区行：x=12，right=252
文件夹图标：x=20，16 × 20px，right=36
工作区名称：x=42，202 × 20px，right=244
```

文件夹图标与名称之间的实际距离为 `6px`；名称右边缘距行右边缘 `8px`。

当前激活工作区的文件夹图标颜色为 `rgb(65, 118, 230)`。

## 会话行（单盘位与硬盘）

会话行 `.YDXeBa_sessionRow` 的实测值：

| 属性 | 实测值 |
| --- | --- |
| 外边界 | `240 × 32px` |
| CSS 内容宽 | `224px` |
| `box-sizing` | `content-box` |
| 内边距 | `0 8px` |
| 布局 | `display:flex; align-items:center` |
| 圆角 | `8px` |
| 相邻会话行步进 | `34px` |
| 相邻可见面板间距 | `2px` |

横向结构：

```text
会话行：x=12，right=252
占位槽：x=20，16 × 20px，right=36
标题起点：x=40
时间右边缘：x=244
行右侧内边距：8px
```

标题相对会话行左边缘缩进 `28px`。其结构为：左内边距 `8px` + 占位槽 `16px` + 标题左外边距 `4px`。

以“WSL环境检测确认 / 34分钟”为样本：

| 子元素 | 边界尺寸 | 计算样式 |
| --- | --- | --- |
| 标题 | `161.0625 × 20px` | `font-size:14px; line-height:20px; flex:1 1 0%; margin:0 6px 0 4px` |
| 时间 | `36.9375 × 20px` | `font-size:12px; line-height:20px; flex:0 0 auto` |

标题宽度会随时间文本宽度动态变化，不应固定为样本中的 `161.0625px`。标题的溢出规则为：

```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

普通会话文字颜色为 `rgb(15, 17, 21)`；时间文字颜色为 `rgb(129, 133, 140)`。

当前选中会话“新会话”的行尺寸仍为 `240 × 32px`，选中背景为：

```css
background-color: rgba(38, 49, 72, 0.06);
border-radius: 8px;
```

## 纵向排列规律

工作区标题行高 `34px`。标题与第一个会话可见面板之间间隔 `2px`；会话面板高 `32px`；后续会话同样以 `34px` 为步进。

因此，一个包含 `N` 个会话的工作区高度为：

```text
H_workspace(N) = 34 + N × 34
               = 机柜顶 34
               + N ×（2px 接缝 + 32px 会话面板）
```

相邻工作区之间额外保留 `4px` 间距。包含 `G` 个工作区、总计 `S` 个会话时：

```text
H_content(G, S) = G × 34 + S × 34 + (G - 1) × 4
```

当前页面的实测分组：

| 工作区 | 会话数 | 分组高度 |
| --- | ---: | ---: |
| deepseek-zion | 3 | `136px` |
| claude-code-toolkit | 1 | `68px` |
| skills-guide | 4 | `170px` |
| 未分组 | 3 | `136px` |

当前内容总高度：

```text
4 × 34 + 11 × 34 + 3 × 4 = 522px
522 + 列表底部 padding 16 = scrollHeight 538px
```

## 像素风机柜映射

以下是基于实测尺寸的直接映射，不是新的 DOM 实测项：

| 机柜概念 | 建议 CSS 尺寸 | 与原会话区的对应关系 |
| --- | --- | --- |
| 机柜顶（工作区） | `240 × 34px` | 完整对应工作区标题行 |
| 单盘位机柜体 | `240 × 34px` | 对应单个会话的纵向占位步进 |
| 硬盘可见面板 | `240 × 32px` | 对应实际会话行面板 |
| 硬盘纵向偏移 | `2px` | 将原布局的行间接缝包含在单盘位模块顶部 |
| 工作区间距 | `4px` | 对应相邻机柜之间的现有间距 |

不添加机柜脚。为了让多个素材无缝拼接，单盘位素材应以 `34px` 为模块高度，在模块内部的 `y=2px` 位置放置 `32px` 高的硬盘面板。

## 复测注意事项

- 会话区可见高度 `421.2px` 受当前窗口高度影响；行宽和行高是本次机柜素材同步的主要基准。
- 页面缩放、系统缩放、侧边栏宽度或响应式断点变化后应重新测量。
- DOM 类名属于当前构建产物；页面升级后应先验证选择器。
- 选中背景、悬停背景和操作按钮显示状态属于交互状态，不能由静态素材完全替代。
