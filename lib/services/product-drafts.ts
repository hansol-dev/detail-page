import "server-only";
import { createId, fileToBuffer, readDb, saveAsset, timestamp, updateDb } from "../store";
import { getBrand } from "./brands";
import type { Notice, ProductDraft } from "../types";

export async function listProductDrafts(userId: string) {
  const db = await readDb();
  return db.productDrafts.filter((draft) => draft.userId === userId);
}

export async function getProductDraft(userId: string, productDraftId: string) {
  const db = await readDb();
  return db.productDrafts.find((draft) => draft.id === productDraftId && draft.userId === userId) ?? null;
}

export async function createProductDraft(
  userId: string,
  input: {
    brandProfileId: string;
    productName: string;
    category: string;
    salesChannel?: string;
    targetCustomer?: string;
    sellingPoints?: string;
    facts?: string;
    requiredPhrases?: string;
    forbiddenPhrases?: string;
    shippingNotice?: string;
    returnExchangeNotice?: string;
    customNotices?: Notice[];
    cutCount?: number;
    photos?: File[];
    thumbnailRequested?: boolean;
  }
) {
  if (!input.productName.trim()) throw new Error("상품명은 필수입니다.");
  if (!input.category.trim()) throw new Error("카테고리는 필수입니다.");
  const brand = await getBrand(userId, input.brandProfileId);
  if (!brand) throw new Error("선택한 브랜드를 찾을 수 없습니다.");

  const photoAssetIds: string[] = [];
  for (const photo of input.photos ?? []) {
    if (!photo.size) continue;
    const asset = await saveAsset({
      userId,
      kind: "product_photo",
      fileName: photo.name,
      mimeType: photo.type,
      bytes: await fileToBuffer(photo)
    });
    photoAssetIds.push(asset.id);
  }

  return updateDb<ProductDraft>((db) => {
    const ts = timestamp();
    const draft: ProductDraft = {
      id: createId("draft"),
      userId,
      brandProfileId: brand.id,
      productName: input.productName.trim(),
      category: input.category.trim(),
      salesChannel: input.salesChannel || brand.defaultSalesChannel,
      targetCustomer: input.targetCustomer || null,
      sellingPoints: input.sellingPoints || null,
      facts: input.facts || null,
      requiredPhrases: input.requiredPhrases || brand.requiredPhrases,
      forbiddenPhrases: input.forbiddenPhrases || brand.forbiddenPhrases,
      shippingNotice: input.shippingNotice || null,
      returnExchangeNotice: input.returnExchangeNotice || null,
      customNotices: input.customNotices ?? [],
      cutCount: Number(input.cutCount || 6),
      photoAssetIds,
      thumbnailRequested: Boolean(input.thumbnailRequested),
      thumbnailAssetId: null,
      status: "draft",
      createdAt: ts,
      updatedAt: ts
    };
    db.productDrafts.push(draft);
    return draft;
  });
}

export async function updateProductDraft(
  userId: string,
  productDraftId: string,
  input: {
    brandProfileId: string;
    productName: string;
    category: string;
    salesChannel?: string;
    targetCustomer?: string;
    sellingPoints?: string;
    facts?: string;
    requiredPhrases?: string;
    forbiddenPhrases?: string;
    shippingNotice?: string;
    returnExchangeNotice?: string;
    customNotices?: Notice[];
    cutCount?: number;
    retainedPhotoAssetIds?: string[];
    photos?: File[];
    thumbnailRequested?: boolean;
  }
) {
  if (!input.productName.trim()) throw new Error("상품명은 필수입니다.");
  if (!input.category.trim()) throw new Error("카테고리는 필수입니다.");
  const brand = await getBrand(userId, input.brandProfileId);
  if (!brand) throw new Error("선택한 브랜드를 찾을 수 없습니다.");

  const db = await readDb();
  const existing = db.productDrafts.find((draft) => draft.id === productDraftId && draft.userId === userId);
  if (!existing) throw new Error("상품 초안을 찾을 수 없습니다.");

  const retainedPhotoAssetIds = (input.retainedPhotoAssetIds ?? []).filter((assetId) => {
    const asset = db.assets.find((item) => item.id === assetId && item.userId === userId && item.kind === "product_photo");
    return Boolean(asset) && existing.photoAssetIds.includes(assetId);
  });

  const newPhotoAssetIds: string[] = [];
  for (const photo of input.photos ?? []) {
    if (!photo.size) continue;
    const asset = await saveAsset({
      userId,
      kind: "product_photo",
      fileName: photo.name,
      mimeType: photo.type,
      bytes: await fileToBuffer(photo)
    });
    newPhotoAssetIds.push(asset.id);
  }

  return updateDb<ProductDraft>((nextDb) => {
    const draft = nextDb.productDrafts.find((item) => item.id === productDraftId && item.userId === userId);
    if (!draft) throw new Error("상품 초안을 찾을 수 없습니다.");

    const photoAssetIds = [...retainedPhotoAssetIds, ...newPhotoAssetIds];
    draft.brandProfileId = brand.id;
    draft.productName = input.productName.trim();
    draft.category = input.category.trim();
    draft.salesChannel = input.salesChannel || brand.defaultSalesChannel;
    draft.targetCustomer = input.targetCustomer || null;
    draft.sellingPoints = input.sellingPoints || null;
    draft.facts = input.facts || null;
    draft.requiredPhrases = input.requiredPhrases || brand.requiredPhrases;
    draft.forbiddenPhrases = input.forbiddenPhrases || brand.forbiddenPhrases;
    draft.shippingNotice = input.shippingNotice || null;
    draft.returnExchangeNotice = input.returnExchangeNotice || null;
    draft.customNotices = input.customNotices ?? [];
    draft.cutCount = Number(input.cutCount || 6);
    draft.photoAssetIds = photoAssetIds;
    draft.thumbnailRequested = Boolean(input.thumbnailRequested);
    draft.thumbnailAssetId = input.thumbnailRequested ? draft.thumbnailAssetId : null;
    draft.status = "draft";
    draft.updatedAt = timestamp();
    return draft;
  });
}
