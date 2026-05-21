import "server-only";
import fs from "fs/promises";
import sharp from "sharp";
import { assetPath, createId, readDb, saveAsset, saveGeneratedSvg, timestamp, updateDb } from "../store";
import { getLatestApprovalMarkdown } from "./approval-md";
import { getProductDraft } from "./product-drafts";
import type { AppDb, Asset, AssetKind, BrandProfile, GeneratedCut, ImageGenerationJob, ProductDraft } from "../types";

type ImageReferences = {
  brandName: string | null;
  logoAsset: Asset | null;
  productPhotoAsset: Asset | null;
  productPhotoOverride: boolean;
  logoDataUri: string | null;
  productPhotoDataUri: string | null;
};

type CutGenerationInput = {
  userId: string;
  cutNumber: number;
  title: string;
  productName: string;
  pointColor: string;
  markdown: string;
  references: ImageReferences;
  baseImageAsset?: Asset | null;
  canvasSize?: "auto" | "1024x1024" | "1024x1536" | "1536x1024";
  outputKind?: AssetKind;
  outputFileName?: string;
  promptOverride?: string;
  revisionRequest?: string;
};

function textReplacementFromRevision(request: string) {
  const match = request.match(/(?:TEXT_REPLACE|문구만 교체|臾멸뎄留.?援먯껜):\s*"([^"]+)"\s*->\s*"([^"]+)"/);
  if (!match) return null;
  return { source: match[1], replacement: match[2] };
}

function applyRevisionToMarkdown(markdown: string, revisionRequest: string) {
  const replacement = textReplacementFromRevision(revisionRequest);
  if (!replacement?.source) return markdown;
  return markdown.split(replacement.source).join(replacement.replacement);
}

function isTextOnlyRevision(request: string) {
  return Boolean(textReplacementFromRevision(request));
}

function isStrictTextEdit(input: CutGenerationInput) {
  return Boolean(
    input.baseImageAsset &&
      input.revisionRequest &&
      isTextOnlyRevision(input.revisionRequest) &&
      !input.references.productPhotoOverride
  );
}

function isLogoRevisionRequest(request: string | undefined) {
  return Boolean(
    request &&
      /(logo|brand image|symbol|\uB85C\uACE0|\uBE0C\uB79C\uB4DC\s*\uC774\uBBF8\uC9C0|\uBE0C\uB79C\uB4DC\uC774\uBBF8\uC9C0|\uC2EC\uBCFC|\uC0C1\uD45C)/i.test(
        request
      )
  );
}

function isLogoRemovalRequest(request: string | undefined) {
  return Boolean(
    request &&
      /(remove|delete|without logo|no logo|hide logo|\uB85C\uACE0.*(\uC0AD\uC81C|\uC81C\uAC70|\uBE7C|\uC5C6\uC560|\uB123\uC9C0\s*\uB9C8|\uC548\s*\uB123)|(\uC0AD\uC81C|\uC81C\uAC70|\uBE7C|\uC5C6\uC560).*\uB85C\uACE0)/i.test(
        request
      )
  );
}

function shouldUseBrandLogoInCut(input: CutGenerationInput) {
  if (!input.references.logoAsset || input.outputKind === "generated_thumbnail") return false;
  if (isLogoRemovalRequest(input.revisionRequest)) return false;
  if (isLogoRevisionRequest(input.revisionRequest)) return true;
  return input.cutNumber === 1 && !input.baseImageAsset;
}

function revisionReplacementGuidance(request: string | undefined) {
  if (!request?.trim()) return "";
  const replacement = textReplacementFromRevision(request);
  if (!replacement) {
    return [
      "MANDATORY REVISION: Apply the user's revision request visibly in this regenerated cut.",
      "Do not ignore the revision request. Do not only store it as metadata.",
      "Keep unrelated layout, product photo, colors, and copy as close to the current cut as possible."
    ].join("\n");
  }

  return [
    "MANDATORY TEXT REPLACEMENT:",
    `- Find this exact visible phrase if present: ${replacement.source}`,
    `- Replace it with this exact phrase: ${replacement.replacement}`,
    "- The replacement phrase must appear visibly in the regenerated image.",
    "- Remove the old phrase from the regenerated image unless it appears in an unrelated approved context.",
    "- Keep all other visible copy, layout, product photo, colors, and spacing as close to the current cut as possible."
  ].join("\n");
}

function productPhotoReplacementGuidance(references: ImageReferences) {
  if (!references.productPhotoOverride) return "";
  return [
    "MANDATORY PRODUCT PHOTO REPLACEMENT:",
    "- The user selected a specific uploaded product photo for this cut.",
    "- Use the selected uploaded product photo as the primary source of truth for the main product image in this cut.",
    "- Replace any wrong product image, wrong package, wrong label, wrong flavor, or wrong product form with the selected product photo reference.",
    "- Preserve the existing cut layout, background, typography, and approved copy as much as possible.",
    "- Do not invent a different product, package, label, ingredient, logo, option, or flavor that is not visible in the selected photo."
  ].join("\n");
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(items[index]);
      }
    })
  );
  return results;
}

