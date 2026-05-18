const { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { createServer } = require("node:http");
const { basename, extname, join, normalize, relative, resolve } = require("node:path");
const { URL } = require("node:url");

const launcherDir = __dirname;
const workspaceDir = resolve(launcherDir, "..");
const configPath = join(launcherDir, "config.json");
const host = "127.0.0.1";
const port = Number(process.env.MINDMAP_LAUNCHER_PORT || 5188);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const defaultProjectDir = resolve(workspaceDir, "mindmap-ppt");
const defaultConfig = {
  projectDir: defaultProjectDir,
  projects: [{ projectDir: defaultProjectDir, addedAt: new Date().toISOString() }, ...discoverBundledProjects()],
};

function discoverBundledProjects() {
  const examplesDir = resolve(workspaceDir, "examples");
  if (!existsSync(examplesDir)) {
    return [];
  }

  return readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ projectDir: resolve(examplesDir, entry.name), addedAt: new Date().toISOString() }))
    .filter((record) => validateProject(record.projectDir).ok);
}

function loadConfig() {
  try {
    return normalizeConfig(JSON.parse(readFileSync(configPath, "utf8")));
  } catch {
    return normalizeConfig(defaultConfig);
  }
}

function saveConfig(config) {
  writeFileSync(configPath, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`, "utf8");
}

function normalizeConfig(config) {
  const projectDir = resolve(String(config.projectDir || defaultProjectDir));
  const candidates = [];

  if (Array.isArray(config.projects)) {
    candidates.push(...config.projects);
  }

  if (Array.isArray(config.recentProjects)) {
    candidates.push(...config.recentProjects);
  }

  candidates.push(projectDir);

  const seen = new Set();
  const projects = [];
  candidates.forEach((item) => {
    const record = normalizeProjectRecord(item);
    if (!record || seen.has(record.projectDir)) {
      return;
    }

    seen.add(record.projectDir);
    projects.push(record);
  });

  return {
    projectDir,
    projects: projects.slice(0, 80),
    recentProjects: projects.map((item) => item.projectDir).slice(0, 80),
  };
}

function normalizeProjectRecord(item) {
  const rawProjectDir = typeof item === "string" ? item : item?.projectDir;
  if (!rawProjectDir) {
    return null;
  }

  return {
    projectDir: resolve(String(rawProjectDir)),
    addedAt: typeof item === "object" && item?.addedAt ? item.addedAt : new Date().toISOString(),
  };
}

function validateProject(projectDir) {
  const required = ["index.html", "src/main.js", "src/styles.css", "project/source.js"];
  const missing = required.filter((item) => !existsSync(join(projectDir, item)));

  return {
    ok: missing.length === 0,
    projectDir,
    missing,
    openUrl: "/project/index.html",
  };
}

function getConfigPayload(config) {
  const normalized = normalizeConfig(config);
  const validation = validateProject(normalized.projectDir);
  const projects = normalized.projects.map((record) => getProjectSummary(record, normalized.projectDir));
  const currentProject = projects.find((item) => item.projectDir === normalized.projectDir) || null;

  return {
    config: normalized,
    validation,
    currentProject,
    projects,
  };
}

function getProjectSummary(record, currentProjectDir) {
  const validation = validateProject(record.projectDir);
  const meta = readProjectMeta(record.projectDir);
  const sourcePath = join(record.projectDir, "project/source.js");
  let updatedAt = record.addedAt;

  try {
    updatedAt = statSync(sourcePath).mtime.toISOString();
  } catch {
    // Keep the recorded time when the source file is not available.
  }

  return {
    projectDir: record.projectDir,
    name: meta.title || basename(record.projectDir),
    subtitle: meta.subtitle || "未读取到标题",
    nodeCount: meta.nodeCount,
    imageCount: meta.imageCount,
    updatedAt,
    addedAt: record.addedAt,
    isCurrent: record.projectDir === currentProjectDir,
    valid: validation.ok,
    missing: validation.missing,
    openUrl: validation.openUrl,
    exportUrl: `/api/export/portable-html?projectDir=${encodeURIComponent(record.projectDir)}`,
  };
}

function readProjectMeta(projectDir) {
  const sourcePath = join(projectDir, "project/source.js");
  if (!existsSync(sourcePath)) {
    return { title: "", subtitle: "", nodeCount: 0, imageCount: 0 };
  }

  const sourceJs = readFileSync(sourcePath, "utf8");
  const markdown = extractSourceMarkdown(sourceJs);
  if (!markdown) {
    return { title: basename(projectDir), subtitle: "", nodeCount: 0, imageCount: 0 };
  }

  const rootLabel = extractRootLabel(markdown);
  const heading = splitLabel(rootLabel || basename(projectDir));
  const nodeCount = (markdown.match(/^\s*-\s+/gm) || []).length;
  const imageCount = (markdown.match(/^\s*@image\s+/gm) || []).length;

  return {
    title: heading.title,
    subtitle: heading.subtitle,
    nodeCount,
    imageCount,
  };
}

function extractSourceMarkdown(sourceJs) {
  const match = sourceJs.match(/export\s+const\s+sourceMarkdown\s*=\s*`([\s\S]*?)`;/);
  return match ? match[1] : "";
}

function extractRootLabel(markdown) {
  const lines = markdown.split(/\r?\n/);
  const rootIndex = lines.findIndex((line) => /^-\s+/.test(line));
  if (rootIndex < 0) {
    return "";
  }

  const labelLines = [lines[rootIndex].replace(/^-\s+/, "").trim()];
  for (let index = rootIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*-\s+/.test(line)) {
      break;
    }

    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("@image ")) {
      labelLines.push(trimmed);
    }
  }

  return labelLines.join("\n");
}

function splitLabel(label) {
  const [subtitle, ...titleLines] = String(label || "").split("\n");
  const title = titleLines.length > 0 ? titleLines.join(" / ") : subtitle;
  return { subtitle, title };
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function sendText(response, status, text, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(text),
    ...extraHeaders,
  });
  response.end(text);
}

function parseBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        rejectBody(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function safeFileFromRoot(rootDir, pathname, fallback = "/index.html") {
  const decoded = decodeURIComponent(pathname);
  if (decoded === "/" || decoded === "") {
    return resolve(join(rootDir, fallback.replace(/^[/\\]+/, "")));
  }

  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = safePath === "/" ? fallback : safePath;
  const relativePath = requestedPath.replace(/^[/\\]+/, "");
  const filePath = resolve(join(rootDir, relativePath));
  const root = resolve(rootDir);

  if (filePath !== root && !filePath.startsWith(`${root}\\`) && !filePath.startsWith(`${root}/`)) {
    return null;
  }

  return filePath;
}

function serveFile(response, filePath) {
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      sendText(response, 404, "Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Length": stats.size,
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, "Not found");
  }
}

async function handleApi(request, response, url) {
  const config = loadConfig();

  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, getConfigPayload(config));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export/portable-html") {
    handlePortableExport(response, config, url);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/config") {
    try {
      const body = JSON.parse(await parseBody(request));
      const nextProjectDir = resolve(String(body.projectDir || ""));
      const nextConfig = normalizeConfig({
        projectDir: nextProjectDir,
        projects: [...config.projects, { projectDir: nextProjectDir }],
      });
      const validation = validateProject(nextConfig.projectDir);
      saveConfig(nextConfig);
      sendJson(response, validation.ok ? 200 : 422, getConfigPayload(nextConfig));
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Invalid request." });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/projects/remove") {
    try {
      const body = JSON.parse(await parseBody(request));
      const removeDir = resolve(String(body.projectDir || ""));
      const projects = config.projects.filter((record) => record.projectDir !== removeDir);
      const fallbackDir = projects[0]?.projectDir || defaultProjectDir;
      const nextConfig = normalizeConfig({
        projectDir: config.projectDir === removeDir ? fallbackDir : config.projectDir,
        projects,
      });
      saveConfig(nextConfig);
      sendJson(response, 200, getConfigPayload(nextConfig));
    } catch (error) {
      sendJson(response, 400, { error: error.message || "Invalid request." });
    }
    return;
  }

  sendJson(response, 404, { error: "Unknown API endpoint." });
}

function handlePortableExport(response, config, url) {
  const requestedProjectDir = url.searchParams.get("projectDir") || config.projectDir;
  const isInlinePreview = url.searchParams.get("inline") === "1";
  const projectDir = resolve(String(requestedProjectDir));
  const validation = validateProject(projectDir);

  if (!validation.ok) {
    sendText(response, 422, `Invalid mindmap-ppt project. Missing: ${validation.missing.join(", ")}`);
    return;
  }

  try {
    const { html, title } = buildPortableHtml(projectDir);
    const unicodeFilename = `${slugify(title || basename(projectDir))}.html`;
    const asciiFilename = `${asciiSlug(title || basename(projectDir)) || "mindmap-ppt"}.html`;
    const headers = isInlinePreview
      ? {}
      : {
          "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(unicodeFilename)}`,
        };
    sendText(response, 200, html, "text/html; charset=utf-8", headers);
  } catch (error) {
    sendText(response, 500, error.message || "Export failed");
  }
}

