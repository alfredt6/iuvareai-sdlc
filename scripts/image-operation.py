#!/usr/bin/env python3
"""Bounded image inspection and editing helper for the Iuvare Pi extension.

Accepts one JSON request on stdin and emits one JSON result on stdout. Pillow is
the only non-standard dependency. The extension invokes this directly without a
shell so repository path policy remains in the TypeScript layer.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageColor, ImageEnhance, ImageFilter, ImageOps, ImageSequence
except ImportError:
    print("Pillow is required for image editing. Install it with: python -m pip install Pillow", file=sys.stderr)
    raise SystemExit(3)


MAX_INPUT_BYTES = 512 * 1024 * 1024
MAX_PIXELS = 100_000_000
MAX_FRAMES = 500

FORMATS = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".gif": "GIF",
    ".webp": "WEBP",
    ".bmp": "BMP",
}


def fail(message: str) -> None:
    raise ValueError(message)


def positive_int(value: object, name: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        fail(f"{name} must be a positive integer")
    return value


def finite_number(value: object, name: str) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        fail(f"{name} must be a number")
    result = float(value)
    if result != result or result in (float("inf"), float("-inf")):
        fail(f"{name} must be finite")
    return result


def transform(frame: Image.Image, request: dict) -> Image.Image:
    image = ImageOps.exif_transpose(frame).copy()

    crop = request.get("crop")
    if crop is not None:
        if not isinstance(crop, dict):
            fail("crop must be an object")
        x = crop.get("x", 0)
        y = crop.get("y", 0)
        if not isinstance(x, int) or isinstance(x, bool) or x < 0:
            fail("crop.x must be a non-negative integer")
        if not isinstance(y, int) or isinstance(y, bool) or y < 0:
            fail("crop.y must be a non-negative integer")
        width = positive_int(crop.get("width"), "crop.width")
        height = positive_int(crop.get("height"), "crop.height")
        if x + width > image.width or y + height > image.height:
            fail(f"crop rectangle exceeds {image.width}x{image.height} image bounds")
        image = image.crop((x, y, x + width, y + height))

    resize = request.get("resize")
    if resize is not None:
        if not isinstance(resize, dict):
            fail("resize must be an object")
        width = resize.get("width")
        height = resize.get("height")
        if width is None and height is None:
            fail("resize requires width or height")
        if width is not None:
            width = positive_int(width, "resize.width")
        if height is not None:
            height = positive_int(height, "resize.height")
        if width is None:
            width = max(1, round(image.width * height / image.height))
        if height is None:
            height = max(1, round(image.height * width / image.width))
        fit = resize.get("fit", "stretch")
        if fit == "cover":
            image = ImageOps.fit(image, (width, height), Image.Resampling.LANCZOS)
        elif fit == "contain":
            image = ImageOps.contain(image, (width, height), Image.Resampling.LANCZOS)
        elif fit == "stretch":
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        else:
            fail("resize.fit must be stretch, contain, or cover")

    rotate = request.get("rotate")
    if rotate is not None:
        degrees = finite_number(rotate, "rotate")
        image = image.rotate(-degrees, expand=True, resample=Image.Resampling.BICUBIC)

    flip = request.get("flip")
    if flip is not None:
        if flip not in ("horizontal", "vertical", "both"):
            fail("flip must be horizontal, vertical, or both")
        if flip in ("horizontal", "both"):
            image = ImageOps.mirror(image)
        if flip in ("vertical", "both"):
            image = ImageOps.flip(image)

    for key, enhancer in (
        ("brightness", ImageEnhance.Brightness),
        ("contrast", ImageEnhance.Contrast),
        ("saturation", ImageEnhance.Color),
        ("sharpness", ImageEnhance.Sharpness),
    ):
        if request.get(key) is not None:
            factor = finite_number(request[key], key)
            if factor < 0:
                fail(f"{key} must be zero or greater")
            image = enhancer(image).enhance(factor)

    if request.get("blur") is not None:
        radius = finite_number(request["blur"], "blur")
        if radius < 0:
            fail("blur must be zero or greater")
        image = image.filter(ImageFilter.GaussianBlur(radius))

    if request.get("grayscale"):
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        image = ImageOps.grayscale(image)
        if alpha is not None:
            image = Image.merge("LA", (image, alpha))

    return image


def jpeg_ready(image: Image.Image, background: str) -> Image.Image:
    if image.mode in ("RGBA", "LA") or "transparency" in image.info:
        rgba = image.convert("RGBA")
        backdrop = Image.new("RGBA", rgba.size, ImageColor.getcolor(background, "RGBA"))
        backdrop.alpha_composite(rgba)
        return backdrop.convert("RGB")
    return image.convert("RGB")


def validate_input(image: Image.Image, source: Path) -> None:
    if source.stat().st_size > MAX_INPUT_BYTES:
        fail("source image exceeds the 512 MB safety limit")
    if image.width * image.height > MAX_PIXELS:
        fail("source image exceeds the 100 megapixel safety limit")
    if getattr(image, "n_frames", 1) > MAX_FRAMES:
        fail(f"source image exceeds the {MAX_FRAMES}-frame safety limit")


def inspect_image(source: Path) -> dict:
    with Image.open(source) as image:
        validate_input(image, source)
        return {
            "source": str(source),
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "frames": getattr(image, "n_frames", 1),
            "animated": bool(getattr(image, "is_animated", False)),
        }


def edit_image(request: dict, source: Path, target: Path) -> dict:
    output_format = FORMATS.get(target.suffix.lower())
    if output_format is None:
        fail("target extension must be jpg, jpeg, png, gif, webp, or bmp")
    quality = request.get("quality", 90)
    if not isinstance(quality, int) or isinstance(quality, bool) or not 1 <= quality <= 100:
        fail("quality must be an integer from 1 to 100")
    background = request.get("background", "#ffffff")
    ImageColor.getcolor(background, "RGBA")

    with Image.open(source) as opened:
        validate_input(opened, source)
        source_info = dict(opened.info)
        frames = [transform(frame, request) for frame in ImageSequence.Iterator(opened)]
    if not frames:
        fail("image contains no frames")
    if len(frames) > 1 and output_format not in ("GIF", "WEBP"):
        fail("animated sources require a GIF or WebP target to preserve all frames")
    if frames[0].width * frames[0].height > MAX_PIXELS:
        fail("output image exceeds the 100 megapixel safety limit")

    if output_format == "JPEG":
        frames = [jpeg_ready(frame, background) for frame in frames]
    elif output_format == "GIF":
        frames = [frame.convert("RGBA") for frame in frames]

    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.{os.getpid()}.tmp")
    save_options: dict = {"format": output_format}
    if output_format in ("JPEG", "WEBP"):
        save_options["quality"] = quality
    if output_format == "PNG":
        save_options["optimize"] = True
    if len(frames) > 1 and output_format in ("GIF", "WEBP"):
        save_options.update(
            save_all=True,
            append_images=frames[1:],
            duration=source_info.get("duration", 100),
            loop=source_info.get("loop", 0),
        )
    try:
        frames[0].save(temporary, **save_options)
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()

    return {
        "source": str(source),
        "target": str(target),
        "format": output_format,
        "width": frames[0].width,
        "height": frames[0].height,
        "frames": len(frames) if output_format in ("GIF", "WEBP") else 1,
    }


def main() -> None:
    request = json.load(sys.stdin)
    if not isinstance(request, dict):
        fail("request must be an object")
    action = request.get("action")
    source = Path(request.get("source", ""))
    if action not in ("inspect", "edit", "convert"):
        fail("action must be inspect, edit, or convert")
    if not source.is_file():
        fail(f"source image does not exist: {source}")
    result = inspect_image(source) if action == "inspect" else edit_image(request, source, Path(request.get("target", "")))
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
