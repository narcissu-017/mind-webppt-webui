# Mind WebPPT WebUI

一个用于生成、预览、管理和导出 Web 版 Mindmap PPT 的本地工具包。它包含一个可安装的 Codex Skill，以及一个用于日常查看、管理、导出项目的 WebUI。

> 项目的原型和灵感来源于：[agegr/mindmap-ppt](https://github.com/agegr/mindmap-ppt)

## 项目简介

Mind WebPPT WebUI 适合把流程文档、演讲稿、长文草稿、产品说明、创意设定、课程大纲等内容，整理成带有思维导图结构的网页演示文稿。

生成后的演示文稿是一个静态网页，支持逐页讲解、节点导航、缩放查看和便携导出。配合 Skill 使用时，可以用自然语言直接描述需求，让 Codex 根据文档内容生成更完整的 Mindmap PPT 项目。

## 核心能力

| 能力 | 说明 |
|---|---|
| 文档转演示 | 将文档、笔记、演讲稿或大纲转换为 Mindmap PPT |
| 主题化视觉 | 根据内容主题生成背景、颜色、字体层级和 SVG 动效 |
| 插图支持 | 在可用条件下，为演示项目加入 2-3 张契合主题的插图 |
| WebUI 管理 | 打开、搜索、切换、预览和管理多个本地演示项目 |
| 便携导出 | 导出为单个 HTML 文件，方便复制到其他机器演示 |
| 离线演示 | 导出的 HTML 会内联页面、脚本、样式和本地图片资源 |

## 快速开始

### 1. 安装 Skill

仓库发布到 GitHub 后，可以使用下面的命令安装 Skill：

```bash
npx skills add <github-owner>/mind-webppt-webui --skill mindmap-ppt-builder
```

将 `<github-owner>` 替换为实际发布该仓库的 GitHub 用户名或组织名。

安装后，可以在 Codex 中用一句话生成演示项目，例如：

```text
请根据 docs/xxxxx.md 制作一个 mindmap-ppt，标题根据内容重新生成。
```

Skill 会根据内容创建或更新 `project/source.js`，挑选适合插图的重点页面，将资源放入项目目录，并对演示效果做基础检查。

### 2. 启动 WebUI

运行环境：

- Node.js 18 或更新版本
- Chromium、Edge、Chrome、Firefox、Safari 等现代浏览器

Windows 用户可以直接运行：

```bat
start-launcher.cmd
```

其他平台可以使用：

```bash
npm start
```

启动后打开：

```text
http://127.0.0.1:5188/
```

如果还没有本地配置，WebUI 会默认加载模板项目和仓库内置示例。

## WebUI 能做什么

- 打开当前演示项目
- 添加新的项目目录
- 在多个项目之间快速切换
- 按项目名称、路径和时间搜索
- 预览演示文稿
- 导出便携单文件 HTML
- 管理最近使用的项目

WebUI 更适合个人日常制作和整理 Mindmap PPT：生成项目后，可以不用反复复制文件路径，直接在管理界面打开、预览和导出。

## 示例项目

仓库中包含两个示例项目，可用于了解最终效果和目录组织方式：

| 示例 | 说明 |
|---|---|
| `examples/jrpg-concept/` | 日式 RPG 游戏原案示例：失落群岛的记忆巡礼 |
| `examples/3d-animation-movie-promo/` | 3D 动画电影宣传示例：当航线消失勇气成为地图 |

## 目录结构

```text
mind-webppt-webui/
├── launcher/                       WebUI 管理器和导出服务
├── mindmap-ppt/                    默认演示模板
├── examples/
│   ├── jrpg-concept/               示例：失落群岛的记忆巡礼
│   └── 3d-animation-movie-promo/   示例：当航线消失勇气成为地图
├── skills/
│   └── mindmap-ppt-builder/        可安装的 Codex Skill
├── start-launcher.cmd              Windows 启动脚本
└── package.json
```

## 创建新的 Mindmap PPT

推荐流程：

1. 准备一份文档、笔记、演讲稿或内容大纲。
2. 在 Codex 中使用已安装的 `mindmap-ppt-builder` Skill。
3. 用自然语言说明主题、受众、风格、时长或特殊要求。
4. 在 WebUI 中打开生成后的项目并检查效果。
5. 演示前导出便携单文件 HTML。

例如：

```text
请根据 docs/xxxxxx.md 制作一个 mindmap-ppt，标题根据内容重新生成。整体风格要适合产品发布会，导出前请检查页面适配和字体显示。
```

## 便携导出

WebUI 的导出功能会生成一个单独的 `.html` 文件，并尽量内联演示所需资源：

- HTML 页面结构
- CSS 样式
- JavaScript 运行逻辑
- `sourceMarkdown` 演示数据
- 本地图片资源的数据 URI

导出的文件适合复制、传输和在其他机器上直接打开演示，同时不会夹带无关的项目文件。

## 本地检查

可以运行下面的命令检查 WebUI 和默认演示运行时：

```bash
npm run check
```

该命令会检查启动器脚本和默认演示项目的基础运行状态。生成新演示项目后，也建议打开 WebUI 做一次预览，并测试便携导出文件是否可以独立打开。

## 适合的使用场景

- 把复杂文档整理成适合讲解的结构化演示
- 给课程、汇报、方案、创意设定制作网页 PPT
- 快速生成带有主题视觉和动效的 Mindmap PPT
- 管理多个本地演示项目
- 将演示项目打包成单个 HTML 文件带走展示

这只是一个 Codex 使用 Skills 的范例，你可以举一反三，使用自然语言描述你的想法，继续优化这个 Skill，并不断改进最终产出的幻灯片效果。