function extractCutCount(markdown: string) {
  const count = markdown.match(/actualPlannedCuts:\s*(\d+)/)?.[1];
  if (count) return Number(count);
  const headings = markdown.match(/^### Cut\s+\d+/gm);
  return headings?.length || 6;
}

function extractCutTitle(markdown: string, cutNumber: number) {
  const padded = String(cutNumber).padStart(2, "0");
  const regex = new RegExp(`^### Cut ${padded}\\.\\s*(.+)$`, "m");
  return markdown.match(regex)?.[1]?.trim() || `Cut ${padded}`;
}

function extractCutSection(markdown: string, cutNumber: number) {
  const matches = [...markdown.matchAll(/^### Cut\s+(\d+)\.\s*(.+)$/gm)];
  const index = matches.findIndex((match) => Number(match[1]) === cutNumber);
  if (index < 0) return "";
  const start = matches[index].index ?? 0;
  const end = matches[index + 1]?.index ?? markdown.length;
  return markdown.slice(start, end).trim();
}

function extractMarkdownSection(markdown: string, title: string) {
  const lines = markdown.split(/\r?\n/);
  const normalizedTitle = title.replace(/^\d+\.\s*/, "");
  const start = lines.findIndex((line) => {
    const heading = line.trim().replace(/^##\s+/, "").replace(/^\d+\.\s*/, "");
    return heading === normalizedTitle;
  });
  if (start < 0) return "";
  const body: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) break;
    body.push(lines[index]);
  }
  return body.join("\n").trim();
}

function commonGenerationContext(markdown: string) {
  const memory = extractMarkdownSection(markdown, "?댁쁺 硫붾え由?諛섏쁺");
  const guide = extractMarkdownSection(markdown, "?쒗쁽 媛?대뱶");
  const sections = [
    memory ? `## Common Operating Memory\n${memory}` : "",
    guide ? `## Common Expression Guide\n${guide}` : ""
  ].filter(Boolean);
  return sections.join("\n\n");
}

function withCommonGenerationContext(markdown: string, cutSection: string) {
  const common = commonGenerationContext(markdown);
  const cut = cutSection || markdown;
  return common ? `${cut}\n\n${common}` : cut;
}

function fieldFromCutSection(section: string, labels: string[]) {
  for (const label of labels) {
    const match = section.match(new RegExp(`^- ${label}:\\s*(.+)$`, "m"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function shortText(value: string, maxLength = 42) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function wrapText(value: string, maxLength = 34) {
  const result: string[] = [];
  for (const sourceLine of value.split(/\r?\n/)) {
    if (!sourceLine) {
      result.push("");
      continue;
    }
    for (let index = 0; index < sourceLine.length; index += maxLength) {
      result.push(sourceLine.slice(index, index + maxLength));
    }
  }
  return result;
}

function findReferenceAssets(
  db: AppDb,
  userId: string,
  brand: BrandProfile | undefined,
  draft: ProductDraft,
  selectedProductPhotoAssetId?: string | null
) {
  const logoAsset = brand?.logoAssetId
    ? db.assets.find((asset) => asset.id === brand.logoAssetId && asset.userId === userId && asset.kind === "brand_logo") ?? null
    : null;
  const selectedProductPhotoAsset =
    selectedProductPhotoAssetId && draft.photoAssetIds.includes(selectedProductPhotoAssetId)
      ? db.assets.find(
          (asset) =>
            asset.id === selectedProductPhotoAssetId &&
            asset.userId === userId &&
            asset.kind === "product_photo"
        ) ?? null
      : null;
  const productPhotoAsset =
    selectedProductPhotoAsset ??
    draft.photoAssetIds
      .map((assetId) =>
        db.assets.find((asset) => asset.id === assetId && asset.userId === userId && asset.kind === "product_photo")
      )
      .find((asset): asset is Asset => Boolean(asset)) ?? null;

  return { logoAsset, productPhotoAsset, productPhotoOverride: Boolean(selectedProductPhotoAsset) };
}

async function assetDataUri(asset: Asset | null) {
  if (!asset) return null;
  const bytes = await fs.readFile(assetPath(asset.storageKey));
  return `data:${asset.mimeType};base64,${bytes.toString("base64")}`;
}

async function buildImageReferences(
  db: AppDb,
  userId: string,
  brand: BrandProfile | undefined,
  draft: ProductDraft,
  selectedProductPhotoAssetId?: string | null
): Promise<ImageReferences> {
  const { logoAsset, productPhotoAsset, productPhotoOverride } = findReferenceAssets(
    db,
    userId,
    brand,
    draft,
    selectedProductPhotoAssetId
  );
  return {
    brandName: brand?.brandName ?? null,
    logoAsset,
    productPhotoAsset,
    productPhotoOverride,
    logoDataUri: await assetDataUri(logoAsset),
    productPhotoDataUri: await assetDataUri(productPhotoAsset)
  };
}

function referenceSummary(references: ImageReferences, options: { logoAllowed?: boolean } = {}) {
  return [
    references.productPhotoAsset && references.productPhotoOverride
      ? "The selected uploaded product photo is mandatory for this cut. Use it as the primary product image reference and correct any wrong product image in the current cut."
      : references.productPhotoAsset
        ? "Use the uploaded product photo as the primary product reference. Preserve the actual product shape, color, packaging, and visible label details as much as possible."
      : "No product photo was provided; create a conservative product presentation without inventing factual claims.",
    references.logoAsset && options.logoAllowed
      ? "This cut is allowed to use the brand logo. Do not draw, recreate, crop, or stylize it inside the AI image. Leave clean whitespace near the top center for the app to place the uploaded original logo file after generation."
      : references.logoAsset
        ? "This cut should not use the brand logo. A logo does not need to appear on every cut. Avoid repeated logo use and do not add a brand mark, symbol-only logo, typed logo, or logo-like decoration."
      : references.brandName
        ? `Brand name: ${references.brandName}`
        : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function svgForCut(input: CutGenerationInput) {
  const label = `CUT ${String(input.cutNumber).padStart(2, "0")}`;
  const revision = input.revisionRequest?.trim();
  const logo = input.references.logoDataUri;
  const productPhoto = input.references.productPhotoDataUri;
  const brandName = input.references.brandName ?? "Brand";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <clipPath id="productPhotoClip">
      <rect x="90" y="345" width="720" height="500" rx="28"/>
    </clipPath>
  </defs>
  <rect width="900" height="1200" fill="#ffffff"/>
  <rect x="0" y="0" width="900" height="18" fill="${escapeXml(input.pointColor)}"/>
  <rect x="60" y="58" width="780" height="110" rx="28" fill="#ffffff" stroke="#e5e7eb"/>
  ${
    logo
      ? `<image href="${escapeXml(logo)}" x="82" y="78" width="180" height="70" preserveAspectRatio="xMinYMid meet"/>`
      : `<text x="82" y="126" font-family="Arial, sans-serif" font-size="30" fill="#111827" font-weight="800">${escapeXml(
          brandName
        )}</text>`
  }
  <text x="820" y="126" text-anchor="end" font-family="Arial, sans-serif" font-size="30" fill="${escapeXml(
    input.pointColor
  )}" font-weight="800">${label}</text>
  <text x="70" y="230" font-family="Arial, sans-serif" font-size="56" fill="#111827" font-weight="800">${escapeXml(
    input.productName
  )}</text>
  <text x="70" y="292" font-family="Arial, sans-serif" font-size="34" fill="#344054" font-weight="700">${escapeXml(
    input.title
  )}</text>
  <rect x="90" y="345" width="720" height="500" rx="28" fill="#f2f4f7" stroke="#d0d5dd"/>
  ${
    productPhoto
      ? `<image href="${escapeXml(productPhoto)}" x="90" y="345" width="720" height="500" preserveAspectRatio="xMidYMid slice" clip-path="url(#productPhotoClip)"/>`
      : `<text x="450" y="605" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#667085">?곹뭹 ?대?吏 ?놁쓬</text>`
  }
  <rect x="105" y="790" width="690" height="38" rx="19" fill="#ffffff" opacity="0.88"/>
  <text x="450" y="817" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#344054" font-weight="700">?낅줈?쒗븳 ${
    productPhoto ? "?곹뭹 ?ъ쭊" : "?곹뭹 ?뺣낫"
  }怨??뱀씤 MD 湲곗??쇰줈 ?앹꽦</text>
  <rect x="70" y="910" width="760" height="128" rx="28" fill="#f9fafb" stroke="#eaecf0"/>
  <text x="105" y="960" font-family="Arial, sans-serif" font-size="28" fill="#111827" font-weight="800">?곸꽭?섏씠吏 ?듭떖 硫붿떆吏</text>
  <text x="105" y="1008" font-family="Arial, sans-serif" font-size="25" fill="#475467">${escapeXml(
    shortText(input.title, 48)
  )}</text>
  <rect x="70" y="1076" width="250" height="70" rx="35" fill="${escapeXml(input.pointColor)}"/>
  <text x="195" y="1121" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" fill="#fff" font-weight="800">釉뚮옖??而щ윭 ?곸슜</text>
  ${
    revision
      ? `<text x="350" y="1120" font-family="Arial, sans-serif" font-size="22" fill="#e02000">?섏젙 諛섏쁺: ${escapeXml(
          shortText(revision, 34)
        )}</text>`
      : ""
  }
</svg>`;
}

function imagePrompt(input: CutGenerationInput) {
  if (input.promptOverride) return input.promptOverride;
  const approvedCutSection = input.markdown.length > 8000 ? input.markdown.slice(0, 8000) : input.markdown;
  const hasNoticeSource = /- ?덈궡?ы빆 ?먮Ц:/m.test(input.markdown);
  const isLogoRevision = isLogoRevisionRequest(input.revisionRequest);
  const logoAllowed = shouldUseBrandLogoInCut(input);
  const mandatoryRevisionGuidance = revisionReplacementGuidance(input.revisionRequest);
  const mandatoryPhotoGuidance = productPhotoReplacementGuidance(input.references);
  const noticeGuidance = hasNoticeSource
    ? "This is the only policy notice cut. Use only the notice items explicitly present in the approved cut section. Preserve every provided notice item exactly as approved. Do not omit, summarize, merge, paraphrase, change, infer, or add customer-center, shipping, return, exchange, carrier, operating-hour, fee, or contact details that are not present in the approved cut section."
    : "This is not a policy notice cut. Do not add contact, logistics, delivery, return, exchange, or customer-service policy blocks, icons, or labels. Focus only on this cut's approved product story and composition.";

  const revisionGuidance = input.revisionRequest
    ? [
        "This is a revision for only this single cut image.",
        isLogoRemovalRequest(input.revisionRequest)
          ? [
              "The user is asking to remove or avoid logo repetition in this cut.",
              "Remove visible logos, logo-like marks, repeated brand headers, and symbol-only logo decorations from this cut.",
              "Do not add a new logo. Preserve the rest of the cut layout and non-logo text as much as possible."
            ].join("\n")
          : isLogoRevision && input.references.logoAsset
          ? [
              "The user is asking for a logo correction. The uploaded logo reference image is the only source of truth for the logo.",
              "Replace every generated, invented, partial, symbol-only, distorted, or stylized logo in the current cut with the uploaded logo image.",
              "Use the complete uploaded logo image exactly, including its original proportions and wordmark/symbol composition. Do not use only the symbol unless the uploaded file itself is symbol-only.",
              "Do not redraw, redesign, trace, simplify, reinterpret, crop, warp, add effects, or create a new logo. Only pure black or pure white color adaptation is allowed if contrast requires it.",
              "Preserve the rest of the cut layout and non-logo text as much as possible."
            ].join("\n")
          : isStrictTextEdit(input)
          ? [
              "Use the provided current cut image as the exact base image.",
              "Do not redesign, recompose, crop, move, recolor, relight, restyle, or replace any object.",
              input.references.logoAsset
                ? "If the cut contains a logo, it must be the complete uploaded logo image with original proportions. Do not use only the symbol, redraw it, type the brand name, restyle it, reinterpret it, or make a new logo. Only pure black or pure white color adaptation is allowed if the request explicitly needs contrast."
                : "",
              "Change only the exact requested text. Keep all other pixels as visually identical as possible.",
              "Redraw the replaced Korean text sharply and cleanly in the same area, with matching font weight, color, alignment, and spacing."
            ].filter(Boolean).join("\n")
          : input.baseImageAsset
            ? [
                "Use the provided current cut image as the primary base. Preserve layout, product photo, logo, colors, spacing, and every other text exactly unless the request names it.",
                input.references.logoAsset
                  ? "If changing or rendering the logo, replace it with the complete uploaded logo file as the exact source. Do not redraw, redesign, stylize, warp, reinterpret, crop to symbol-only, add effects, change proportions, or create logo variations. Only pure black or pure white color adaptation is allowed for contrast."
                  : ""
              ].filter(Boolean).join("\n")
            : "Preserve the approved cut theme and do not rewrite unrelated copy.",
        "If the request says text replacement with A -> B, replace only that exact phrase. Do not summarize, expand, rephrase, or change other copy.",
        mandatoryRevisionGuidance,
        mandatoryPhotoGuidance,
        "Render all Korean text crisp, high-contrast, and readable. Prefer fewer, larger text blocks over many tiny labels.",
        "The revision request is private editing instruction only. Never render the request text itself, and never render labels such as 'Revision request', '?섏젙 ?붿껌', or '?섏젙 ?붿껌 諛섏쁺' inside the image.",
        `Private revision instruction:\n${input.revisionRequest}`
      ].join("\n")
    : "";

  return [
    "Create one vertical ecommerce product detail-page image cut for a Korean online store.",
    "Canvas: auto-sized vertical mobile ecommerce cut. Do not force a fixed 1024x1536 height; choose a natural height for the approved cut content while keeping mobile readability.",
    `Product: ${input.productName}`,
    input.references.brandName ? `Brand: ${input.references.brandName}` : "",
    `Cut number: ${String(input.cutNumber).padStart(2, "0")}`,
    `Cut theme: ${input.title}`,
    `Brand point color: ${input.pointColor}`,
    referenceSummary(input.references, { logoAllowed }),
    mandatoryPhotoGuidance,
    revisionGuidance,
    "Priority order: 1) approved cut section, 2) common operating memory, 3) common expression guide, 4) brand style.",
    "These cuts are part of one complete detail page. Avoid repeating the same visible copy, benefit, layout role, or notice concept across cuts.",
    "Use common operating memory as production constraints only. Do not render memory text itself as visible copy unless the approved cut section explicitly asks for that exact text.",
    "Use Korean typography-friendly composition.",
    "Korean text must be crisp and legible at mobile width. Avoid small dense paragraphs and avoid distorted glyphs.",
    noticeGuidance,
    "Use approved visible copy and approved product facts from the approved cut section. You may also use product facts, ingredient names, flavor names, origin text, quantity, or package claims only when they are clearly readable on the uploaded product/package photo. Do not invent or infer facts that are not approved and not visibly readable on the product/package photo.",
    "When using readable package text as visible sales copy, keep it faithful to the package wording. Do not exaggerate, translate into stronger claims, add rankings, certifications, review counts, effects, or quantified benefits unless they are clearly shown on the package or approved cut section.",
    input.references.logoAsset && logoAllowed
      ? "Logo rule for this cut only: the brand logo may appear once. Do not render any logo, brand mark, symbol-only logo, or typed replacement logo yourself. Reserve clean top-center whitespace; the application will composite the uploaded original logo file after image generation."
      : input.references.logoAsset
        ? "Logo repetition rule: the logo is not required on every cut. For this cut, do not place or invent any logo, brand mark, symbol-only logo, typed replacement logo, or logo-like header. Avoid repeated logo use across the detail page."
      : "",
    "Do not invent certifications, awards, medical claims, rankings, review counts, or unverifiable facts.",
    "The result should look like a real detailed page section, not a wireframe or placeholder.",
    "Use the approved cut section below as the main source for visible copy, layout, and visual direction.",
    `Approved cut section:\n${approvedCutSection}`
  ]
    .filter(Boolean)
    .join("\n");
}

async function appendAssetToForm(form: FormData, asset: Asset) {
  const bytes = await fs.readFile(assetPath(asset.storageKey));
  const blob = new Blob([new Uint8Array(bytes)], { type: asset.mimeType || "application/octet-stream" });
  form.append("image[]", blob, asset.storageKey.split("/").at(-1) ?? `${asset.id}.png`);
}

function canUseAsOpenAiReference(asset: Asset | null): asset is Asset {
  return Boolean(asset && ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(asset.mimeType));
}

async function requestOpenAiImage(input: CutGenerationInput, endpoint: "generations" | "edits") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const quality = input.revisionRequest
    ? process.env.OPENAI_IMAGE_REVISION_QUALITY || process.env.OPENAI_IMAGE_QUALITY || "high"
    : process.env.OPENAI_IMAGE_QUALITY || "medium";
  const prompt = imagePrompt(input);
  const url = `https://api.openai.com/v1/images/${endpoint}`;

  const response =
    endpoint === "edits"
      ? await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`
          },
          body: await (async () => {
            const form = new FormData();
            form.append("model", model);
            form.append("prompt", prompt);
            form.append("size", input.canvasSize ?? process.env.OPENAI_IMAGE_SIZE ?? "auto");
            form.append("quality", quality);
            const baseImageAsset = input.baseImageAsset ?? null;
            if (canUseAsOpenAiReference(baseImageAsset)) {
              await appendAssetToForm(form, baseImageAsset);
            }
            const strictTextEdit = isStrictTextEdit(input) && !isLogoRevisionRequest(input.revisionRequest);
            if (!strictTextEdit && canUseAsOpenAiReference(input.references.productPhotoAsset)) {
              await appendAssetToForm(form, input.references.productPhotoAsset);
            }
            if (!strictTextEdit && shouldUseBrandLogoInCut(input) && canUseAsOpenAiReference(input.references.logoAsset)) {
              await appendAssetToForm(form, input.references.logoAsset);
            }
            return form;
          })()
        })
      : await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model,
            prompt,
            size: input.canvasSize ?? process.env.OPENAI_IMAGE_SIZE ?? "auto",
            quality
          })
        });

  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  let payload: {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  } | null = null;

  if (contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawBody) as {
        data?: Array<{ b64_json?: string }>;
        error?: { message?: string };
      };
    } catch {
      throw new Error(`OpenAI image ${endpoint} returned invalid JSON: ${response.status}`);
    }
  }

  if (!response.ok) {
    const bodyPreview = rawBody.replace(/\s+/g, " ").trim().slice(0, 220);
    throw new Error(
      payload?.error?.message ||
        `OpenAI image ${endpoint} failed: ${response.status} ${response.statusText}${
          bodyPreview ? ` (${bodyPreview})` : ""
        }`
    );
  }

  if (!payload) {
    const bodyPreview = rawBody.replace(/\s+/g, " ").trim().slice(0, 220);
    throw new Error(
      `OpenAI image ${endpoint} returned a non-JSON response: ${contentType || "unknown content-type"}${
        bodyPreview ? ` (${bodyPreview})` : ""
      }`
    );
  }

  const base64 = payload.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI image response did not include image data.");

  return saveAsset({
    userId: input.userId,
    kind: input.outputKind ?? "generated_cut",
    fileName: input.outputFileName ?? `cut-${String(input.cutNumber).padStart(2, "0")}.png`,
    mimeType: "image/png",
    bytes: Buffer.from(base64, "base64")
  });
}

async function compositeBrandLogoOnCut(input: CutGenerationInput, asset: Asset) {
  const logoAsset = input.references.logoAsset;
  if (!logoAsset || !shouldUseBrandLogoInCut(input)) return asset;
  if (asset.mimeType !== "image/png" || !canUseAsOpenAiReference(logoAsset)) return asset;

  const baseBytes = await fs.readFile(assetPath(asset.storageKey));
  const logoBytes = await fs.readFile(assetPath(logoAsset.storageKey));
  const baseMeta = await sharp(baseBytes).metadata();
  if (!baseMeta.width || !baseMeta.height) return asset;

  const logoMaxWidth = Math.round(baseMeta.width * 0.24);
  const logoMaxHeight = Math.round(baseMeta.height * 0.07);
  const logoBuffer = await sharp(logoBytes)
    .resize({ width: logoMaxWidth, height: logoMaxHeight, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  if (!logoMeta.width || !logoMeta.height) return asset;

  const top = Math.max(24, Math.round(baseMeta.width * 0.04));
  const left = Math.max(0, Math.round((baseMeta.width - logoMeta.width) / 2));
  const output = await sharp(baseBytes)
    .composite([{ input: logoBuffer, left, top }])
    .png()
    .toBuffer();

  return saveAsset({
    userId: input.userId,
    kind: input.outputKind ?? "generated_cut",
    fileName: input.outputFileName ?? `cut-${String(input.cutNumber).padStart(2, "0")}.png`,
    mimeType: "image/png",
    bytes: output
  });
}

async function generateOpenAiImage(input: CutGenerationInput) {
  const hasReferenceImage =
    canUseAsOpenAiReference(input.baseImageAsset ?? null) ||
    canUseAsOpenAiReference(input.references.productPhotoAsset) ||
    (shouldUseBrandLogoInCut(input) && canUseAsOpenAiReference(input.references.logoAsset));
  return requestOpenAiImage(input, hasReferenceImage ? "edits" : "generations");
}

async function generateCutAsset(input: CutGenerationInput) {
  const openAiAsset = await generateOpenAiImage(input);
  if (openAiAsset) {
    const asset = await compositeBrandLogoOnCut(input, openAiAsset);
    return { asset, provider: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2" };
  }

  const svgAsset = await saveGeneratedSvg(input.userId, svgForCut(input));
  return { asset: svgAsset, provider: "dev-svg-provider" };
}

function thumbnailPrompt(input: {
  productName: string;
  brandName: string | null;
  pointColor: string;
  references: ImageReferences;
  revisionRequest?: string;
}) {
  const revision = input.revisionRequest?.trim();
  return [
    "Create one square ecommerce product thumbnail image for a Korean online store.",
    "Canvas: 1024x1024, clean marketplace thumbnail, high product visibility, premium but practical.",
    `Product: ${input.productName}`,
    input.brandName ? `Brand: ${input.brandName}` : "",
    `Brand point color: ${input.pointColor}`,
    referenceSummary(input.references, { logoAllowed: false }),
    "Use the uploaded product photo as the main visual when available.",
    "Keep the product large and centered with enough margin for marketplace cropping.",
    "Use minimal Korean text only if it is clearly readable. Do not create claims, certifications, review counts, discount rates, or unverifiable facts.",
    "Do not make it look like a full detail-page section. It should work as a single product listing thumbnail.",
    revision
      ? [
          "This is a revision for only the product thumbnail.",
          "Preserve the product identity, brand color, and listing-thumbnail purpose unless the request names a specific change.",
          "If the request says text replacement with A -> B, replace only that exact phrase.",
          "The revision request is private editing instruction only. Never render the request text itself inside the image.",
          `Private revision instruction:\n${revision}`
        ].join("\n")
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function svgForThumbnail(input: {
  userId: string;
  productName: string;
  pointColor: string;
  references: ImageReferences;
  revisionRequest?: string;
}) {
  const productPhoto = input.references.productPhotoDataUri;
  const brandName = input.references.brandName ?? "Brand";
  const revision = input.revisionRequest?.trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#ffffff"/>
  <rect x="0" y="0" width="1024" height="20" fill="${escapeXml(input.pointColor)}"/>
  <text x="72" y="96" font-family="Arial, sans-serif" font-size="34" fill="#111827" font-weight="800">${escapeXml(
    brandName
  )}</text>
  <rect x="112" y="150" width="800" height="640" rx="48" fill="#f2f4f7" stroke="#d0d5dd"/>
  ${
    productPhoto
      ? `<image href="${escapeXml(productPhoto)}" x="112" y="150" width="800" height="640" preserveAspectRatio="xMidYMid slice"/>`
      : `<text x="512" y="486" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" fill="#667085">?곹뭹 ?ъ쭊 ?놁쓬</text>`
  }
  <rect x="72" y="838" width="880" height="96" rx="48" fill="${escapeXml(input.pointColor)}"/>
  <text x="512" y="899" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#ffffff" font-weight="800">${escapeXml(
    shortText(input.productName, 28)
  )}</text>
  ${
    revision
      ? `<text x="512" y="974" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#475467">?섏젙 諛섏쁺: ${escapeXml(
          shortText(revision, 38)
        )}</text>`
      : ""
  }
</svg>`;
}

async function generateThumbnailAsset(input: {
  userId: string;
  productName: string;
  pointColor: string;
  references: ImageReferences;
  baseImageAsset?: Asset | null;
  revisionRequest?: string;
}) {
  const openAiAsset = await generateOpenAiImage({
    userId: input.userId,
    cutNumber: 0,
    title: "Product thumbnail",
    productName: input.productName,
    pointColor: input.pointColor,
    markdown: "",
    references: input.references,
    baseImageAsset: input.baseImageAsset ?? null,
    canvasSize: "1024x1024",
    outputKind: "generated_thumbnail",
    outputFileName: "thumbnail.png",
    promptOverride: thumbnailPrompt({
      productName: input.productName,
      brandName: input.references.brandName,
      pointColor: input.pointColor,
      references: input.references,
      revisionRequest: input.revisionRequest
    }),
    revisionRequest: input.revisionRequest
  });

  if (openAiAsset) {
    return { asset: openAiAsset, provider: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2" };
  }

  const svgAsset = await saveAsset({
    userId: input.userId,
    kind: "generated_thumbnail",
    fileName: "thumbnail.svg",
    mimeType: "image/svg+xml",
    bytes: Buffer.from(svgForThumbnail(input), "utf8")
  });
  return { asset: svgAsset, provider: "dev-svg-provider" };
}

export async function startImageGeneration(userId: string, productDraftId: string) {
  const draft = await getProductDraft(userId, productDraftId);
  if (!draft) throw new Error("?곹뭹 珥덉븞??李얠쓣 ???놁뒿?덈떎.");
  const md = await getLatestApprovalMarkdown(userId, productDraftId);
  if (!md || md.status !== "approved") {
    throw new Error("?대?吏 ?앹꽦 ???뱀씤??理쒖떊 MD媛 ?꾩슂?⑸땲??");
  }

  const db = await readDb();
  const brand = db.brands.find((item) => item.id === draft.brandProfileId);
  const references = await buildImageReferences(db, userId, brand, draft);
  const expectedCutCount = extractCutCount(md.content);
  const ts = timestamp();
  const configuredProvider = process.env.OPENAI_API_KEY
    ? process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
    : "dev-svg-provider";
  const job: ImageGenerationJob = {
    id: createId("job"),
    productDraftId,
    approvalMarkdownVersionId: md.id,
    status: "running",
    expectedCutCount,
    completedCutCount: 0,
    provider: configuredProvider,
    errorMessage: null,
    createdAt: ts,
    startedAt: ts,
    completedAt: null
  };

  await updateDb((nextDb) => {
    nextDb.imageGenerationJobs.push(job);
    const target = nextDb.productDrafts.find((item) => item.id === productDraftId);
    if (target) target.status = "generating";
  });

  try {
    let actualProvider = configuredProvider;

    if (draft.thumbnailRequested) {
      const { asset, provider } = await generateThumbnailAsset({
        userId,
        productName: draft.productName,
        pointColor: brand?.pointColor ?? "#171717",
        references
      });
      actualProvider = provider;
      await updateDb((nextDb) => {
        const targetDraft = nextDb.productDrafts.find((item) => item.id === productDraftId);
        if (targetDraft) targetDraft.thumbnailAssetId = asset.id;
      });
    }

    const cutNumbers = Array.from({ length: expectedCutCount }, (_, index) => index + 1);
    const cutConcurrency = Math.max(1, Math.min(6, Number(process.env.OPENAI_CUT_CONCURRENCY || 3) || 3));

    const cutResults = await mapWithConcurrency(cutNumbers, cutConcurrency, async (index) => {
      const title = extractCutTitle(md.content, index);
      const cutSection = extractCutSection(md.content, index);
      const generationMarkdown = withCommonGenerationContext(md.content, cutSection);
      const headline = fieldFromCutSection(cutSection, ["?ㅻ뱶?쇱씤"]) || draft.productName;
      const subcopy = fieldFromCutSection(cutSection, ["?쒕툕移댄뵾", "?대?吏 ?쎌엯 臾멸뎄"]) || title;
      const { asset, provider } = await generateCutAsset({
        userId,
        cutNumber: index,
        title,
        productName: draft.productName,
        pointColor: brand?.pointColor ?? "#171717",
        markdown: generationMarkdown,
        references
      });

      const cut: GeneratedCut = {
        id: createId("cut"),
        imageGenerationJobId: job.id,
        cutNumber: index,
        title,
        imageAssetId: asset.id,
        approvedCopySnapshot: {
          headline,
          subcopy,
          sourceMarkdownVersionId: md.id
        },
        status: "produced",
        qa: {
          textReadable: true,
          koreanTextMatchesApprovedCopy: true,
          productMatchesReference: Boolean(references.productPhotoAsset),
          notes: [
            ...(references.productPhotoAsset ? [] : ["?곹뭹 ?ъ쭊???놁뼱 肄섏뀎??珥덉븞?쇰줈 ?앹꽦?덉뒿?덈떎."]),
            ...(references.logoAsset ? [] : ["釉뚮옖??濡쒓퀬媛 ?놁뼱 ?띿뒪??釉뚮옖?쒕챸 湲곗??쇰줈 ?앹꽦?덉뒿?덈떎."]),
            ...(provider === "dev-svg-provider" ? ["OPENAI_API_KEY媛 ?놁뼱 ?뚯뒪???대?吏濡??앹꽦?덉뒿?덈떎."] : [])
          ]
        },
        revisionRequest: null
      };
      return { cut, provider };
    });
    const cuts = cutResults.map((result) => result.cut);
    actualProvider = cutResults.find((result) => result.provider !== configuredProvider)?.provider ?? cutResults.at(-1)?.provider ?? actualProvider;

    return updateDb<ImageGenerationJob>((nextDb) => {
      nextDb.generatedCuts.push(...cuts.sort((a, b) => a.cutNumber - b.cutNumber));
      const targetJob = nextDb.imageGenerationJobs.find((item) => item.id === job.id);
      if (!targetJob) throw new Error("?묒뾽??李얠쓣 ???놁뒿?덈떎.");
      targetJob.status = "succeeded";
      targetJob.provider = actualProvider;
      targetJob.completedCutCount = cuts.length;
      targetJob.completedAt = timestamp();
      const targetDraft = nextDb.productDrafts.find((item) => item.id === productDraftId);
      if (targetDraft) targetDraft.status = "generated";
      return targetJob;
    });
  } catch (error) {
    await updateDb((nextDb) => {
      const targetJob = nextDb.imageGenerationJobs.find((item) => item.id === job.id);
      if (targetJob) {
        targetJob.status = "failed";
        targetJob.errorMessage = error instanceof Error ? error.message : "Unknown image generation error";
        targetJob.completedAt = timestamp();
      }
      const targetDraft = nextDb.productDrafts.find((item) => item.id === productDraftId);
      if (targetDraft) targetDraft.status = "approved";
    });
    throw error;
  }
}

export async function listJobsForDraft(userId: string, productDraftId: string) {
  const draft = await getProductDraft(userId, productDraftId);
  if (!draft) return [];
  const db = await readDb();
  return db.imageGenerationJobs.filter((job) => job.productDraftId === productDraftId);
}

export async function getJobWithCuts(userId: string, jobId: string) {
  const db = await readDb();
  const job = db.imageGenerationJobs.find((item) => item.id === jobId);
  if (!job) return null;
  const draft = db.productDrafts.find((item) => item.id === job.productDraftId && item.userId === userId);
  if (!draft) return null;
  return {
    job,
    draft,
    cuts: db.generatedCuts.filter((cut) => cut.imageGenerationJobId === job.id).sort((a, b) => a.cutNumber - b.cutNumber)
  };
}

function latestApprovedMarkdownForDraft(db: AppDb, productDraftId: string) {
  return (
    db.approvalMarkdownVersions
      .filter((md) => md.productDraftId === productDraftId && md.status === "approved")
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export async function regenerateCutImage(userId: string, cutId: string) {
  const db = await readDb();
  const cut = db.generatedCuts.find((item) => item.id === cutId);
  if (!cut) throw new Error("而룹쓣 李얠쓣 ???놁뒿?덈떎.");
  const job = db.imageGenerationJobs.find((item) => item.id === cut.imageGenerationJobId);
  const draft = job ? db.productDrafts.find((item) => item.id === job.productDraftId && item.userId === userId) : null;
  if (!job || !draft) throw new Error("沅뚰븳???놁뒿?덈떎.");
  const brand = db.brands.find((item) => item.id === draft.brandProfileId);
  const md = latestApprovedMarkdownForDraft(db, draft.id) ?? db.approvalMarkdownVersions.find((item) => item.id === job.approvalMarkdownVersionId);
  if (!md || md.status !== "approved") throw new Error("??而룹쓣 ?ㅼ떆 ?앹꽦?섎젮硫??뱀씤??理쒖떊 珥덉븞???꾩슂?⑸땲??");

  const references = await buildImageReferences(db, userId, brand, draft);
  const title = extractCutTitle(md.content, cut.cutNumber);
  const cutSection = extractCutSection(md.content, cut.cutNumber);
  const generationMarkdown = withCommonGenerationContext(md.content, cutSection);
  const headline = fieldFromCutSection(cutSection, ["헤드라인", "\uD5E4\uB4DC\uB77C\uC778"]) || draft.productName;
  const subcopy = fieldFromCutSection(cutSection, ["서브카피", "이미지 삽입 문구"]) || title;
  const { asset, provider } = await generateCutAsset({
    userId,
    cutNumber: cut.cutNumber,
    title,
    productName: draft.productName,
    pointColor: brand?.pointColor ?? "#171717",
    markdown: generationMarkdown,
    references
  });

  return updateDb<GeneratedCut>((nextDb) => {
    const target = nextDb.generatedCuts.find((item) => item.id === cutId);
    if (!target) throw new Error("而룹쓣 李얠쓣 ???놁뒿?덈떎.");
    const targetJob = nextDb.imageGenerationJobs.find((item) => item.id === target.imageGenerationJobId);
    if (targetJob) targetJob.provider = provider;
    target.title = title;
    target.imageAssetId = asset.id;
    target.approvedCopySnapshot = {
      headline,
      subcopy,
      sourceMarkdownVersionId: md.id
    };
    target.status = "produced";
    target.revisionRequest = null;
    target.qa = {
      textReadable: true,
      koreanTextMatchesApprovedCopy: true,
      productMatchesReference: Boolean(references.productPhotoAsset),
      notes: [
        ...(references.productPhotoAsset ? [] : ["?곹뭹 ?ъ쭊???놁뼱 肄섏뀎??珥덉븞?쇰줈 ?앹꽦?덉뒿?덈떎."]),
        ...(references.logoAsset ? [] : ["釉뚮옖??濡쒓퀬媛 ?놁뼱 ?띿뒪??釉뚮옖?쒕챸 湲곗??쇰줈 ?앹꽦?덉뒿?덈떎."]),
        ...(provider === "dev-svg-provider" ? ["OPENAI_API_KEY媛 ?놁뼱 ?뚯뒪???대?吏濡??앹꽦?덉뒿?덈떎."] : []),
        `?뱀씤 珥덉븞 v${md.version} 湲곗??쇰줈 ??而룸쭔 ?ㅼ떆 ?앹꽦?덉뒿?덈떎.`
      ]
    };
    return target;
  });
}

export async function regenerateCutImageForDraftCut(userId: string, productDraftId: string, cutNumber: number) {
  const db = await readDb();
  const draft = db.productDrafts.find((item) => item.id === productDraftId && item.userId === userId);
  if (!draft) throw new Error("?곹뭹 珥덉븞??李얠쓣 ???놁뒿?덈떎.");

  const jobs = db.imageGenerationJobs
    .filter((job) => job.productDraftId === productDraftId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const job of jobs) {
    const cut = db.generatedCuts.find((item) => item.imageGenerationJobId === job.id && item.cutNumber === cutNumber);
    if (cut) {
      await regenerateCutImage(userId, cut.id);
      return { jobId: job.id, cutId: cut.id };
    }
  }

  throw new Error(`Cut ${String(cutNumber).padStart(2, "0")} 湲곗〈 ?대?吏瑜?李얠쓣 ???놁뒿?덈떎.`);
}

export async function saveCutRevision(
  userId: string,
  cutId: string,
  revisionRequest: string,
  options: { selectedProductPhotoAssetId?: string | null } = {}
) {
  const request = revisionRequest.trim();
  const db = await readDb();
  const cut = db.generatedCuts.find((item) => item.id === cutId);
  if (!cut) throw new Error("而룹쓣 李얠쓣 ???놁뒿?덈떎.");
  const job = db.imageGenerationJobs.find((item) => item.id === cut.imageGenerationJobId);
  const draft = job ? db.productDrafts.find((item) => item.id === job.productDraftId && item.userId === userId) : null;
  if (!job || !draft) throw new Error("沅뚰븳???놁뒿?덈떎.");
  const brand = db.brands.find((item) => item.id === draft.brandProfileId);
  const md = db.approvalMarkdownVersions.find((item) => item.id === job.approvalMarkdownVersionId);
  const baseImageAsset = cut.imageAssetId ? db.assets.find((asset) => asset.id === cut.imageAssetId) ?? null : null;

  if (!request) {
    return updateDb<GeneratedCut>((nextDb) => {
      const target = nextDb.generatedCuts.find((item) => item.id === cutId);
      if (!target) throw new Error("而룹쓣 李얠쓣 ???놁뒿?덈떎.");
      target.revisionRequest = null;
      target.status = "produced";
      return target;
    });
  }

  const references = await buildImageReferences(db, userId, brand, draft, options.selectedProductPhotoAssetId);
  const markdown = md ? extractCutSection(md.content, cut.cutNumber) || md.content : "";
  const revisedMarkdown = md
    ? withCommonGenerationContext(md.content, applyRevisionToMarkdown(markdown, request))
    : applyRevisionToMarkdown(markdown, request);
  let generated: Awaited<ReturnType<typeof generateCutAsset>>;
  try {
    generated = await generateCutAsset({
      userId,
      cutNumber: cut.cutNumber,
      title: cut.title,
      productName: draft.productName,
      pointColor: brand?.pointColor ?? "#171717",
      markdown: revisedMarkdown,
      references,
      baseImageAsset,
      revisionRequest: request
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown image generation error";
    return updateDb<GeneratedCut>((nextDb) => {
      const target = nextDb.generatedCuts.find((item) => item.id === cutId);
      if (!target) throw new Error("而룹쓣 李얠쓣 ???놁뒿?덈떎.");
      target.revisionRequest = request;
      target.status = "failed";
      target.qa = {
        ...target.qa,
        textReadable: false,
        koreanTextMatchesApprovedCopy: false,
        notes: [
          ...target.qa.notes.filter((note) => !note.includes("?대?吏 ?앹꽦 ?ㅽ뙣") && !note.includes("OpenAI")),
          `?대?吏 ?앹꽦 ?ㅽ뙣: ${shortText(message, 160)}`
        ]
      };
      return target;
    });
  }

  const { asset, provider } = generated;

  return updateDb<GeneratedCut>((nextDb) => {
    const target = nextDb.generatedCuts.find((item) => item.id === cutId);
    if (!target) throw new Error("而룹쓣 李얠쓣 ???놁뒿?덈떎.");
    const targetJob = nextDb.imageGenerationJobs.find((item) => item.id === target.imageGenerationJobId);
    if (targetJob) targetJob.provider = provider;
    target.imageAssetId = asset.id;
    target.revisionRequest = request;
    target.status = "produced";
    target.qa = {
      ...target.qa,
      textReadable: true,
      koreanTextMatchesApprovedCopy: true,
      productMatchesReference: Boolean(references.productPhotoAsset),
      notes: [
        ...target.qa.notes.filter((note) => !note.includes("?섏젙 ?붿껌")),
        "理쒓렐 ?섏젙 ?붿껌??諛섏쁺???ㅼ떆 ?앹꽦?덉뒿?덈떎."
      ]
    };
    return target;
  });
}

export async function saveThumbnailRevision(userId: string, productDraftId: string, revisionRequest: string) {
  const request = revisionRequest.trim();
  if (!request) throw new Error("?몃꽕???섏젙 ?붿껌???낅젰?댁＜?몄슂.");

  const db = await readDb();
  const draft = db.productDrafts.find((item) => item.id === productDraftId && item.userId === userId);
  if (!draft) throw new Error("?곹뭹 珥덉븞??李얠쓣 ???놁뒿?덈떎.");
  if (!draft.thumbnailAssetId) throw new Error("?섏젙???몃꽕?쇱씠 ?놁뒿?덈떎.");

  const brand = db.brands.find((item) => item.id === draft.brandProfileId);
  const baseImageAsset = db.assets.find((asset) => asset.id === draft.thumbnailAssetId) ?? null;
  const references = await buildImageReferences(db, userId, brand, draft);
  const { asset } = await generateThumbnailAsset({
    userId,
    productName: draft.productName,
    pointColor: brand?.pointColor ?? "#171717",
    references,
    baseImageAsset,
    revisionRequest: request
  });

  return updateDb<ProductDraft>((nextDb) => {
    const target = nextDb.productDrafts.find((item) => item.id === productDraftId && item.userId === userId);
    if (!target) throw new Error("?곹뭹 珥덉븞??李얠쓣 ???놁뒿?덈떎.");
    target.thumbnailAssetId = asset.id;
    target.thumbnailRequested = true;
    target.updatedAt = timestamp();
    return target;
  });
}
