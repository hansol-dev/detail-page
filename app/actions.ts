"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentUser, getCurrentUserId, readDb } from "@/lib/store";
import { createUser } from "@/lib/services/users";
import { archiveBrand, createBrand, updateBrand } from "@/lib/services/brands";
import { createProductDraft, updateProductDraft } from "@/lib/services/product-drafts";
import {
  approveMarkdown,
  generateApprovalMarkdown,
  getApprovalMarkdown,
  regenerateApprovalCutMarkdown,
  saveApprovalMarkdown
} from "@/lib/services/approval-md";
import { saveMdWorkspaceFile } from "@/lib/services/md-workspace";
import {
  processImageGenerationStep,
  regenerateCutImageForDraftCut,
  saveCutRevision,
  saveThumbnailRevision,
  startImageGeneration
} from "@/lib/services/image-generation";
import { ALL_CATEGORY_VALUE } from "@/lib/product-categories";
import type { Notice } from "@/lib/types";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function textareaText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");
  return value.trim() ? value : "";
}

function file(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const db = await readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === email && item.status === "active");

  if (!user || user.password !== password) {
    redirect("/login?error=1");
  }

  (await cookies()).set("detail_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete("detail_user_id");
  redirect("/login");
}

function files(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
}

function notices(formData: FormData): Notice[] {
  const indexes = new Set<number>();

  for (const key of formData.keys()) {
    const match = key.match(/^notice(?:Title|Content)(\d+)$/);
    if (match) indexes.add(Number(match[1]));
  }

  return [...indexes].sort((a, b) => a - b).map((n) => {
    const selectedCategories = formData
      .getAll(`noticeCategories${n}`)
      .map((value) => String(value))
      .filter(Boolean);
    const categories = selectedCategories.includes(ALL_CATEGORY_VALUE) ? [] : selectedCategories;
    return {
      title: textareaText(formData, `noticeTitle${n}`),
      content: textareaText(formData, `noticeContent${n}`),
      categories
    };
  }).filter((notice) => notice.title.trim() || notice.content.trim());
}

export async function createUserAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin") {
    throw new Error("관리자만 사용자를 추가할 수 있습니다.");
  }

  await createUser({
    email: text(formData, "email"),
    displayName: text(formData, "displayName"),
    role: text(formData, "role") === "admin" ? "admin" : "user"
  });
  revalidatePath("/admin/users");
}

export async function createBrandAction(formData: FormData) {
  const userId = await getCurrentUserId();
  await createBrand(userId, {
    brandName: text(formData, "brandName"),
    pointColor: text(formData, "pointColor") || "#171717",
    subColor: text(formData, "subColor") || undefined,
    defaultTone: text(formData, "defaultTone") || undefined,
    defaultSalesChannel: text(formData, "defaultSalesChannel") || undefined,
    requiredPhrases: text(formData, "requiredPhrases") || undefined,
    forbiddenPhrases: text(formData, "forbiddenPhrases") || undefined,
    shippingNotice: textareaText(formData, "shippingNotice") || undefined,
    returnExchangeNotice: textareaText(formData, "returnExchangeNotice") || undefined,
    customNotices: notices(formData),
    logo: file(formData, "logo")
  });
  revalidatePath("/brands");
}

export async function updateBrandAction(formData: FormData) {
  const userId = await getCurrentUserId();
  await updateBrand(userId, text(formData, "brandId"), {
    brandName: text(formData, "brandName"),
    pointColor: text(formData, "pointColor") || "#171717",
    subColor: text(formData, "subColor") || undefined,
    defaultTone: text(formData, "defaultTone") || undefined,
    defaultSalesChannel: text(formData, "defaultSalesChannel") || undefined,
    requiredPhrases: text(formData, "requiredPhrases") || undefined,
    forbiddenPhrases: text(formData, "forbiddenPhrases") || undefined,
    shippingNotice: textareaText(formData, "shippingNotice") || undefined,
    returnExchangeNotice: textareaText(formData, "returnExchangeNotice") || undefined,
    customNotices: notices(formData),
    logo: file(formData, "logo")
  });
  revalidatePath("/brands");
  revalidatePath("/detail-pages/new");
}

export async function deleteBrandAction(formData: FormData) {
  const userId = await getCurrentUserId();
  await archiveBrand(userId, text(formData, "brandId"));
  revalidatePath("/brands");
  revalidatePath("/detail-pages/new");
}

