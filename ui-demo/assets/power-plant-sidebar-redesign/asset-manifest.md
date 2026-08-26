# Power Plant Sidebar Redesign — 资产清单

## 统一管线

- 参考视角：参考图只提取“左侧巨构墙体、横向悬挂仓体、暗红液体、密集管线与漫画墨线”语法。
- 运行相机：正交感较强的窄视场透视；`cameraDistance = 620`，`focal = 560`，屏幕主轴中心 `x = 47px`，俯视系数 `cameraPitch = 0.11`。俯角只用于分离旋转中近／远仓体，所有刚性零件共用同一投影。
- 环层参数：每层 6 个物理盘位、间隔 60°；仓体径向范围 `58–242` 世界单位，高 56、厚 25；层距 184px。无真实会话的盘位保留机械结构，但使用冷暗空仓玻璃且关闭生命信号。
- 光源：观察窗右上方弱冷绿光；进入远端后按深度与朝向联合暗化。
- 材质：湿蚀枪灰钢、暗红培养液、污玻璃、黑色油脂、少量状态灯。
- 描边：Canvas 实时绘制 0.7–2.2px 深墨线；线宽随透视缩放。
- 噪点：材质贴图低透明度叠加，屏幕空间扫描线由 CSS 完成。

## 文件

| 文件 | 尺寸 | 透明 | 用途 |
| --- | ---: | --- | --- |
| `bio-industrial-metal-256.png` | 256×256 | 否 | 固定主轴、旋转墙段、仓体护轨的湿蚀钢材纹理 |
| `dark-red-fluid-256.png` | 256×256 | 否 | 培育仓玻璃内暗红培养液纹理 |
| `condensation-mask-256.png` | 256×256 RGBA | 是 | 玻璃水珠与纵向污痕蒙版 |
| `power-plant-renderer.js` | 本地脚本 | — | 3D 坐标、透视投影、深度排序、交互与状态收敛 |
| `generate-textures.py` | 本地脚本 | — | 可重复执行的贴图后处理管线 |
| `PROMPTS.md` | 文本 | — | 两次原创材质生成的完整提示词 |
| `validation-01-initial.png` | 560×1800 | 否 | 280px 初始视窗的 2× 验收截图 |
| `validation-02-workspace-01-rotating.png` | 560×1800 | 否 | 第一层旋转过程截图 |
| `validation-03-workspace-02-independent.png` | 560×1800 | 否 | 第二层独立锁止后的截图 |
| `validation-04-deep-workspace.png` | 560×1800 | 否 | 下潜至第四层后的连续空间截图 |
| `sources/bio-industrial-metal-source.png` | 1254×1254 | 否 | 钢材生成原图，运行时不加载 |
| `sources/dark-red-fluid-source.png` | 1254×1254 | 否 | 培养液生成原图，运行时不加载 |
| `sources/reference-gibbons-power-plant.webp` | 1080×860 | 否 | 用户指定参考，仅供设计追溯，不在运行时加载 |
| `sources/reference-power-depth.webp` | 651×758 | 否 | 用户指定参考，仅供设计追溯，不在运行时加载 |

## 后处理

`generate-textures.py` 对两张生成原图执行：中心方形裁切 → 512px 缩放 → 2×2 镜像拼接 → 中心 512px 回裁 → 256px LANCZOS 缩放。该方法让左右、上下边界连续，避免 Canvas 平铺时出现硬接缝。水珠蒙版使用固定随机种子 `19840331` 生成，可完全复现。

钢材与液体贴图保持不透明；仓体外轮廓、玻璃、人体和机械组件全部在 Canvas 中实时绘制，因此不需要透明仓体位图。`condensation-mask-256.png` 保留原生 alpha，仅在玻璃裁切区低透明度叠加。
