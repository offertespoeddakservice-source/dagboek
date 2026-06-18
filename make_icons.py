#!/usr/bin/env python3
"""Genereert een rustig app-icoon (salie-achtergrond, wit spruitje)."""
import math
from PIL import Image, ImageDraw

M = 1024  # masterformaat


def lerp(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def make_master():
    top = (0x86, 0xB3, 0x9A)   # zacht salie
    bot = (0x6F, 0xA3, 0xA0)   # zacht teal
    img = Image.new("RGBA", (M, M), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    for y in range(M):
        d.line([(0, y), (M, y)], fill=lerp(top, bot, y / M) + (255,))
    draw_sprout(img)
    return img


def leaf_points(px, py, length, width, angle_deg, fullness=0.78, n=48):
    """Puntig blad: half-breedte volgt sin-curve (0 aan basis en punt)."""
    a = math.radians(angle_deg)
    dirx, diry = math.sin(a), -math.cos(a)      # 'omhoog' getild
    perpx, perpy = math.cos(a), math.sin(a)     # loodrecht
    left, right = [], []
    for i in range(n + 1):
        u = i / n
        cx = px + dirx * length * u
        cy = py + diry * length * u
        hw = (width / 2) * (math.sin(math.pi * u) ** fullness)
        left.append((cx + perpx * hw, cy + perpy * hw))
        right.append((cx - perpx * hw, cy - perpy * hw))
    return left + right[::-1]


def draw_sprout(img):
    d = ImageDraw.Draw(img)
    cx = M / 2
    white = (250, 253, 249, 255)
    # stengel
    d.line([(cx, M * 0.74), (cx, M * 0.50)], fill=white, width=int(M * 0.028))
    d.ellipse([cx - M * 0.014, M * 0.74 - M * 0.014, cx + M * 0.014, M * 0.74 + M * 0.014], fill=white)
    # twee bladeren
    d.polygon(leaf_points(cx, M * 0.575, M * 0.30, M * 0.155, -42), fill=white)
    d.polygon(leaf_points(cx, M * 0.545, M * 0.30, M * 0.155, 42), fill=white)


def main():
    master = make_master().convert("RGB")
    for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
        master.resize((size, size), Image.LANCZOS).save(name)
        print("geschreven:", name)


if __name__ == "__main__":
    main()