export async function createProductDraftAction(formData: FormData) {
  const userId = await getCurrentUserId();
  let draftId: string | null = null;
  try {
    const draft = await createProductDraft(userId, {
      brandProfileId: text(formData, "brandProfileId"),
      productName: text(formData, "productName"),
      category: text(formData, "category"),
      salesChannel: text(formData, "salesChannel") || undefined,
      targetCustomer: text(formData, "targetCustomer") || undefined,
      sellingPoints: text(formData, "sellingPoints") || undefined,
      facts: text(formData, "facts") || undefined,
      requiredPhrases: text(formData, "requiredPhrases") || undefined,
      forbiddenPhrases: text(formData, "forbiddenPhrases") || undefined,
      shippingNotice: textareaText(formData, "shippingNotice") || undefined,
      returnExchangeNotice: textareaText(formData, "returnExchangeNotice") || undefined,
      customNotices: notices(formData),
      cutCount: Number(text(formData, "cutCount") || 6),
      photos: files(formData, "photos"),
      thumbnailRequested: formData.get("thumbnailRequested") === "on"
    });
    draftId = draft.id;
    await generateApprovalMarkdown(userId, draft.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "상세페이지 초안 생성 중 오류가 발생했습니다.";
    redirect(`/detail-pages/new?error=${encodeURIComponent(message.slice(0, 180))}`);
  }
  if (!draftId) redirect("/detail-pages/new?error=상세페이지%20초안%20생성에%20실패했습니다.");
  redirect(`/detail-pages/${draftId}/approval`);
}

export async function updateProductDraftAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const productDraftId = text(formData, "productDraftId");
  await updateProductDraft(userId, productDraftId, {
    brandProfileId: text(formData, "brandProfileId"),
    productName: text(formData, "productName"),
    category: text(formData, "category"),
    salesChannel: text(formData, "salesChannel") || undefined,
    targetCustomer: text(formData, "targetCustomer") || undefined,
    sellingPoints: text(formData, "sellingPoints") || undefined,
    facts: text(formData, "facts") || undefined,
    requiredPhrases: text(formData, "requiredPhrases") || undefined,
    forbiddenPhrases: text(formData, "forbiddenPhrases") || undefined,
    shippingNotice: textareaText(formData, "shippingNotice") || undefined,
    returnExchangeNotice: textareaText(formData, "returnExchangeNotice") || undefined,
    customNotices: notices(formData),
    cutCount: Number(text(formData, "cutCount") || 6),
    retainedPhotoAssetIds: formData.getAll("retainedPhotoAssetIds").map((value) => String(value)).filter(Boolean),
    photos: files(formData, "photos"),
    thumbnailRequested: formData.get("thumbnailRequested") === "on"
  });
  await generateApprovalMarkdown(userId, productDraftId);
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
  redirect(`/detail-pages/${productDraftId}/approval`);
}

export async function regenerateApprovalMarkdownAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const productDraftId = text(formData, "productDraftId");
  await generateApprovalMarkdown(userId, productDraftId);
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
}

export async function regenerateApprovalCutMarkdownAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const markdownId = text(formData, "markdownId");
  const productDraftId = text(formData, "productDraftId");
  const cutNumber = Number(text(formData, "cutNumber"));
  await regenerateApprovalCutMarkdown(userId, markdownId, cutNumber);
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
  redirect(`/detail-pages/${productDraftId}/approval`);
}

export async function saveApprovalMarkdownAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const markdownId = text(formData, "markdownId");
  const productDraftId = text(formData, "productDraftId");
  await saveApprovalMarkdown(userId, markdownId, String(formData.get("content") ?? ""));
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
}

function replaceCutSection(content: string, cutNumber: number, nextSection: string) {
  const matches = [...content.matchAll(/^### Cut\s+(\d+)\.\s*(.+)$/gm)];
  const targetIndex = matches.findIndex((match) => Number(match[1]) === cutNumber);
  const normalizedSection = nextSection.trim();
  if (targetIndex < 0) {
    return `${content.trim()}\n\n${normalizedSection}\n`;
  }

  const target = matches[targetIndex];
  const start = target.index ?? 0;
  const end = matches[targetIndex + 1]?.index ?? content.length;
  return `${content.slice(0, start)}${normalizedSection}\n\n${content.slice(end).trimStart()}`;
}

export async function saveDraftCutSectionAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const markdownId = text(formData, "markdownId");
  const productDraftId = text(formData, "productDraftId");
  const cutNumber = Number(text(formData, "cutNumber"));
  const cutSection = String(formData.get("cutSection") ?? "");
  const existing = await getApprovalMarkdown(userId, markdownId);
  if (!existing) throw new Error("초안을 찾을 수 없습니다.");
  if (existing.status === "approved") throw new Error("승인된 초안은 수정할 수 없습니다.");

  await saveApprovalMarkdown(userId, markdownId, replaceCutSection(existing.content, cutNumber, cutSection));
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
}

export async function approveMarkdownAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const markdownId = text(formData, "markdownId");
  const productDraftId = text(formData, "productDraftId");
  await approveMarkdown(userId, markdownId);
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
}

export async function approveAndRegenerateDraftCutImageAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const markdownId = text(formData, "markdownId");
  const productDraftId = text(formData, "productDraftId");
  const cutNumber = Number(text(formData, "cutNumber"));
  await approveMarkdown(userId, markdownId);
  const result = await regenerateCutImageForDraftCut(userId, productDraftId, cutNumber);
  revalidatePath(`/detail-pages/${productDraftId}/approval`);
  revalidatePath(`/detail-pages/${productDraftId}/review?jobId=${result.jobId}`);
  redirect(`/detail-pages/${productDraftId}/review?jobId=${result.jobId}`);
}

export async function startImageGenerationAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const productDraftId = text(formData, "productDraftId");
  const job = await startImageGeneration(userId, productDraftId);
  redirect(`/detail-pages/${productDraftId}/review?jobId=${job.id}`);
}

export async function processImageGenerationStepAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const productDraftId = text(formData, "productDraftId");
  const jobId = text(formData, "jobId");
  await processImageGenerationStep(userId, jobId);
  revalidatePath(`/detail-pages/${productDraftId}/review?jobId=${jobId}`);
  redirect(`/detail-pages/${productDraftId}/review?jobId=${jobId}`);
}

export async function saveCutRevisionAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const cutId = text(formData, "cutId");
  const productDraftId = text(formData, "productDraftId");
  const jobId = text(formData, "jobId");
  const sourceText = text(formData, "revisionSourceText");
  const replacementText = text(formData, "revisionReplacementText");
  const freeformRequest = text(formData, "revisionRequest");
  const replaceProductPhoto = formData.get("replaceProductPhoto") === "on";
  const selectedProductPhotoAssetId = text(formData, "productPhotoAssetId");
  const scopedTextRequest =
    sourceText && replacementText
      ? [`문구만 교체: "${sourceText}" -> "${replacementText}"`, freeformRequest].filter(Boolean).join("\n")
      : freeformRequest;
  const photoReplacementRequest =
    replaceProductPhoto && selectedProductPhotoAssetId
      ? "PRODUCT_PHOTO_REFERENCE: 선택한 상품 사진을 참고해서 상품 정체성, 패키지 형태, 라벨, 옵션/맛, 색상 오류를 바로잡아줘. 사진을 그대로 붙여넣듯 쓰기보다 현재 컷 디자인에 자연스럽게 반영해줘."
      : "";
  await saveCutRevision(userId, cutId, [scopedTextRequest, photoReplacementRequest].filter(Boolean).join("\n"), {
    selectedProductPhotoAssetId: replaceProductPhoto ? selectedProductPhotoAssetId : null
  });
  revalidatePath(`/detail-pages/${productDraftId}/review?jobId=${jobId}`);
  redirect(`/detail-pages/${productDraftId}/review?jobId=${jobId}`);
}

export async function saveThumbnailRevisionAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const productDraftId = text(formData, "productDraftId");
  const jobId = text(formData, "jobId");
  const sourceText = text(formData, "thumbnailRevisionSourceText");
  const replacementText = text(formData, "thumbnailRevisionReplacementText");
  const freeformRequest = text(formData, "thumbnailRevisionRequest");
  const scopedTextRequest =
    sourceText && replacementText
      ? [`문구만 교체: "${sourceText}" -> "${replacementText}"`, freeformRequest].filter(Boolean).join("\n")
      : freeformRequest;
  await saveThumbnailRevision(userId, productDraftId, scopedTextRequest);
  revalidatePath(`/detail-pages/${productDraftId}/review?jobId=${jobId}`);
  redirect(`/detail-pages/${productDraftId}/review?jobId=${jobId}`);
}

export async function saveMdWorkspaceFileAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const id = text(formData, "id");
  await saveMdWorkspaceFile(userId, id, String(formData.get("content") ?? ""));
  revalidatePath("/md-workspace");
}
