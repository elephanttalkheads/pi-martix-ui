#!/usr/bin/env python3
"""Normalize flattened ImageGen checkerboards into compact RGBA sprites."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_edge_background(pixel: tuple[int, int, int]) -> bool:
    low = min(pixel)
    high = max(pixel)
    return low >= 218 and high - low <= 14


def is_checker_core(pixel: tuple[int, int, int]) -> bool:
    low = min(pixel)
    high = max(pixel)
    return low >= 244 and high - low <= 5


def background_mask(image: Image.Image) -> bytearray:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    mask = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if mask[index] or not is_edge_background(pixels[x, y]):
            return
        mask[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    # Clear the exact neutral checker colors inside cable loops and apertures.
    for y in range(height):
        row = y * width
        for x in range(width):
            if is_checker_core(pixels[x, y]):
                mask[row + x] = 1
    return mask


def normalize(source: Path, destination: Path, ratio: float, height: int) -> None:
    source_image = Image.open(source).convert("RGB")
    width, source_height = source_image.size
    mask = background_mask(source_image)
    rgba = source_image.convert("RGBA")
    data = list(rgba.get_flattened_data())
    rgba.putdata([
        (0, 0, 0, 0) if mask[index] else pixel
        for index, pixel in enumerate(data)
    ])

    alpha_box = rgba.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError(f"No foreground remained after cleanup: {source}")

    margin = 24
    left = max(0, alpha_box[0] - margin)
    top = max(0, alpha_box[1] - margin)
    right = min(width, alpha_box[2] + margin)
    bottom = min(source_height, alpha_box[3] + margin)
    cropped = rgba.crop((left, top, right, bottom))

    target_width = round(height * ratio)
    scale = min(target_width / cropped.width, height / cropped.height)
    scaled_size = (
        max(1, round(cropped.width * scale)),
        max(1, round(cropped.height * scale)),
    )
    scaled = cropped.convert("RGBa").resize(scaled_size, Image.Resampling.LANCZOS).convert("RGBA")
    output = Image.new("RGBA", (target_width, height), (0, 0, 0, 0))
    output.alpha_composite(
        scaled,
        ((target_width - scaled.width) // 2, (height - scaled.height) // 2),
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--ratio", type=float, required=True)
    parser.add_argument("--height", type=int, default=232)
    args = parser.parse_args()
    normalize(args.source, args.destination, args.ratio, args.height)


if __name__ == "__main__":
    main()
