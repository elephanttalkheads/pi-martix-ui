# Power Plant Carousel — generated asset notes

> Status: prototype asset kit for UI migration reference. The two internet reference images are **not** copied into this repository.

## Files

- `human-pod-ink.png` — horizontal human pod with a real alpha channel (`1670 × 575`, 32-bit ARGB).
- `power-wall-ink.png` — opaque vertical Power Plant connection-wall texture (`724 × 2172`).

The pod and wall are deliberately separate. CSS 3D moves the pod ring; the wall remains a continuous architectural surface.

`human-pod-ink.png` is a strict side-view prototype asset. It can demonstrate the correct vertical-axis orbit, but CSS perspective still treats it as one flat plane. For a production-quality turn, keep this frame as the `0°` view and add 7–9 consistently registered views from `-80°` through `80°`, or replace the pod with a lightweight 3D mesh.

## Reference roles

- `E:\martix素材\the-matrix-power-plant-by-dave-gibbons-v0-VMa6f4bJg9PHVjvgIqQ5pCqs7FOM4M0EtCplxRi3j2c.webp`
  - Composition reference only: left connection wall, long horizontal pod, heavy black comic inking and red fluid.
- `E:\martix素材\Power.webp`
  - Mechanical vocabulary only: dense tubes, repeated infrastructure, tower scale and dark cyan void.

The generated assets are an original fusion. They do not reproduce the robots, captions, panel arrangement or exact line work in either reference.

## Style-library selection

- Primary template: `illustration-art-style`
- Supporting guidance: `architecture-space`
- Closest example cases: `case 346`, `case 6`

## Pod generation prompt

```text
模板：illustration-art-style（插画与艺术风格），结合 architecture-space 的建筑尺度与材质约束。
Use case: stylized-concept
Asset type: Electron 侧边栏中可被 CSS 3D 旋转的横向人类培育仓透明分层素材
Primary request: 生成一个原创的、横向伸展的人类培育仓侧视图。它属于一座远超人类尺度的生物机械 Power Plant；造型应像沉重的工业生命维持舱，而不是汽车、飞船或普通服务器。
Input images: 图1仅作为左墙连接、长横向仓体、粗黑漫画墨线和红色培养液的构图参考；图2仅作为密集管线、分层机械结构和巨大建筑尺度的参考。不要逐线复制任何参考图，不要复现其中的机器人、文字框或具体面板构图。
Scene/backdrop: 真正透明背景，单个完整物体，四周留出透明安全边距。
Subject: 左端是粗重的圆形机械连接颈和多束软管；中部是低矮、细长、横向的红色培养液玻璃舱；舱内有一个可辨识但不血腥的蜷缩人体剪影、生命维持线和液体气泡；右端逐渐收尖并带有黑色护甲和散热结构。整体长度明显大于高度。
Style/medium: 1990年代成人科幻漫画质感的原创插画；极粗黑色墨线、交叉排线、丝网印刷颗粒、略微错版的红色和病态青绿色块；细节密集但轮廓强烈；不是照片，不是3D渲染，不是光滑概念车。
Composition/framing: 严格正侧视，水平放置，从左向右延伸，完整物体不裁切；适合在 280px 侧边栏中缩放到约 185×56px。
Lighting/mood: 深黑阴影，培养液内部暗红发光，少量冷青反射，危险、古老、工业化。
Color palette: 黑色、煤灰、暗青灰为主，深红与褪色粉红为培养舱主体，少量病态青绿和近白绿高光。
Materials/textures: 磨损金属、厚玻璃、橡胶波纹管、油污、丝网印刷颗粒和手绘墨线。
Constraints: 真正透明背景；只出现一个培育仓；不出现墙体、人物站立、场景背景、文字、Logo、标签或水印；人体必须完全位于舱内；连接端必须在左，尖端必须在右；轮廓清楚，便于网页合成。
Avoid: 不要直接复制参考图线稿；不要电影截图；不要写实摄影；不要3D塑料感；不要霓虹城市；不要对称飞船；不要多余物体；不要边缘光晕污染透明区域。
```

The built-in generator rendered the preview checkerboard into RGB instead of producing alpha. The repository asset was therefore normalized after generation: only neutral light pixels connected to the canvas edge were removed, the result was cropped with an 18px safety margin, and the corner alpha was verified as `0`. The pod drawing itself was not redrawn.

## Wall generation prompt

```text
模板：illustration-art-style（插画与艺术风格），结合 architecture-space 的建筑尺度、材料与功能约束。
Use case: stylized-concept
Asset type: Electron 侧边栏 Power Plant 左侧墙体可重复使用的竖向纹理板
Primary request: 生成一块原创的、极其庞大的生物机械发电厂连接墙面局部。它只是巨大建筑表皮的一小条竖向切片，用于网页中重复和裁切；不出现完整建筑。
Input images: 图1仅作为左侧密集软管、圆形连接结构和粗黑漫画墨线的参考；图2仅作为无限管线、脊柱式结构、密集工业尺度和暗青空间感的参考。不要复制任何具体面板、文字或培育仓排列。
Scene/backdrop: 竖向狭长构图，墙板主体填满画布；背景为接近黑色的机器内部。
Subject: 多层粗软管、肋骨状金属支架、圆形旋转轴承、检修孔、液压管、磨损装甲和少量病态绿指示灯；右边缘分布若干供培育仓接入的黑暗圆形接口，但画面中绝对不出现培育仓。
Style/medium: 1990年代成人科幻漫画质感的原创建筑插画；极粗黑色墨线、交叉排线、丝网印刷颗粒、有限色块、手工套色略微错版；具有古老、肮脏、巨大、难以理解的机械密度。
Composition/framing: 高约为宽的 3 倍；无透视消失点的近距离正视墙面，顶部和底部结构可以自然延续，适合作为垂直裁切纹理；细节密度在不同高度有变化。
Lighting/mood: 深黑阴影占主导，少量暗青环境光、近白绿指示灯和极少暗红热量。
Color palette: 黑色、煤灰、脏暗青、灰绿；少量病态荧光绿和暗红；不要大面积鲜艳颜色。
Materials/textures: 磨损金属、油污、橡胶波纹管、铆钉、氧化层、丝网印刷颗粒。
Constraints: 不出现文字、Logo、水印、人物、机器人、培育仓、风景或UI；不要画完整塔楼；结构必须看起来可与右侧横向培育仓连接；避免明显上下边框，以便网页连续裁切。
Avoid: 不要逐线复制参考图；不要照片；不要3D渲染；不要干净科幻走廊；不要对称服务器机柜；不要霓虹城市；不要平滑塑料；不要棋盘格。
```
