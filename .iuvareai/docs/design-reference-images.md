---
type: Methodology
title: "Design Reference Images"
description: "How agents inspect screenshots and visual assets before UI implementation."
tags: [methodology, design, images, vision]
timestamp: 2026-07-25
---

# Design Reference Images

Design screenshots are first-class task inputs. A Developer or UX lens may read
them directly; no special persona permission is required.

## Required workflow

1. Use a model whose metadata includes image input. In Pi run
   `/iuvare-vision`; switch with `/model` if necessary.
2. Add each image or its containing directory to the task capability `reads`:

   ```yaml
   reads:
     - docs/YBO-Screenshots/
     - docs/website/home-desktop.png
   ```

3. Before implementation, call the built-in `read` tool on every relevant
   `jpg`, `jpeg`, `png`, `gif`, `webp`, or `bmp`. Pi sends the image as a model
   attachment and auto-resizes large files.
4. Extract layout, hierarchy, spacing, typography, colors, components, states,
   and responsive intent. Record ambiguities instead of guessing.
5. Implement and compare the result against the references. Standard/Controlled
   UI work should receive independent visual and accessibility verification.

## Crop and edit images

Request the source in `reads`, the exact result in `writes`, and the `image`
command class. Use `iuvare_image_operation` rather than an unclassified shell
utility:

```yaml
reads: [docs/source.png]
writes: [docs/assets/hero-cropped.webp]
write_trees: []
deletes: []
commands: [image]
```

The tool can inspect pixel dimensions and frame count, then crop, resize
(`stretch`, `contain`, or `cover`), rotate, flip, convert formats, adjust
brightness/contrast/saturation/sharpness, blur, and make grayscale output. Use
`action: convert`; the exact target extension selects JPEG, PNG, GIF, WebP, or
BMP. Animated sources retain all frames when targeting GIF or WebP; conversion
to a static format is rejected rather than silently dropping frames. Edits run
in that order. Existing targets require explicit overwrite authorization.
After editing, call `read` on the output to verify the visual result.

The local runtime needs Python 3 with Pillow:

```bash
python -m pip install Pillow
```

## Pi settings and input options

- `images.blockImages` must be `false` (default).
- `terminal.showImages` controls whether the operator sees inline terminal
  previews; it does not determine whether the model receives the image.
- Images may also be pasted (`Alt+V` on Windows), dragged into a supported
  terminal, or referenced in print mode: `pi -p @screenshot.png "Review this"`.
- SVG is read as source text. Supply a PNG/JPEG screenshot when rendered visual
  fidelity matters. Convert PDF/mockup pages to supported raster images first.

## Security and quality

Do not use images containing secrets, credentials, or real PII. Crop or sanitize
references before adding them to agent context. Screenshots are evidence, not a
complete specification: accessibility, error states, keyboard behavior, and
responsive behavior still require explicit acceptance criteria.
