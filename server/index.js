const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "app");
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 80 * 1024 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

function rootPath(relativePath = "") {
  if (typeof relativePath !== "string") {
    throw new Error("Invalid path");
  }
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const resolved = path.resolve(ROOT, normalized);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error("Path escapes workspace");
  }
  return resolved;
}

function toRelative(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, "/");
}

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload, null, 2), "application/json; charset=utf-8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  return body ? JSON.parse(body) : {};
}

function slugify(input) {
  const ascii = String(input || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  if (ascii) return ascii;
  return `product-${crypto.createHash("sha1").update(String(input || Date.now())).digest("hex").slice(0, 10)}`;
}

function cleanFileName(name, fallback) {
  const base = path.basename(String(name || fallback)).replace(/[<>:"/\\|?*\x00-\x1f]/g, "-");
  return base || fallback;
}

function escapeMd(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(dataUrl || ""));
  if (!match || match[2] !== ";base64") {
    throw new Error("Only base64 data URLs are supported for uploads");
  }
  return {
    mime: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[3], "base64")
  };
}

function extensionForMime(mime, fileName) {
  const existing = path.extname(fileName || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(existing)) return existing;
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/svg+xml") return ".svg";
  return ".jpg";
}

async function saveUpload(file, targetDir, fallbackName) {
  if (!file || !file.dataUrl) return null;
  const parsed = parseDataUrl(file.dataUrl);
  if (!parsed.mime.startsWith("image/")) {
    throw new Error("Only image uploads are allowed");
  }
  await fsp.mkdir(targetDir, { recursive: true });
  const ext = extensionForMime(parsed.mime, file.name);
  const stem = path.basename(cleanFileName(file.name || fallbackName, fallbackName), path.extname(file.name || ""));
  const finalPath = path.join(targetDir, `${stem || path.basename(fallbackName, ext)}${ext}`);
  await fsp.writeFile(finalPath, parsed.buffer);
  return toRelative(finalPath);
}

async function saveUploads(files, targetDir) {
  const saved = [];
  for (let index = 0; index < (files || []).length; index += 1) {
    const savedPath = await saveUpload(files[index], targetDir, `${String(index + 1).padStart(2, "0")}.jpg`);
    if (savedPath) saved.push(savedPath);
  }
  return saved;
}

async function listMarkdownFiles() {
  const skip = new Set([".git", "node_modules", ".next", "dist", "build"]);
  const results = [];

  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        const stat = await fsp.stat(fullPath);
        results.push({
          path: toRelative(fullPath),
          size: stat.size,
          updatedAt: stat.mtime.toISOString()
        });
      }
    }
  }

  await walk(ROOT);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

function buildFactsMarkdown(data, savedLogo, savedPhotos) {
  const lines = [
    `# ${escapeMd(data.productName) || "상품"} Facts`,
    "",
    "## 기본 정보",
    "",
    `- 상품명: ${escapeMd(data.productName) || "확인 필요"}`,
    `- 브랜드: ${escapeMd(data.brand) || "확인 필요"}`,
    `- 카테고리: ${escapeMd(data.category) || "확인 필요"}`,
    `- 판매 채널: ${escapeMd(data.salesChannel) || "채널 무관 모바일 상세페이지"}`,
    `- 포인트 컬러: ${escapeMd(data.pointColor) || "#1f6feb"}`,
    `- 로고 파일: ${savedLogo || "없음"}`,
    "",
    "## 상품 스펙",
    "",
    escapeMd(data.facts) || "- 확인 필요",
    "",
    "## 핵심 판매 포인트",
    "",
    escapeMd(data.sellingPoints) || "- 확인 필요",
    "",
    "## 주요 고객",
    "",
    escapeMd(data.targetCustomer) || "- 추천 고객 기준으로 기획",
    "",
    "## 필수/금지 문구",
    "",
    `- 반드시 넣을 문구: ${escapeMd(data.requiredPhrases) || "없음"}`,
    `- 넣지 말아야 할 문구: ${escapeMd(data.forbiddenPhrases) || "과장, 인증 없는 수치, No.1, 100%, 보장 표현"}`,
    "",
    "## 업로드 사진",
    "",
    ...(savedPhotos.length ? savedPhotos.map((photo) => `- ${photo}`) : ["- 없음"])
  ];
  return `${lines.join("\n")}\n`;
}

