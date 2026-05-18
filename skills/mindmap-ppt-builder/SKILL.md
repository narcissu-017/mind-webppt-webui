---
name: mindmap-ppt-builder
description: Create or update content for the agegr/mindmap-ppt static presentation project from a prose draft, article, speech, report, or notes. Use when Codex needs to turn a written document into the project's project/source.js Markdown mind-map data, choose which nodes need illustrations, generate or request GPT Image 2 illustrations matching the project's restrained presentation style, place assets under project/, and validate the result with npm run check. Operates only within the current working directory.
---

# Mindmap PPT Builder

## Goal

Turn a user-provided source document into a presentation-ready `project/source.js` for this repo. The source document may be pasted text in the conversation or a local text/Markdown file path supplied by the user. The output is a preorder mind-map: concise two-line nodes, optional node images, and local assets that match the current light PPT style.

Read `references/project-format.md` when you need exact project file conventions or visual constraints.

## Workspace Requirement

This skill operates only within the current working directory tree (cwd itself or a `mindmap-ppt/` subfolder under it). Do not search parent, sibling, or home directories for an existing checkout.

- Clone `https://github.com/agegr/mindmap-ppt` into `./mindmap-ppt/` under the current working directory and `cd` in.
- If `./mindmap-ppt/` already exists, stop and ask the user how to proceed. Do not `cd ..`, `find`, or otherwise probe the filesystem to locate or create a checkout elsewhere.
- Keep the application repository outside the skill folder. Do not copy or clone `index.html`, `src/`, or `project/` into `.agents/skills/mindmap-ppt-builder/`.
- Normal skill output should modify only `project/source.js` and local asset files under `project/`.
- Do not delete existing project assets unless the user explicitly asks for cleanup.
- Do not edit `src/`, `index.html`, or application behavior unless the user explicitly asks for implementation changes.

## Workflow

1. Get the user's source document:
   - Use pasted text from the conversation when provided.
   - If the user gives a local file path, read only that explicitly provided document file and use its contents.
   - If neither pasted text nor a readable local file is available, ask the user for the document before generating `project/source.js`.
2. Read the document and identify the presentation thesis.
   - Follow the source language by default: Chinese input -> Chinese output; English input -> English output.
   - For English output, still use an eyebrow/headline structure for two-line nodes when natural.
   - Do not silently correct facts. If the source has obvious contradictions or questionable claims, preserve the claim carefully or mention the conflict to the user.
   - For very long documents, preserve the original chapter structure first. If the material is too broad to reduce confidently, draft a high-level outline and ask the user to confirm priorities before finalizing.
3. Build a clear logic tree:
   - root: document/source name or presentation topic
   - major branches: usually 2-4 sections, but follow the source logic when another structure is clearer
   - child nodes: use them for causes, consequences, evidence, examples, process steps, contrasts, or supplements
   - depth: add levels only when nesting makes the author's logic easier to understand
4. Write each node as one unordered-list item plus an optional continuation line:

```md
- 副标题
  主标题
```

Use the first line as a short category label and the second line as the main message. Keep each line under about 30 Chinese characters or 8 English words. Prefer two-line labels for all visible nodes; use a single-line node only when the label is already extremely short and clear.

5. Choose image nodes and theme motion deliberately:
   - By default, create 2-3 theme-matched PPT illustrations for each deck unless the user explicitly requests more or fewer.
   - These theme illustrations should be generated with GPT Image 2 or the currently available image-generation tool and saved as raster assets under `project/generated/`.
   - The illustration style does not need to be flat vector. Choose a style that fits the source and audience: premium 3D CG, futuristic technology, editorial illustration, polished infographic, conceptual poster, light skeuomorphic UI, or restrained vector are all acceptable when appropriate.
   - In addition to the 2-3 generated raster illustrations, include at least one tasteful SVG animation effect in the web presentation. The SVG background/motion must match the deck theme, not reuse a generic template.
   - A mind-map necessarily omits a lot of source detail; use images to preserve or explain the omitted detail on high-information nodes.
   - Pick only 2-3 high-information nodes for a typical deck, such as the root overview, a key framework, a comparison, a process, or the final action loop. Short drafts may use 0-2 images.
   - Prefer nodes that summarize a process, architecture, comparison, timeline, metric, or conceptual model.
6. Generate illustrations for chosen nodes with GPT Image 2 or the available image generation tool. Save them under `project/` or a subfolder of `project/`.
   - Prefer PNG for generated raster illustrations and JPG for photo-like assets. Use SVG for code-native diagrams or subtle animation accents only.
   - Do not substitute SVG placeholders for user-requested GPT-generated PPT illustrations. If image generation is unavailable, clearly report that limitation and ask how to proceed.
7. Reference images in Markdown metadata lines:

```md
  @image process-overview.png
```

8. Replace `project/source.js` with:

```js
export const sourceMarkdown = `
- ...
`;
```

Escape backticks and `${...}` sequences before writing user-derived text inside the JavaScript template string.

After writing `project/source.js`, ensure the rendered HTML title matches the deck root title. Current runtime should set `document.title` from the root node; if the project uses an older runtime, update it or set the HTML title manually.

