#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sube la version en los archivos de codigo (no toca la documentacion).

Actualiza:
  - index.html : anti-cache "?v=X.Y.Z" y los chips/pie "vX.Y.Z"
  - js/app.js  : const APP_VERSION = 'vX.Y.Z'
  - sw.js      : const CACHE_VERSION = 'vX.Y.Z'

Uso:
    python tools/bump-version.py 2.3.1
"""

import io
import os
import re
import sys

HTML_FILES = ["index.html"]
JS_FILES = ["js/app.js"]
SW_FILES = ["sw.js"]


def read(path):
    with io.open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(path, text):
    with io.open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


def main():
    if len(sys.argv) < 2:
        print("Uso: python tools/bump-version.py X.Y.Z")
        return 1
    version = sys.argv[1].lstrip("v")
    if not re.match(r"^\d+\.\d+\.\d+$", version):
        print("Version no valida: %s (se espera X.Y.Z)" % version)
        return 1

    changed = 0
    for path in HTML_FILES:
        if not os.path.exists(path):
            print("  falta %s" % path)
            continue
        text = read(path)
        new = re.sub(r"\?v=\d+\.\d+\.\d+", "?v=" + version, text)
        new = re.sub(
            r'(<span[^>]*id="(?:appVersion|appVersionChip)"[^>]*>)v?\d+\.\d+\.\d+(</span>)',
            r"\g<1>v" + version + r"\g<2>",
            new,
        )
        if new != text:
            write(path, new)
            changed += 1
        print("  %-14s -> v%s" % (path, version))

    for path in JS_FILES:
        if not os.path.exists(path):
            print("  falta %s" % path)
            continue
        text = read(path)
        new = re.sub(r"(const APP_VERSION = ')v?\d+\.\d+\.\d+(';)",
                     r"\g<1>v" + version + r"\g<2>", text)
        if new != text:
            write(path, new)
            changed += 1
        print("  %-14s -> v%s" % (path, version))

    for path in SW_FILES:
        if not os.path.exists(path):
            print("  falta %s" % path)
            continue
        text = read(path)
        new = re.sub(r"(const CACHE_VERSION = ')v?\d+\.\d+\.\d+(';)",
                     r"\g<1>v" + version + r"\g<2>", text)
        if new != text:
            write(path, new)
            changed += 1
        print("  %-14s -> v%s" % (path, version))

    print("Archivos actualizados: %d" % changed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