function buildPortableHtml(projectDir) {
  const indexHtml = readFileSync(join(projectDir, "index.html"), "utf8");
  const styles = readFileSync(join(projectDir, "src/styles.css"), "utf8");
  const mainJs = readFileSync(join(projectDir, "src/main.js"), "utf8");
  const sourceJs = readFileSync(join(projectDir, "project/source.js"), "utf8");
  const markdown = inlineMarkdownImages(projectDir, extractSourceMarkdown(sourceJs));
  const heading = splitLabel(extractRootLabel(markdown));
  const title = heading.title || basename(projectDir);
  const inlineMain = mainJs.replace(/import\s+\{\s*sourceMarkdown\s*\}\s+from\s+["'][^"']+source\.js["'];\s*/m, "");
  const inlineScript = `const sourceMarkdown = \`${escapeTemplateContent(markdown)}\`;\n${inlineMain}`;

  let html = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<link\s+rel="stylesheet"\s+href="\.\/src\/styles\.css"\s*\/?>/i, `<style>\n${escapeStyle(styles)}\n</style>`)
    .replace(
      /<script\s+type="module"\s+src="\.\/src\/main\.js"><\/script>/i,
      `<script>\n${escapeScript(inlineScript)}\n</script>`,
    );

  return { html, title };
}

