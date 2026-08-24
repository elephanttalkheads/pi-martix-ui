# Power Plant B「轴承剖面」素材提示词

0° 的三张拆分素材与后续 ±30° 完整总成母版均使用 Codex 内置 ImageGen 生成，以 `bay-assembly-bearing-cutaway-concept-v2.png` 为统一形象基线。生成服务输出的透明棋盘被错误扁平为 RGB，因此最终文件只在本地执行背景键除、裁切或目标尺寸缩放；主体没有重新绘制。

## `pod-front-v2.png`

```text
Use case: precise-object-edit
Asset type: transparent cultivation-pod sprite
Primary request: Preserve the existing genuine transparency of the supplied approved master. Keep only the long red cultivation-pod component on the right, plus its short left mounting neck. Remove all left-side wall, bearing and connector machinery by making those removed regions fully transparent.
Preserve the retained pod exactly as approved: unchanged 0-degree horizontal silhouette, proportions, thin shell, large red window, organic interior linework, tubing, pale gasket, metal wear, short rounded nose, palette and comic-ink rendering.
Output requirement: RGBA PNG with genuine alpha=0 everywhere outside the retained pod. The input already has transparent alpha; keep that transparency. Never paint a transparency grid or any background.
Constraints: one pod only; no wall, bearing, connector body, external hose, shadow, matte, checkerboard, white/gray/black background, text, logo, watermark or scenery.
```

## `bay-assembly-minus-30-v2.png`

```text
Use case: style-transfer
Asset type: wide transparent concept master for one Electron sidebar Power Plant bay assembly, negative 30-degree yaw
Input images: Image 1 is the approved identity, topology, proportions, palette and rendering master; Image 2 is the primary comic-ink shape and surface reference; Image 3 is a secondary structural-density and scale reference.
Primary request: Re-render the SAME complete rigid bay assembly from Image 1 at exactly −30 degrees of horizontal yaw around the vertical Power Plant axis. The narrow bearing-cutaway rotating wall segment stays on the LEFT, the compact mechanical sleeve connector stays attached in the middle, and the long cultivation pod with its rounded nose stays on the RIGHT. At −30°, the pod's RIGHT rounded nose is closer to the viewer and slightly larger, while the LEFT wall and bearing are slightly farther away. The entire wall segment, connector and pod must share one coherent perspective and rotate as one rigid object; do not mirror or rearrange anything.
Subject invariants: preserve the approved very thin shell and frame, huge red-liquid window occupying about 72–78% of the visible pod length, low-contrast human figure submerged inside, organic cables, worn gray-green metal, black ribs, stacked corrugated hoses, local bearing teeth only, short overlapping connector collars, and the original left-to-right attachment seams. Preserve overall long horizontal silhouette; the pod must occupy most of the image width.
Style/medium: grim late-1980s/early-1990s industrial science-fiction comic panel, heavy black ink, crosshatching, rough screen-print grain, restrained gray-green metal, pale worn highlights, dense crimson liquid, red accents; closely match the references without adding new motifs.
Composition: isolated complete assembly, centered, generous transparent margin, no cropping, no floor, no scenery. Perspective must be visibly but not excessively foreshortened at exactly 30°.
Background/output: genuine transparent RGBA background, including open gaps between hoses; no painted checkerboard, matte, halo or cast shadow.
Avoid: full disk, full wheel, target or circular UI icon, tower, extra pods, detached parts, floating cables, duplicated connectors, mirrored layout, text, number, logo, watermark, UI frame, black/white/gray backdrop.
```

## `bay-assembly-plus-30-v2.png`