function cutTemplates(count, data, photos) {
  const product = escapeMd(data.productName) || "상품";
  const point = escapeMd(data.pointColor) || "#1f6feb";
  const required = escapeMd(data.requiredPhrases);
  const base = [
    ["첫인상", `${product}, 첫 화면에서 바로 이해되게`, "상품 전체 사진과 핵심 문구를 크게 배치", "메인 사진 또는 로고"],
    ["문제 제기", "고객이 구매 전에 망설이는 이유", "비슷한 상품과 비교할 때 헷갈리는 지점을 짚기", "사용 전 상황"],
    ["핵심 해결", "이 상품을 선택해야 하는 이유", "핵심 판매 포인트 2-3개를 짧은 라벨로 정리", "대표 사용 장면"],
    ["상세 근거", "스펙과 구성 확인", "용량, 재질, 원산지, 구성처럼 검증 가능한 정보만 사용", "라벨/패키지 사진"],
    ["사용 장면", "실제 생활 속 사용 이미지", "언제, 어디서, 어떻게 쓰는지 보여주기", "사용컷"],
    ["마지막 확인", "구매 전 확인 사항", "배송, 보관, 주의사항, 교환/반품 안내", "안내형 카드"]
  ];

  const expanded = [
    ...base.slice(0, 1),
    ["타깃 공감", "주요 고객에게 맞는 상황 제안", "고객군의 언어로 구매 동기 정리", "고객 라이프스타일 컷"],
    ...base.slice(1, 3),
    ["차별점", "경쟁 상품 대비 비교 포인트", "과장 없이 확인 가능한 차이만 제시", "비교 카드"],
    ["구성/옵션", "구매 단위와 옵션 확인", "수량, 사이즈, 색상, 구성품을 표로 정리", "옵션 사진"],
    ...base.slice(3, 5),
    ["신뢰 보강", "리뷰/인증/시험자료 영역", "증빙이 있으면 표시, 없으면 확인 필요로 남김", "증빙 자료"],
    ["FAQ", "자주 묻는 질문", "보관, 사용, 호환성, 주의사항 답변", "Q&A 카드"],
    ["배송/교환", "구매 후 절차 안내", "배송, 반품, 교환 기준을 짧게 정리", "패키지 사진"],
    ...base.slice(5)
  ];

  const source = count <= 6 ? base : expanded;
  const selected = source.slice(0, count);
  while (selected.length < count) {
    selected.push([
      `보강 섹션 ${selected.length + 1}`,
      "상품 이해를 돕는 추가 정보",
      "확인된 사실 중심으로 짧게 구성",
      "업로드 사진 또는 정보 카드"
    ]);
  }

  return selected.map((cut, index) => {
    const id = String(index + 1).padStart(2, "0");
    const photo = photos[index % Math.max(photos.length, 1)] || "업로드 사진 없음";
    return [
      `### Cut ${id}. ${cut[0]}`,
      "",
      `- 목적: ${cut[1]}`,
      `- 헤드라인: ${cut[2]}`,
      `- 이미지 삽입 문구: ${required || "확인된 상품 정보 중심 문구"}`,
      `- 이미지 구성: 포인트 컬러 ${point}를 강조색으로 사용하고, ${cut[3]} 중심으로 구성`,
      `- 추천 사진: ${photo}`,
      "- 확인 필요: 인증, 수치, 원산지, 리뷰, 가격 정보는 증빙이 있을 때만 사용",
      "",
      "```text",
      "+------------------------------+",
      `| Cut ${id} ${cut[0]}`.padEnd(31, " ") + "|",
      "| [큰 헤드라인 영역]             |",
      "|                              |",
      "| [상품/사용 이미지 영역]        |",
      "|                              |",
      "| [짧은 라벨 2-3개]             |",
      "+------------------------------+",
      "```",
      ""
    ].join("\n");
  }).join("\n");
}