9. Run `npm run check`.
10. Optional visual validation: run `npm run dev` and inspect the URL printed by Vite (default `http://127.0.0.1:5173/`, may differ if the port is taken) when browser inspection is available.
11. When a portable single-file HTML export is requested or already exists, regenerate it after any runtime/style/source/image change. Verify the exported file has no external `src`/`href` dependencies, uses inline raster data URIs for local images, keeps the HTML title equal to the deck title, and can open directly as a local `file://` HTML.
12. Include a low-height viewport check for portable exports, especially around `748x484` as well as normal presentation sizes like `1920x1080`, so the floating controls do not cover the active node or generated illustrations.
13. For very low viewports around `max-height: 520px`, reduce the expanded active-node illustration size as needed; the control panel must not cover the root image or other key generated illustrations.

## Mindmap Authoring Rules

- Do not force every deck into a strict `root -> level 1 -> level 2 -> level 3` taxonomy. That shape is only a useful default, not a rule.
- Let the hierarchy express the author's logic structure. If cause A leads to result B, B can be a child node of A; if B further leads to result C, form an `A -> B -> C` subtree.
- Do not make decks feel templated. Pick a structure based on the document type: narrative, product pitch, technical argument, operational plan, course outline, or marketing campaign may all need different branch shapes and reveal rhythm.
- For narrative or promotional material, it is often better to organize by hook, world/setting, characters, conflict, signature scenes, emotional payoff, and launch message than by generic background/method/conclusion labels.
- The only hard principle is clarity: a reader should understand why each child node belongs under its parent and what relationship is being expressed.
- Follow the source order. This app reveals nodes in preorder: parent first, then all children. Do not move conclusions from later text into earlier parent labels.
- Do not repeat the root topic in child nodes. If the root already states the problem or theme, children should advance the story.
- Group nearby meanings under one parent. Keep backgrounds, criteria, risks, product/tool inventories, recommendations, and conclusions in their own coherent branches.
- Main nodes carry judgments; child nodes carry evidence, reasons, examples, or supplements. If a node explains another node, make it a child, not a sibling.
- Keep each parent to at most 5 children. If there are more, add grouping nodes.
- Split tools/products only when the source analyzes them one by one. Merge them when the source merely lists options in passing.
- Do not split sentence by sentence. One node should carry one complete small point.
- Each node should correspond to about 10-80 Chinese characters of source material (this is the source span a node covers, not its visible label length). Less than 10 is usually too fragmented; more than 80 usually needs splitting.
- Node text may be slightly longer than a normal title, but one node should not contain multiple independent ideas.
- Parent labels should summarize and navigate; child labels should reveal specifics. Avoid parent labels that spoil later details.
- Put images on high-information nodes, such as framework, comparison, inventory, recommendation, or risk-model nodes. Avoid images on very small detail nodes.

## Markdown And Image Example

Use `@image` as a metadata continuation line after the node's visible two-line label. The `@image` line is not displayed as node text.

```js
export const sourceMarkdown = `
- 产品发布
  三分钟讲清楚新功能
  @image overview.png
    - 用户痛点
      当前流程成本很高
      @image image-asset-1/pain-points.jpg
    - 解决方案
      自动整理文稿和插图
    - 演示效果
      像 PPT 一样逐步展开
      @image diagrams/demo-flow.svg
`;
```

Image paths are relative to `project/` by default:

- `@image overview.png` -> `./project/overview.png`
- `@image image-asset-1/pain-points.jpg` -> `./project/image-asset-1/pain-points.jpg`
- `@image diagrams/demo-flow.svg` -> `./project/diagrams/demo-flow.svg`

## Image Prompt Pattern

Use this style prompt for GPT Image 2:

```text
Create a polished presentation illustration for a light PPT mind-map node.
Subject: <node main idea>.
Include: <2-4 concrete visual elements from the source text>.
Style: choose a theme-matched visual language such as premium 3D CG, futuristic technology, editorial illustration, polished infographic, conceptual poster, light skeuomorphic UI, or restrained vector. Use a warm off-white or theme-appropriate light background, strong readable contrast, no logos, no watermark, minimal short text only when useful, and no busy decoration.
Composition: centered, generous whitespace, readable at thumbnail size, aspect ratio 16:10.
```

If the source needs a real chart, diagram, or screenshot, create a simple diagrammatic illustration instead of inventing precise numbers. Prefer no text in images; when text improves comprehension, use only 1-3 short labels or keywords and keep detailed labels in nodes.

## Theme SVG Motion Pattern

When adding a separate code-native diagram/animation accent, create a polished animated SVG rather than a plain placeholder:

- Size: `1280x800`.
- Style: derive colors and shapes from the deck theme. Do not reuse a previous deck's exact background, flow lines, cards, or palette.
- Content: use theme-specific motifs, such as starlight routes for RPG, lens rails and spotlights for film, data streams for technology, or paper/workflow paths for knowledge work.
- Minimal short text only when useful; no logos, dense decoration, or photorealism.
- Motion: subtle `@keyframes` animations for path flow, pulse, float, staged reveal, or loop movement. Avoid fast, distracting, or decorative-only movement.
- Web integration: SVG animation layers must use `pointer-events: none`, stay behind or around active content, and avoid covering readable text or node images.

## Image And Asset Rules

- Use `@image` only after the node's title line, before its children.
- Use PNG, JPG/JPEG, or SVG assets.
- Save image files under `project/` or a subfolder of `project/`.
- Prefer short `@image` values relative to `project/`, e.g. `@image user-journey.png`, `@image diagrams/user-journey.png`, or `@image image-asset-1/a.jpg`.

## Validation Checklist

- `project/source.js` exports `sourceMarkdown`.
- Asset files exist for every `@image`.
- `npm run check` passes.