```text
Use case: style-transfer
Asset type: wide transparent concept master for one Electron sidebar Power Plant bay assembly, positive 30-degree yaw
Input images: Image 1 is the approved 0° identity, topology, proportions, palette and rendering master; Image 2 is the already generated −30° companion and must be matched in scale, detail density, line weight, lighting and crop; Image 3 is the primary comic-ink shape/surface reference; Image 4 is a secondary structural-density and scale reference.
Primary request: Re-render the SAME complete rigid bay assembly from Image 1 at exactly +30 degrees of horizontal yaw around the vertical Power Plant axis, forming the complementary angle pair to Image 2. The narrow bearing-cutaway rotating wall segment remains on the LEFT and is now closer to the viewer and slightly larger; the compact sleeve connector remains attached in the middle; the long cultivation pod keeps its rounded nose on the RIGHT and now recedes away, becoming slightly smaller. The wall segment, connector and pod share one coherent perspective and rotate as one rigid object. This is NOT a horizontal mirror of Image 2: preserve the permanent left wall / right rounded nose topology and all attachment logic.
Subject invariants: preserve the approved very thin shell and frame, huge red-liquid window occupying about 72–78% of visible pod length, low-contrast submerged human, organic cables, worn gray-green metal, black ribs, stacked corrugated hoses, local bearing teeth only, short overlapping connector collars, and the original left-to-right attachment seams. Preserve the long horizontal silhouette; pod occupies most of the image width.
Style/medium: grim late-1980s/early-1990s industrial science-fiction comic panel, heavy black ink, crosshatching, rough screen-print grain, restrained gray-green metal, pale worn highlights, dense crimson liquid, red accents; match the companion image without adding motifs.
Composition: isolated complete assembly, centered, same canvas occupancy and transparent margin as the companion, no cropping, no floor or scenery. Perspective must be visibly but not excessively foreshortened at exactly 30°.
Background/output: genuine transparent RGBA background, including open gaps between hoses; no painted checkerboard, matte, halo or cast shadow.
Avoid: mirror flip, swapped ends, full disk, full wheel, target/circular UI icon, tower, extra pods, detached parts, floating cables, duplicated connector, text, number, logo, watermark, UI frame, black/white/gray backdrop.
```

两张角度母版同样由内置 ImageGen 生成。生成服务再次将透明棋盘扁平为 24bpp RGB，因此最终文件沿用首轮确定性流程：只移除与画布边缘连通的浅色中性棋盘像素，裁切并保留 24px 安全边距，主体没有重新绘制。最终文件均为 32bpp ARGB，四角 alpha 为 0。

## `bay-assembly-minus-30-v3.png`

```text
Use case: precise-object-edit
Asset type: transparent −30° rotating Power Plant bay assembly concept master
Input images: Image 1 is the −30° v2 edit target; Image 2 locks the approved 0° proportions; Images 3–4 are comic machinery and scale references only.
Primary request: Change ONLY the spatial perspective and volumetric construction of Image 1 so the bay unmistakably reads as a solid three-dimensional object rotating around a vertical Power Plant axis. Keep the mechanical design, human, palette, comic style, left-wall/middle-connector/right-pod topology and −30° direction unchanged.
Required 3D cues: use a physically convincing 30° yaw with stronger wide-angle depth. The RIGHT rounded pod nose is nearest and about 25–35% larger than the far LEFT bearing wall. Show it as a thick elliptical end volume. Give the top armor rail, lower rail, glass rim and end cap real thickness with edges converging toward the far left. Place the body behind deep transparent glass. Render connector collars as oblique elliptical cylinders. Stack hoses in front of and behind the bearing using occlusion, overlap and short contact shadows. Preserve one rigid continuous attachment.
Style/medium: hand-inked late-1980s/early-1990s industrial science-fiction comic art with heavy black contour, crosshatching and screen-print grain. Create depth through perspective, occlusion and inked shading, not glossy CGI or photorealism.
Composition/output: one complete isolated horizontal assembly, centered and uncropped, genuine transparent RGBA including hose gaps.
Avoid: flat orthographic side elevation, simple trapezoid warp, paper-cutout look, mirrored layout, changed angle sign, swapped ends, full disk/wheel, extra pod, detached parts, text, logo, UI or watermark.
```

## `bay-assembly-plus-30-v3.png`

