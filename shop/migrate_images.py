#!/usr/bin/env python3
"""Copy public, original product images to the independent shop."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import re

root = Path(__file__).resolve().parent
page = root / "index.html"
assets = root / "assets" / "products"
assets.mkdir(parents=True, exist_ok=True)
content = page.read_text("utf-8")
pattern = re.compile(r'https://shop-magic-maker-82\.lovable\.app/__l5e/assets-v1/[A-Za-z0-9-]+/(p\d+_\d+\.jpg)')
urls = sorted({m.group(0): m.group(1) for m in pattern.finditer(content)}.items())
written, failures = 0, []
for url, filename in urls:
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; LiAutoStoreMigrate/1.0)", "Accept": "image/*"})
        with urlopen(req, timeout=25) as response:
            data = response.read(8 * 1024 * 1024 + 1)
        if not (2000 < len(data) <= 8 * 1024 * 1024):
            raise ValueError("Invalid image size")
        if not data.startswith(bytes.fromhex("ffd8ff")):
            raise ValueError("Image is not a JPEG")
        (assets / filename).write_bytes(data)
        content = content.replace(url, "assets/products/" + filename)
        written += 1
        print("OK", filename, len(data), "bytes")
    except (URLError, HTTPError, TimeoutError, ValueError, OSError) as e:
        failures.append(filename)
        print("SKIPPED", filename, type(e).__name__, str(e)[:120])
if written:
    if "https://shop-magic-maker-82.lovable.app/__l5e/assets-v1/" not in content:
        content = content.replace("img-src 'self' data: https://shop-magic-maker-82.lovable.app", "img-src 'self' data:")
    page.write_text(content, encoding="utf-8")
print("IMAGES_MIGRATED", written, "IMAGES_MISSING", len(failures))
if failures:
    print("MISSING_FILES", ", ".join(failures))
