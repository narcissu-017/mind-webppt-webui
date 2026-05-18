# Project Format Reference

## Repository

Target repo: `https://github.com/agegr/mindmap-ppt`

Core files:

- `project/source.js`: project content and image references.
- `project/`: project content and local illustration assets.
- `src/main.js`: parser, navigation, layout, camera, node/image rendering.
- `src/styles.css`: visual style and animations.
- `AGENTS.md`: source-of-truth project rules.

## `project/source.js`

Use this shape:

```js
export const sourceMarkdown = `
- Markdown Mindmap
  项目汇报思维导图演示
  @image overview.png
    - 需求分析
      用户目标与演示场景
`;
```

Parsing rules:

- Lines matching `- text` create nodes.
- Indented continuation lines add to the current node label.
- `@image path` attaches one image to the current node and is not visible text.
- Short image paths such as `overview.png` resolve to `./project/overview.png`.
- Nested short paths such as `image-asset-1/a.jpg` resolve to `./project/image-asset-1/a.jpg`.
- Explicit paths beginning with `./`, `../`, `/`, `http:`, `https:`, or `data:` are used as-is.
- Multiple `@image` lines on one node: last one wins.
- The tree is traversed preorder.

## Node Text

Two-line node convention:

- first line: subtitle/category, smaller text
- second line: main title, normal title text

Single-line nodes render as title only.

Control readouts collapse multiline labels into `subtitle / title`.

## Image Behavior

Images render inside node cards:

- selected image node: expanded image below text
- non-selected image node: thumbnail below text
- no image: no image space

Supported formats: PNG, JPG/JPEG, SVG via browser `<img>`.

Use `object-fit: contain`; avoid crop-dependent compositions.

## Current Visual Style

Match the existing presentation interaction style, but do not blindly reuse the same visual theme for every deck:

- background: derive from the topic and audience
- selected node: high-contrast theme color
- accent: one or two theme-appropriate highlight colors
- completed node fill: readable low-contrast tint related to the palette
- path node fill: near-white or theme paper/surface color
- restrained shadows
- small `8px` radii
- no heavy decorative effects, gradient blobs, dense textures, watermarks, logos, or dense text inside generated images
- generated raster illustrations may be premium 3D CG, cinematic concept art, technology interface, editorial illustration, polished infographic, light skeuomorphic UI, or restrained vector when it matches the topic

Project-specific theme guidance:

- Theme the `motion-layer` SVG and `src/styles.css` background for the document. RPG decks can use star routes, lantern pulses, constellations, or magic circles. Movie decks can use camera rails, spotlights, volumetric particles, frame lines, or premiere marquees. Technology decks can use data-flow paths, interface grids, or circuit traces.
- Keep the SVG motion `pointer-events: none` and visually behind content.
- Do not reuse a previous deck's exact SVG paths, cards, colors, or animation metaphor.
- The runtime should set `document.title` from the root node title; exported HTML should keep the same title.
- For portable sharing, prefer single-file HTML export with inlined CSS, JS, `sourceMarkdown`, and data URI images. Do not include `AGENTS.md`, `docs/`, `skills/`, `.git/`, or unreferenced old assets in portable output.
- After any runtime, style, source, or image change, regenerate the portable single-file HTML; never assume an old exported file picked up the latest fixes.
- Portable exports should use a normal inline `<script>` rather than a module script for safer direct `file://` opening.
- Check low-height windows around `748x484` and normal presentation windows such as `1920x1080`. In very low windows around `max-height: 520px`, shrink expanded active-node illustrations so the floating controls do not cover the root image or key generated illustrations.
- Typography should prioritize Chinese readability. Use a sans stack like `"Noto Sans SC", "Source Han Sans SC", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif`; use a serif stack for deck titles and important node titles when it fits the theme.
- Keep Chinese body/control text line-height at least `1.55`; use clearer 1.5px borders and restrained paper-like surfaces when building management UI.

## Camera And Layout Constraints

- Current path is horizontal.
- Already visited non-path branches appear above their parent.
- Unvisited nodes are hidden.
- Node sizes are real HTML/CSS sizes; do not rely on SVG text measurement.
- Links are SVG curves from node border to node border.
- Camera uses actual viewport size and only auto-scales when user changes the zoom slider.
