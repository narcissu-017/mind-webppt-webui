const projectForm = document.querySelector("#projectForm");
const projectDir = document.querySelector("#projectDir");
const currentCard = document.querySelector("#currentCard");
const statusTitle = document.querySelector("#statusTitle");
const currentName = document.querySelector("#currentName");
const currentSubtitle = document.querySelector("#currentSubtitle");
const currentPath = document.querySelector("#currentPath");
const projectSearch = document.querySelector("#projectSearch");
const projectCount = document.querySelector("#projectCount");
const projectList = document.querySelector("#projectList");
const previewFrame = document.querySelector("#previewFrame");
const previewTitle = document.querySelector("#previewTitle");
const previewMeta = document.querySelector("#previewMeta");
const refreshPreview = document.querySelector("#refreshPreview");
const openProject = document.querySelector("#openProject");
const exportCurrent = document.querySelector("#exportCurrent");

let appState = null;

async function fetchConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error("配置读取失败");
  }

  return response.json();
}

async function saveProject(nextProjectDir) {
  const response = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectDir: nextProjectDir }),
  });
  const payload = await response.json();
  renderState(payload, { preserveFocus: true });

  if (!response.ok) {
    throw new Error(payload.validation?.missing?.join(", ") || payload.error || "目录不可用");
  }
}

async function removeProject(targetProjectDir) {
  const response = await fetch("/api/projects/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectDir: targetProjectDir }),
  });
  const payload = await response.json();
  renderState(payload);

  if (!response.ok) {
    throw new Error(payload.error || "移除失败");
  }
}

function renderState(payload, options = {}) {
  const activeProjectDir = document.activeElement?.dataset?.projectDir || "";
  appState = payload;
  const { config, currentProject, validation, projects } = payload;
  const current = currentProject || projectFromValidation(config.projectDir, validation);
  const openUrl = `${validation.openUrl}?t=${Date.now()}`;

  if (document.activeElement !== projectDir) {
    projectDir.value = config.projectDir;
  }

  currentCard.classList.toggle("ok", validation.ok);
  currentCard.classList.toggle("bad", !validation.ok);
  statusTitle.textContent = validation.ok ? "项目可打开" : "目录需要检查";
  currentName.textContent = current.name;
  currentSubtitle.textContent = validation.ok ? current.subtitle : `缺少：${validation.missing.join("、")}`;
  currentPath.textContent = current.projectDir;
  previewTitle.textContent = current.name;
  previewMeta.textContent = [current.subtitle, `${current.nodeCount || 0} 节点`, `${current.imageCount || 0} 图`]
    .filter(Boolean)
    .join(" · ");
  openProject.href = openUrl;
  exportCurrent.href = current.exportUrl || `/api/export/portable-html?projectDir=${encodeURIComponent(current.projectDir)}`;
  previewFrame.src = validation.ok ? openUrl : "about:blank";
  renderProjectList(projects);

  if (options.preserveFocus && activeProjectDir) {
    findProjectButton(activeProjectDir)?.focus();
  }
}

function projectFromValidation(projectDirValue, validation) {
  return {
    projectDir: projectDirValue,
    name: shortName(projectDirValue),
    subtitle: validation.ok ? "当前项目" : "目录不可用",
    nodeCount: 0,
    imageCount: 0,
    exportUrl: `/api/export/portable-html?projectDir=${encodeURIComponent(projectDirValue)}`,
  };
}

function renderProjectList(projects) {
  const query = projectSearch.value.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    const haystack = `${project.name} ${project.subtitle} ${project.projectDir}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  projectCount.textContent = `${filteredProjects.length}/${projects.length}`;

  if (filteredProjects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的项目";
    projectList.replaceChildren(empty);
    return;
  }

  projectList.replaceChildren(
    ...filteredProjects.map((project) => {
      const card = document.createElement("article");
      card.className = "project-item";
      card.classList.toggle("active", project.isCurrent);
      card.classList.toggle("invalid", !project.valid);
      card.dataset.projectDir = project.projectDir;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-main";
      button.dataset.action = "select";
      button.dataset.projectDir = project.projectDir;
      button.innerHTML = `
        <span class="project-name">${escapeHtml(project.name)}</span>
        <span class="project-subtitle">${escapeHtml(project.subtitle)}</span>
        <code>${escapeHtml(project.projectDir)}</code>
      `;

      const meta = document.createElement("div");
      meta.className = "project-meta";
      meta.innerHTML = `
        <span>${project.valid ? "可打开" : `缺少 ${project.missing.join("、")}`}</span>
        <span>${project.nodeCount} 节点</span>
        <span>${project.imageCount} 图</span>
        <span>${formatDate(project.updatedAt)}</span>
      `;

      const actions = document.createElement("div");
      actions.className = "project-actions";
      actions.innerHTML = `
        <a href="${escapeHtml(project.exportUrl)}">导出</a>
        <button type="button" data-action="copy" data-project-dir="${escapeHtml(project.projectDir)}">复制路径</button>
        <button type="button" data-action="remove" data-project-dir="${escapeHtml(project.projectDir)}">移除</button>
      `;

      card.append(button, meta, actions);
      return card;
    }),
  );
}

function shortName(value) {
  return value.split(/[\\/]/).filter(Boolean).pop() || "当前项目";
}

function formatDate(value) {
  if (!value) {
    return "未知时间";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findProjectButton(projectDirValue) {
  return [...projectList.querySelectorAll(".project-main")].find((button) => button.dataset.projectDir === projectDirValue);
}

function setStatus(message, isBad = false) {
  currentCard.classList.toggle("bad", isBad);
  statusTitle.textContent = message;
}

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在应用");

  try {
    await saveProject(projectDir.value);
  } catch (error) {
    setStatus("目录不可用", true);
    currentSubtitle.textContent = error.message;
  }
});

projectSearch.addEventListener("input", () => {
  if (appState) {
    renderProjectList(appState.projects);
  }
});

projectList.addEventListener("click", async (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    return;
  }

  const targetProjectDir = actionTarget.dataset.projectDir;
  const action = actionTarget.dataset.action;

  try {
    if (action === "select") {
      projectDir.value = targetProjectDir;
      await saveProject(targetProjectDir);
      findProjectButton(targetProjectDir)?.focus();
    }

    if (action === "copy") {
      await navigator.clipboard?.writeText(targetProjectDir);
      setStatus("路径已复制");
    }

    if (action === "remove") {
      await removeProject(targetProjectDir);
      setStatus("记录已移除");
    }
  } catch (error) {
    setStatus(error.message, true);
  }
});

refreshPreview.addEventListener("click", () => {
  const url = new URL(previewFrame.src || "/project/index.html", window.location.href);
  url.searchParams.set("t", String(Date.now()));
  previewFrame.src = url.toString();
});

fetchConfig()
  .then(renderState)
  .catch((error) => {
    currentCard.classList.add("bad");
    statusTitle.textContent = "启动失败";
    currentSubtitle.textContent = error.message;
  });
