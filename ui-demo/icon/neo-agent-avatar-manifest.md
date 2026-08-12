# Neo Agent 像素头像

- 用途：当前黑客帝国风格 Agent 的方形聊天头像
- 画布：1:1
- 构图：正面头肩像、居中对称、四周保留安全边距
- 识别特征：窄幅黑色墨镜、高领黑风衣、外露的非血腥像素大脑
- 色彩：来自当前 Agent UI 的近黑底色与磷光绿色
- 输出文件：`neo-agent-pixel-avatar.png`

## 最终生成提示词

```text
Use case: stylized-concept.
Asset type: square AI agent avatar for a terminal chat UI.
Input images: Image 1 is the current agent UI and the authoritative reference for the near-black phosphor-green palette, sparse Matrix terminal atmosphere, and contrast. Image 2 is a style reference only for the economy of its tiny retro CLI mascot: low-resolution chunky square pixels, compact silhouette, very few colors. Do not copy its creature shape, orange palette, or any logo.
Primary request: Create an original pixel-art bust portrait of Neo from The Matrix, front-facing and centered.
Subject: unmistakable Neo with narrow black wraparound sunglasses and a high black coat collar. The top of the head is cleanly opened; a stylized pixel-art brain is exposed above the forehead. The brain has clearly separated chunky cerebral folds with luminous phosphor-green highlights, reads instantly at 48px, and is non-gory with no blood.
Style/medium: extremely restrained retro terminal mascot sprite; 64x64 logical pixel-art aesthetic upscaled crisply; few large square pixels; hard edges; stepped contours; limited shading; no antialiasing; no smooth vector curves; no photorealism.
Composition/framing: one head-and-shoulders icon, generous even padding, strict square canvas, strong centered silhouette, symmetrical frontal gaze. Keep all features comfortably within the canvas.
Color palette: derive from Image 1 only—near-black, very dark green, mid phosphor green, bright terminal green. Black lenses must remain distinct using thin green rims and a one-pixel bridge.
Scene/backdrop: flat near-black with only very faint sparse descending code marks and subtle CRT scanlines; background stays subordinate.
Constraints: no text, no readable letters, no logo, no watermark, no extra characters, no orange, no blue, no purple, no gradients, no realistic blood, no detailed scene, no glow haze, no soft edges. Icon-ready, polished, legible at small size.
```

生成方式：内置图像生成工具；Open Design 的 Fal 调度器因本机未配置 `FAL_KEY` 未被用于最终成图。