```text
Use case: precise-object-edit
Asset type: transparent +30° rotating Power Plant bay assembly concept master
Input images: Image 1 is the +30° v2 edit target; Image 2 is the approved −30° v3 volumetric companion; Image 3 locks the 0° identity and proportions; Image 4 is a comic machinery reference only.
Primary request: Change ONLY the spatial perspective and volumetric construction of Image 1 so it forms the opposite-angle companion to Image 2 and reads as a solid assembly rotating around a vertical Power Plant axis. Keep the mechanical design, human, palette, comic style, left-wall/middle-connector/right-pod topology and +30° direction unchanged.
Required 3D cues: use a physically convincing 30° yaw with strong wide-angle depth. The LEFT bearing-cutaway wall is nearest and about 25–35% larger than the far RIGHT pod nose. Show thick stacked armor and deep cylindrical bearing rings with elliptical faces, axial depth and interlocking layers. Render connector collars as projecting oblique elliptical cylinders. Give the pod rails, glass rim and armor ribs real thickness with edges converging toward the receding right nose. Place the body behind deep glass and use hose occlusion, overlap and contact shadows. Preserve one rigid continuous attachment.
Pair consistency: match the −30° v3 material, detail density, crimson liquid, framing height and comic-ink treatment; the pair must look like two views of the same physical object.
Composition/output: one complete isolated horizontal assembly, centered and uncropped, genuine transparent RGBA including hose gaps.
Avoid: flat orthographic side elevation, simple trapezoid warp, paper-cutout look, mirroring the companion, changed angle sign, swapped ends, full disk/wheel, extra pod, detached parts, text, logo, UI or watermark.
```

v3 仍由内置 ImageGen 生成。透明化在原“边缘连通浅色”规则上增加“全局纯中性棋盘色”键除，以清理管线围成的封闭孔洞；金属、红色玻璃和人体主体没有重新绘制。v3 为当前角度母版，v2 仅保留作二维化问题对照。

## ±30° v3 组件拆分

六张组件图都使用 `precise-object-edit`，角度母版是编辑目标，0° 对应组件定义职责边界，另一角度的同类组件用于锁定形象一致性。共同约束如下：

```text
Change only component isolation. Preserve the approved angle, perspective, scale, lighting, palette, human, materials, comic ink, crosshatching, wear and volumetric depth. Do not flatten, mirror, rotate, relight, recolor or redesign. Output one isolated component on genuine transparent RGBA with enough overlap material at connection seams. No checkerboard, backdrop, shadow, text, logo, UI or watermark.
```

| 输出文件 | 编辑目标 | 保留内容与角度约束 |
| --- | --- | --- |
| `rotor-wall-minus-30-v3.png` | `bay-assembly-minus-30-v3.png` | 只保留远处较窄的左墙、局部轴承、承重肋、墙载管线和右侧直插槽 |
| `connector-joint-minus-30-v3.png` | `bay-assembly-minus-30-v3.png` | 只保留短套筒；右侧仓端锁环较大，轴线向左后退，两端保留接缝重叠量 |
| `pod-minus-30-v3.png` | `bay-assembly-minus-30-v3.png` | 只保留仓体和左侧短安装颈；右端盖近景放大，护轨和玻璃向左汇聚 |
| `rotor-wall-plus-30-v3.png` | `bay-assembly-plus-30-v3.png` | 只保留近景左墙、具有椭圆端面的多层轴承、墙载管线和右侧直插槽 |
| `connector-joint-plus-30-v3.png` | `bay-assembly-plus-30-v3.png` | 只保留与负角度相同的套筒；左侧墙端锁环较大，轴线向右后退 |
| `pod-plus-30-v3.png` | `bay-assembly-plus-30-v3.png` | 只保留仓体和左侧安装颈；左端近景放大，圆形右端向远处缩小 |

接口提示词额外同时引用同角度的墙段与仓体拆分结果：左端按墙体插槽设计，右端按仓体安装颈设计；两端都生成少量可重叠材料，避免网页合成时出现透明缝。

## ±30° 生产接口

v3 拆分接口从侧面展开了完整套筒，显示高度为 58px 时宽度达到 `89.6–105.1px`。生产版改为“从连接轴正面偏转 30°”：前后端环的屏幕中心只错开一个端环直径的 `20–25%`，轮廓重叠 `65–75%`，只露出很短的套筒纵深。

### `connector-joint-minus-30-production.png`

