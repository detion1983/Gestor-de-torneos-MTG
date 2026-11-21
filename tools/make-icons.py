#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera los iconos de la PWA a partir del favicon cuadrado de la app.

Salida en assets/images/icons/:
    icon-192.png          192x192  (Android / Chrome, icono normal)
    icon-512.png          512x512  (Android / Chrome, icono normal)
    icon-maskable-512.png 512x512  (Android adaptativo, logo centrado)
    apple-touch-icon.png  180x180  (iPhone / iPad, pantalla de inicio)

Uso:
    python tools/make-icons.py
"""

import os

from PIL import Image, ImageOps

SRC = os.path.join("assets", "images", "favicon.png")
OUT_DIR = os.path.join("assets", "images", "icons")
BACKGROUND = (8, 7, 13, 255)
ICON_SCALE = 0.86
MASKABLE_SCALE = 0.70
APPLE_SCALE = 0.88


def load_logo():
    if not os.path.exists(SRC):
        raise SystemExit("Falta %s" % SRC)
    logo = Image.open(SRC).convert("RGBA")
    # Si el PNG trae margenes transparentes, se recortan para que el dibujo
    # ocupe el icono y no quede pequeno en el centro.
    bbox = logo.getchannel("A").getbbox()
    return logo.crop(bbox) if bbox else logo


def resize_logo(logo, size, scale=ICON_SCALE):
    """Escala el logo al tamano pedido sin deformarlo y sobre fondo opaco."""
    inner = max(1, int(round(size * scale)))
    scaled = ImageOps.contain(logo, (inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def make_maskable(logo, size):
    """Version con margen de seguridad para las mascaras de Android."""
    return resize_logo(logo, size, MASKABLE_SCALE)


def main():
    logo = load_logo()
    os.makedirs(OUT_DIR, exist_ok=True)

    outputs = [
        ("icon-192.png", resize_logo(logo, 192)),
        ("icon-512.png", resize_logo(logo, 512)),
        ("icon-maskable-512.png", make_maskable(logo, 512)),
        ("apple-touch-icon.png", resize_logo(logo, 180, APPLE_SCALE)),
    ]

    for name, image in outputs:
        path = os.path.join(OUT_DIR, name)
        image.save(path, "PNG", optimize=True)
        print("  %-24s %dx%d" % (name, image.width, image.height))

    print("Iconos PWA generados en %s" % OUT_DIR)


if __name__ == "__main__":
    main()
