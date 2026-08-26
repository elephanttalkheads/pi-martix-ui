from __future__ import annotations

from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent
SOURCE_DIR = ROOT / "sources"


def mirrored_tile(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGB")
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    tile = image.crop((left, top, left + side, top + side)).resize((512, 512), Image.Resampling.LANCZOS)

    mosaic = Image.new("RGB", (1024, 1024))
    mosaic.paste(tile, (0, 0))
    mosaic.paste(ImageOps.mirror(tile), (512, 0))
    mosaic.paste(ImageOps.flip(tile), (0, 512))
    mosaic.paste(ImageOps.flip(ImageOps.mirror(tile)), (512, 512))

    seamless = mosaic.crop((256, 256, 768, 768)).resize((256, 256), Image.Resampling.LANCZOS)
    seamless.save(output, optimize=True)


def condensation_mask(output: Path) -> None:
    rng = Random(19840331)
    mask = Image.new("L", (256, 256), 0)
    draw = ImageDraw.Draw(mask)

    for _ in range(620):
        x = rng.randrange(0, 256)
        y = rng.randrange(0, 256)
        radius = rng.choice((1, 1, 1, 2, 2, 3))
        alpha = rng.randrange(16, 68)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=alpha)

    for _ in range(22):
        x = rng.randrange(0, 256)
        y = rng.randrange(-20, 220)
        length = rng.randrange(18, 72)
        width = rng.choice((1, 1, 2))
        draw.line((x, y, x + rng.randrange(-3, 4), y + length), fill=rng.randrange(20, 54), width=width)

    mask = mask.filter(ImageFilter.GaussianBlur(0.45))
    rgba = Image.new("RGBA", mask.size, (199, 231, 218, 0))
    rgba.putalpha(mask)
    rgba.save(output, optimize=True)


def main() -> None:
    mirrored_tile(SOURCE_DIR / "bio-industrial-metal-source.png", ROOT / "bio-industrial-metal-256.png")
    mirrored_tile(SOURCE_DIR / "dark-red-fluid-source.png", ROOT / "dark-red-fluid-256.png")
    condensation_mask(ROOT / "condensation-mask-256.png")


if __name__ == "__main__":
    main()