function buildApprovalMarkdown(data, context) {
  const cutCount = Number(data.cutCount || 6);
  const product = escapeMd(data.productName) || "상품명 확인 필요";
  const now = new Date().toISOString();

  return [
    `# ${product} 상세페이지 승인용 기획안`,
    "",
    "Status: Draft  ",
    `Created: ${now}  `,
    `Product slug: \`${context.slug}\`  `,
    `Input folder: \`${context.productDir}\`  `,
    `recommendedCount: ${cutCount}  `,
    `actualPlannedCuts: ${cutCount}  `,
    "",
    "> 이 문서는 최종 이미지 제작 전 승인용 초안입니다. 사용자는 이 MD를 웹에서 직접 수정하거나, 수정 요청을 적은 뒤 다시 생성할 수 있습니다.",
    "",
    "## 1. Product Summary",
    "",
    "| 항목 | 내용 |",
    "|---|---|",
    `| 상품명 | ${product} |`,
    `| 브랜드 | ${escapeMd(data.brand) || "확인 필요"} |`,
    `| 카테고리 | ${escapeMd(data.category) || "확인 필요"} |`,
    `| 판매 채널 | ${escapeMd(data.salesChannel) || "채널 무관 모바일 상세페이지"} |`,
    `| 주요 고객 | ${escapeMd(data.targetCustomer) || "추천 고객 기준"} |`,
    `| 포인트 컬러 | ${escapeMd(data.pointColor) || "#1f6feb"} |`,
    `| 로고 | ${context.logoPath || "없음"} |`,
    `| 업로드 사진 | ${context.photoPaths.length}개 |`,
    "",
    "## 2. Facts",
    "",
    escapeMd(data.facts) || "- 확인 필요",
    "",
    "## 3. Selling Points",
    "",
    escapeMd(data.sellingPoints) || "- 확인 필요",
    "",
    "## 4. Assumptions",
    "",
    "- 입력되지 않은 스펙, 인증, 리뷰, 판매량, 가격 정보는 임의로 만들지 않습니다.",
    "- 사진이 부족한 경우 최종 결과물은 판매 확정본이 아니라 콘셉트 초안으로 분류합니다.",
    "- 포인트 컬러와 로고는 톤앤매너 기준으로 사용하며, 상품 정보보다 우선하지 않습니다.",
    "",
    "## 5. Confirmation Needed",
    "",
    "- 브랜드/상품명 표기 최종 확인",
    "- 원산지, 용량, 구성, 소재/성분, 보관/사용 주의사항",
    "- 인증, 수상, 리뷰, 수치 자료가 있다면 증빙 자료",
    "- 배송, 교환, 반품 안내 문구",
    "",
    "## 6. Photo Analysis and Placement",
    "",
    context.photoPaths.length
      ? context.photoPaths.map((photo, index) => `- ${index + 1}. \`${photo}\`: 상세 컷, 사용 컷, 스펙 컷 중 하나로 배치 가능`).join("\n")
      : "- 사진 없음: 실제 판매용 제작 전 상품/패키지 사진 업로드 필요",
    "",
    "## 7. Style Template",
    "",
    `- 선택 스타일: ${escapeMd(data.style) || "실용 정보형"}`,
    `- 톤: ${escapeMd(data.tone) || "명확하고 과장 없는 모바일 상세페이지 톤"}`,
    `- 강조색: ${escapeMd(data.pointColor) || "#1f6feb"}`,
    "",
    "## 8. Cut Plan",
    "",
    cutTemplates(cutCount, data, context.photoPaths),
    "## 9. Compliance Notes",
    "",
    "- 증빙 없는 효능, 인증, 판매량, 순위, 리뷰, 의학적 표현은 사용하지 않습니다.",
    "- 식품/화장품/건강기능식품/유아/반려동물 카테고리는 고시 정보와 주의사항을 별도로 확인합니다.",
    `- 금지 문구: ${escapeMd(data.forbiddenPhrases) || "100%, 무조건, 보장, 최고, No.1, 치료, 개선 효과"}`,
    "",
    "## 10. Approval Gate",
    "",
    "Status: Draft",
    "",
    "A. 승인 - 이 MD 기준으로 상세페이지 이미지 제작 시작  ",
    "B. 수정 - 이 MD를 웹에서 수정한 뒤 다시 검토  ",
    "C. 중단 - 이미지 제작하지 않음",
    ""
  ].join("\n");
}