```text
Use case: precise-object-edit
Asset type: production transparent sprite for an Electron sidebar
Input images: Image 1 is the approved narrow front-view connector and primary compact-geometry reference; Image 2 is the rejected −30° draft and supplies only scratched comic material and right-collar-nearer depth cues; Image 3 is the −30° full bay and supplies only connection direction.
Primary request: rotate the approved connector only 30 degrees away from a straight-on view down its connection axis. This is not a side view. The RIGHT pod-side collar is nearer; the LEFT wall-side collar is slightly offset and mostly hidden behind it.
Critical projection: separate the collar centers horizontally by only 20–25% of one collar diameter so the silhouettes overlap 65–75%; expose only a short sleeve sliver. After tight cropping, the complete object must have a width/height ratio near 0.62–0.68 and fill almost the full canvas height.
Style: gritty dystopian comic ink, scratched olive gunmetal, restrained ivory highlights, tiny dark-red gaskets, bolts and two compact armored cable loops.
Output: one isolated tightly framed object on genuine transparent alpha; both attachment faces vertically aligned.
Avoid: checkerboard, wall, pod, person, text, logo, watermark, horizontal telescope, side view, separated collars, complete wheel or extra machinery.
```

### `connector-joint-plus-30-production.png`

使用同一提示词，但交换前后关系：LEFT 墙体端环更近，RIGHT 仓体端环后退并大部分被遮挡；明确要求这是单独绘制的反向透视，不是 `−30°` 素材的水平镜像。

两次最终输出仍被生成服务扁平为 24bpp RGB。`scripts/normalize-imagegen-transparency.py` 只键除与边缘连通的浅色中性背景和封闭孔洞内的纯中性棋盘色，再用预乘 alpha 缩放到 4× 生产尺寸；机械主体没有重新绘制。最终 `−30°` 为 `158 × 232`，`+30°` 为 `153 × 232`，均为 32bpp ARGB 且四角 alpha 为 0。

## `rotor-wall-face-v2.png`

```text
Use case: precise-object-edit
Asset type: front-facing rotating wall-segment sprite for the adopted B bearing-cutaway sidebar
Primary request: Using the approved master and the original comic machinery reference, create ONLY one compact rotating wall segment at 0 degrees. It is the leftmost bearing-cutaway wall component of one bay assembly, without the separate connector and without the cultivation pod.
Subject: a narrow roughly 43:68 vertical mechanical segment. Show a dark irregular outer armor edge, black load-bearing ribs, tightly stacked corrugated hoses, layered clamps, worn gray-green plates, and only a LOCAL visible cross-section of bearing teeth and rollers. The right edge must provide a compact straight mounting socket where a separate connector sprite can overlap.
Preserve design language: same black/gray-green/pale worn highlights, heavy comic ink, crosshatching, rough screen-print grain, line weight and lighting as the approved master. Keep red to a few tiny recessed wear marks only.
Background/output: genuine transparent RGBA PNG alpha, including open spaces between hoses.
Constraints: no complete disk, full wheel, target icon, circular hub face, full tower, connector arm, cultivation pod, human, liquid tank, text, number, logo, UI, watermark, floor or scenery.
```

## `connector-joint-front-v2.png`

```text
Use case: precise-object-edit
Asset type: front-facing connector-joint sprite for an Electron sidebar
Primary request: From the supplied approved bay-assembly master, create ONLY the compact mechanical connector that sleeves between the bearing-cutaway wall on the left and the cultivation pod mounting neck on the right. Do not include either neighboring body.
Subject: a short, dense 0-degree horizontal interface assembly, visually about 31 CSS px wide and close to pod height. Use nested cylindrical locking collars, a central reinforced sleeve, two or three short corrugated hose bridges, clamps, bolts, and one tiny muted green status glint. The left edge must tuck under the separate wall sprite; the right edge must tuck over the pod's short mounting neck.
Preserve design language: same heavy black comic ink, crosshatching, rough screen-print grain, worn gray-green metal, pale highlights, tiny recessed red wear marks, line weight and lighting as the master.
Background/output: genuine transparent RGBA PNG alpha, including open gaps between hoses.
Constraints: no complete disk, target or hub icon, wall plate, tower, cultivation pod, red liquid chamber, human, long cable, text, number, UI, logo, watermark, floor or scenery.
```