function inlineMarkdownImages(projectDir, markdown) {
  return markdown.replace(/^(\s*@image\s+)(\S[^\r\n]*)$/gm, (match, prefix, imagePath) => {
    const trimmedPath = imagePath.trim();
    if (/^(https?:|data:)/.test(trimmedPath)) {
      return match;
    }

    const filePath = resolveImagePath(projectDir, trimmedPath);
    if (!filePath || !existsSync(filePath)) {
      return match;
    }

    const mime = mimeTypes[extname(filePath).toLowerCase()]?.replace(/;.*$/, "") || "application/octet-stream";
    const data = readFileSync(filePath).toString("base64");
    return `${prefix}data:${mime};base64,${data}`;
  });
}

function resolveImagePath(projectDir, imagePath) {
  const cleanPath = imagePath.replace(/^\.\/project\//, "").replace(/^project\//, "");
  if (/^(\/|\.\.\/)/.test(cleanPath)) {
    return null;
  }

  const filePath = resolve(join(projectDir, "project", cleanPath));
  const projectRoot = resolve(projectDir);
  const rel = relative(projectRoot, filePath);
  if (rel.startsWith("..") || rel === "") {
    return null;
  }

  return filePath;
}

function escapeTemplateContent(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeStyle(value) {
  return String(value).replace(/<\/style/gi, "<\\/style");
}

function escapeScript(value) {
  return String(value).replace(/<\/script/gi, "<\\/script");
}

function slugify(value) {
  return (
    String(value)
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "mindmap-ppt"
  );
}

function asciiSlug(value) {
  return String(value)
    .trim()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function handleProject(request, response, url) {
  const config = loadConfig();
  const validation = validateProject(config.projectDir);
  if (!validation.ok) {
    sendText(response, 422, `Invalid mindmap-ppt project. Missing: ${validation.missing.join(", ")}`);
    return;
  }

  const projectPath = url.pathname.replace(/^\/project/, "") || "/";
  const filePath = safeFileFromRoot(config.projectDir, projectPath);
  if (!filePath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  serveFile(response, filePath);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);

  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }

  if (url.pathname === "/project" || url.pathname.startsWith("/project/")) {
    handleProject(request, response, url);
    return;
  }

  const filePath = safeFileFromRoot(join(launcherDir, "static"), url.pathname);
  if (!filePath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  serveFile(response, filePath);
});

server.listen(port, host, () => {
  saveConfig(loadConfig());
  console.log(`Mindmap PPT Launcher: http://${host}:${port}/`);
});
