from __future__ import annotations

from pathlib import Path
from math import hypot
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "zion-neural-cable-preview.png"
FONT_PATH = Path(r"D:\pi-martix-ui\src\renderer\src\assets\fonts\Matrix-Code.ttf")

W, H = 1420, 885
BG = (0, 0, 0, 0)
MUTED = (29, 167, 84)
MID = (35, 196, 104)
FG = (61, 255, 143)
BRIGHT = (194, 255, 217)
DARK = (1, 10, 4)


def cubic(a, b, c, d, t):
    u = 1 - t
    return (
        u**3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t**3 * d[0],
        u**3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t**3 * d[1],
    )


def route(target_y, lane):
    sx, sy, tx = 160, 109, 102
    bus = 12 + lane * 6
    exit_x = 48 + lane * 6
    segments = [
        ((sx, sy), (132, sy + lane * 2), (86 + lane * 4, 112 + lane * 4), (exit_x, 148 + lane * 3)),
        ((exit_x, 148 + lane * 3), (22 + lane * 6, 172 + lane * 5), (bus, 192 + lane * 5), (bus, 224 + lane * 4)),
        ((bus, 224 + lane * 4), (bus, target_y - 104), (bus, target_y - 48), (bus, target_y - 30)),
        ((bus, target_y - 30), (bus, target_y - 8), (48, target_y), (tx, target_y)),
    ]
    pts = []
    for seg in segments:
        for step in range(25):
            pts.append(cubic(*seg, step / 25))
    pts.append((tx, target_y))
    return pts


def point_at(points, distance):
    remaining = distance
    for a, b in zip(points, points[1:]):
        length = hypot(b[0] - a[0], b[1] - a[1])
        if remaining <= length:
            t = 0 if length == 0 else remaining / length
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        remaining -= length
    return points[-1]


def path_length(points):
    return sum(hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:]))


def draw_dashed(draw, points, color, width, dash=6, gap=5):
    total = path_length(points)
    d = 0.0
    while d < total:
        a = point_at(points, d)
        b = point_at(points, min(total, d + dash))
        draw.line((a, b), fill=color, width=width)
        d += dash + gap


def draw_terminal(draw, x, y, source=False):
    if source:
        draw.rectangle((x - 14, y - 8, x - 4, y + 8), fill=DARK + (245,), outline=MUTED + (210,), width=1)
        draw.rectangle((x - 12, y - 4, x - 2, y - 2), fill=FG + (230,))
        draw.rectangle((x - 12, y + 2, x - 2, y + 4), fill=FG + (230,))
    else:
        draw.rectangle((x, y - 8, x + 12, y + 8), fill=DARK + (245,), outline=MUTED + (210,), width=1)
        draw.rectangle((x + 2, y - 4, x + 10, y - 2), fill=FG + (230,))
        draw.rectangle((x + 2, y + 2, x + 10, y + 4), fill=FG + (230,))


def main():
    image = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT_PATH), 11) if FONT_PATH.exists() else ImageFont.load_default()
    targets = [388, 479, 572]
    strings = ["ｱ0F<7+ｾA1*ｲ6", "01ｶ902Fｷ403Bｸ8", "AF3ｹ7C<09ｺE2"]

    for lane, target_y in enumerate(targets):
        points = route(target_y, lane)
        active = lane == 1
        draw_dashed(draw, points, MUTED + (58,), 1, 1, 7)
        draw_dashed(draw, points, MID + ((158 if active else 88),), 1, 6, 5)
        total = path_length(points)
        chars = strings[lane]
        for i, distance in enumerate(range(12, int(total - 26), 17)):
            x, y = point_at(points, distance)
            alpha = 174 if active else 112
            draw.text((round(x), round(y)), chars[i % len(chars)], font=font, anchor="mm", fill=(FG if active else MID) + (alpha,))
        draw.rectangle((7 + lane * 6, 258 + lane * 52, 17 + lane * 6, 272 + lane * 52), fill=DARK + (240,), outline=MUTED + (180,), width=1)
        draw_terminal(draw, 102, target_y)

        if active:
            head = total * 0.88
            pulse = "ｱ71EF0ｶ9+2C<>*A6B3"
            for i in range(18):
                x, y = point_at(points, max(0, head - i * 8))
                color = BRIGHT if i == 0 else FG
                alpha = 242 if i == 0 else int(max(0, (1 - i / 18) * 178))
                draw.text((round(x), round(y)), pulse[i], font=font, anchor="mm", fill=color + (alpha,))

    draw_terminal(draw, 160, 109, source=True)
    image.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