function buildPreviewHtml(data, context) {
  const color = escapeMd(data.pointColor) || "#1f6feb";
  const product = escapeMd(data.productName) || "상품";
  const logo = context.logoPath ? `/${context.logoPath.replace(/\\/g, "/")}` : "";
  const photos = context.photoPaths.map((item) => `/${item.replace(/\\/g, "/")}`);
  const cutCount = Number(data.cutCount || 6);
  const sections = cutTemplates(cutCount, data, context.photoPaths)
    .split(/^### /m)
    .filter(Boolean)
    .map((chunk, index) => {
      const title = chunk.split("\n")[0].replace(/^Cut \d+\.\s*/, "");
      const image = photos[index % Math.max(photos.length, 1)];
      return `<section class="cut">
        <div class="cut-label">CUT ${String(index + 1).padStart(2, "0")}</div>
        <h2>${escapeHtml(title)}</h2>
        ${image ? `<img src="${image}" alt="">` : `<div class="empty">상품 사진 필요</div>`}
        <p>${escapeHtml(product)} 상세페이지 초안 섹션입니다. 실제 문구는 승인용 MD에서 수정하세요.</p>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(product)} preview</title>
  <style>
    :root { --point: ${color}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef1f5; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; }
    main { width: min(720px, 100%); margin: 0 auto; background: #fff; min-height: 100vh; }
    header { padding: 40px 28px; border-bottom: 1px solid #e5e7eb; }
    .logo { max-width: 120px; max-height: 52px; object-fit: contain; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 34px; line-height: 1.15; letter-spacing: 0; }
    .meta { margin-top: 14px; color: #64748b; }
    .cut { padding: 34px 28px; border-bottom: 1px solid #e5e7eb; }
    .cut-label { color: var(--point); font-weight: 800; font-size: 13px; }
    h2 { margin: 8px 0 18px; font-size: 26px; line-height: 1.2; letter-spacing: 0; }
    img, .empty { width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; object-fit: cover; background: #f3f4f6; }
    .empty { display: grid; place-items: center; color: #64748b; border: 1px dashed #cbd5e1; }
    p { font-size: 16px; line-height: 1.65; }
  </style>
</head>
<body>
  <main>
    <header>
      ${logo ? `<img class="logo" src="${logo}" alt="">` : ""}
      <h1>${escapeHtml(product)} 상세페이지 미리보기</h1>
      <div class="meta">포인트 컬러 ${escapeHtml(color)} · 승인용 초안</div>
    </header>
    ${sections}
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function createDraft(data) {
  if (!escapeMd(data.productName)) {
    throw new Error("상품명은 필수입니다");
  }
  const slug = slugify(data.productName);
  const productDir = toRelative(rootPath(path.join("products", slug)));
  const productFull = rootPath(productDir);
  const photosDir = path.join(productFull, "photos");
  const brandDir = path.join(productFull, "brand");
  const outputDir = rootPath(path.join("outputs", slug));
  const planDir = path.join(outputDir, "plan");
  const reviewDir = path.join(outputDir, "review");

  await fsp.mkdir(productFull, { recursive: true });
  await fsp.mkdir(planDir, { recursive: true });
  await fsp.mkdir(reviewDir, { recursive: true });

  const logoPath = await saveUpload(data.logo, brandDir, "logo.png");
  const photoPaths = await saveUploads(data.photos || [], photosDir);
  const factsMarkdown = buildFactsMarkdown(data, logoPath, photoPaths);
  const factsPath = path.join(productFull, "facts.md");
  await fsp.writeFile(factsPath, factsMarkdown, "utf8");

  const context = { slug, productDir, logoPath, photoPaths };
  const approvalMarkdown = buildApprovalMarkdown(data, context);
  const planPath = path.join(planDir, `${slug}.detail-page.md`);
  await fsp.writeFile(planPath, approvalMarkdown, "utf8");

  const previewHtml = buildPreviewHtml(data, context);
  const previewPath = path.join(reviewDir, "index.html");
  await fsp.writeFile(previewPath, previewHtml, "utf8");

  return {
    slug,
    productDir,
    factsPath: toRelative(factsPath),
    approvalMdPath: toRelative(planPath),
    previewPath: toRelative(previewPath),
    logoPath,
    photoPaths,
    markdown: approvalMarkdown
  };
}

async function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/outputs/") || pathname.startsWith("/products/")) {
    const fullPath = rootPath(pathname);
    try {
      const stat = await fsp.stat(fullPath);
      if (!stat.isFile()) {
        send(res, 404, "Not found");
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, {
        "content-type": MIME[ext] || "application/octet-stream",
        "cache-control": "no-store"
      });
      fs.createReadStream(fullPath).pipe(res);
    } catch {
      send(res, 404, "Not found");
    }
    return;
  }

  const requested = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.resolve(PUBLIC_DIR, "." + requested);
  if (!fullPath.startsWith(PUBLIC_DIR + path.sep) && fullPath !== path.join(PUBLIC_DIR, "index.html")) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(fullPath);
    if (!stat.isFile()) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    fs.createReadStream(fullPath).pipe(res);
  } catch {
    send(res, 404, "Not found");
  }
}

async function handleApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, root: ROOT });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/md-files") {
      sendJson(res, 200, { files: await listMarkdownFiles() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/file") {
      const relativePath = url.searchParams.get("path");
      const fullPath = rootPath(relativePath);
      if (!fullPath.toLowerCase().endsWith(".md")) {
        throw new Error("Only Markdown files can be opened here");
      }
      const content = await fsp.readFile(fullPath, "utf8");
      sendJson(res, 200, { path: toRelative(fullPath), content });
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/file") {
      const body = await readJson(req);
      const fullPath = rootPath(body.path);
      if (!fullPath.toLowerCase().endsWith(".md")) {
        throw new Error("Only Markdown files can be saved here");
      }
      await fsp.writeFile(fullPath, String(body.content || ""), "utf8");
      sendJson(res, 200, { ok: true, path: toRelative(fullPath), savedAt: new Date().toISOString() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/detail-page/draft") {
      const body = await readJson(req);
      sendJson(res, 200, await createDraft(body));
      return;
    }

    sendJson(res, 404, { error: "Unknown API route" });
  } catch (error) {
    sendJson(res, 400, { error: error.message || String(error) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Detail page web tool running at http://localhost:${PORT}`);
});
