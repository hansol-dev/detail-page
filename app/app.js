const state = {
  generatedPath: "",
  files: [],
  currentFile: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || "처리 중";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body ? { "content-type": "application/json" } : undefined,
    ...options
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "요청 실패");
  }
  return payload;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function collectForm() {
  const form = $("#detailForm");
  const data = Object.fromEntries(new FormData(form).entries());
  const logoFile = $("#logoInput").files[0];
  const photoFiles = Array.from($("#photoInput").files || []);
  data.logo = logoFile ? await fileToDataUrl(logoFile) : null;
  data.photos = await Promise.all(photoFiles.map(fileToDataUrl));
  return data;
}

function showResult(result) {
  state.generatedPath = result.approvalMdPath;
  $("#copyPathBtn").disabled = false;
  $("#resultMeta").innerHTML = [
    `<strong>상세페이지 초안:</strong> ${result.approvalMdPath}`,
    `<strong>facts.md:</strong> ${result.factsPath}`,
    `<strong>미리보기:</strong> <a href="/${result.previewPath}" target="_blank" rel="noreferrer">${result.previewPath}</a>`
  ].join("<br>");
  $("#generatedMarkdown").value = result.markdown;
}

async function generateDraft() {
  const button = $("#generateBtn");
  setBusy(button, true, "생성 중");
  try {
    const data = await collectForm();
    const result = await api("/api/detail-page/draft", {
      method: "POST",
      body: JSON.stringify(data)
    });
    showResult(result);
    await loadFiles();
  } catch (error) {
    $("#resultMeta").innerHTML = `<span class="error">${error.message}</span>`;
  } finally {
    setBusy(button, false);
  }
}

function renderFiles() {
  const query = $("#fileSearch").value.trim().toLowerCase();
  const list = $("#fileList");
  const files = state.files.filter((file) => file.path.toLowerCase().includes(query));
  list.innerHTML = files.map((file) => {
    const active = file.path === state.currentFile ? " active" : "";
    const size = new Intl.NumberFormat("ko-KR").format(file.size);
    return `<button class="file-item${active}" type="button" data-path="${escapeAttr(file.path)}">
      <strong>${escapeHtml(file.path)}</strong>
      <span>${size} bytes · ${new Date(file.updatedAt).toLocaleString("ko-KR")}</span>
    </button>`;
  }).join("");
}

async function loadFiles() {
  const payload = await api("/api/md-files");
  state.files = payload.files;
  renderFiles();
}

async function openFile(path) {
  const payload = await api(`/api/file?path=${encodeURIComponent(path)}`);
  state.currentFile = payload.path;
  $("#currentFileName").textContent = payload.path;
  $("#fileEditor").value = payload.content;
  $("#saveFileBtn").disabled = false;
  $("#saveStatus").textContent = "";
  renderFiles();
}

async function saveFile() {
  if (!state.currentFile) return;
  const button = $("#saveFileBtn");
  setBusy(button, true, "저장 중");
  try {
    await api("/api/file", {
      method: "PUT",
      body: JSON.stringify({
        path: state.currentFile,
        content: $("#fileEditor").value
      })
    });
    $("#saveStatus").textContent = `저장됨 ${new Date().toLocaleTimeString("ko-KR")}`;
    await loadFiles();
  } catch (error) {
    $("#saveStatus").innerHTML = `<span class="error">${error.message}</span>`;
  } finally {
    setBusy(button, false);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((item) => item.classList.remove("active"));
      $$(".view").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      $(`#${tab.dataset.tab}`).classList.add("active");
      if (tab.dataset.tab === "memory") loadFiles().catch(console.error);
    });
  });

  $("#generateBtn").addEventListener("click", generateDraft);
  $("#copyPathBtn").addEventListener("click", async () => {
    if (!state.generatedPath) return;
    await navigator.clipboard.writeText(state.generatedPath);
    $("#copyPathBtn").textContent = "복사됨";
    setTimeout(() => {
      $("#copyPathBtn").textContent = "경로 복사";
    }, 1200);
  });
  $("#refreshFilesBtn").addEventListener("click", () => loadFiles().catch(console.error));
  $("#saveFileBtn").addEventListener("click", saveFile);
  $("#fileSearch").addEventListener("input", renderFiles);
  $("#fileList").addEventListener("click", (event) => {
    const item = event.target.closest(".file-item");
    if (item) openFile(item.dataset.path).catch(console.error);
  });
}

bindEvents();
loadFiles().catch(console.error);
