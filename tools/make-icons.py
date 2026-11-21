#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera los iconos de la PWA y el favicon a partir del logo oficial de la app.

Salida:
    assets/images/icons/icon-192.png          192x192  (Android / Chrome)
    assets/images/icons/icon-512.png          512x512  (Android / Chrome)
    assets/images/icons/icon-maskable-512.png 512x512  (Android adaptativo)
    assets/images/icons/apple-touch-icon.png  180x180  (iPhone / iPad)
    assets/images/favicon.png                 64x64   (pestaña del navegador)
    assets/images/favicon.ico                 ICO      (navegadores antiguos)

El logo oficial está en assets/images/logo.jpg. Si lo sustituyes, vuelve a
ejecutar este script para regenerar todos los iconos con la misma imagen.

Uso:
    python tools/make-icons.py
"""

import os

from PIL import Image, ImageOps

SRC = os.path.join("assets", "images", "logo.jpg")
OUT_DIR = os.path.join("assets", "images", "icons")
IMAGE_DIR = os.path.join("assets", "images")
BACKGROUND = (8, 7, 13, 255)
ICON_SCALE = 1.0
MASKABLE_SCALE = 0.62
APPLE_SCALE = 0.92
FAVICON_SIZE = 64


def load_logo():
    if not os.path.exists(SRC):
        raise SystemExit("Falta %s" % SRC)
    logo = Image.open(SRC).convert("RGBA")
    # Un PNG con transparencia puede traer margenes vacios; se recortan para
    # que el dibujo ocupe el icono. El JPEG oficial no tiene alpha, asi que
    # conserva su encuadre cuadrado completo.
    bbox = logo.getchannel("A").getbbox()
    if bbox and bbox != (0, 0, logo.width, logo.height):
        return logo.crop(bbox)
    return logo


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


def save_png(image, path, quantize=False):
    if quantize:
        # Los iconos grandes son fotorrealistas: una paleta de 256 colores
        # conserva el detalle visible y reduce mucho el peso en GitHub Pages.
        image = image.convert("RGB").quantize(
            colors=256,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
    image.save(path, "PNG", optimize=True)
    print("  %-32s %dx%d" % (os.path.basename(path), image.width, image.height))


def main():
    logo = load_logo()
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)

    outputs = [
        (os.path.join(OUT_DIR, "icon-192.png"), resize_logo(logo, 192), False),
        (os.path.join(OUT_DIR, "icon-512.png"), resize_logo(logo, 512), True),
        (os.path.join(OUT_DIR, "icon-maskable-512.png"), make_maskable(logo, 512), True),
        (os.path.join(OUT_DIR, "apple-touch-icon.png"), resize_logo(logo, 180, APPLE_SCALE), False),
        (os.path.join(IMAGE_DIR, "favicon.png"), resize_logo(logo, FAVICON_SIZE), False),
    ]

    for path, image, quantize in outputs:
        save_png(image, path, quantize)

    favicon = resize_logo(logo, FAVICON_SIZE)
    favicon.save(os.path.join(IMAGE_DIR, "favicon.ico"), format="ICO",
                 sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("  %-32s %s" % ("favicon.ico", "16/32/48/64"))

    print("Iconos PWA y favicon generados en %s" % OUT_DIR)


if __name__ == "__main__":
    main()
