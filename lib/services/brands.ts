import "server-only";
import { createId, fileToBuffer, readDb, saveAsset, timestamp, updateDb } from "../store";
import type { BrandProfile, Notice } from "../types";

const MAX_BRANDS_PER_USER = 5;

export async function listBrands(userId: string) {
  const db = await readDb();
  return db.brands.filter((brand) => brand.userId === userId && !brand.archivedAt);
}

export async function getBrand(userId: string, brandId: string) {
  const db = await readDb();
  return db.brands.find((brand) => brand.id === brandId && brand.userId === userId && !brand.archivedAt) ?? null;
}

type BrandInput = {
  brandName: string;
  pointColor: string;
  subColor?: string;
  defaultTone?: string;
  defaultSalesChannel?: string;
  requiredPhrases?: string;
  forbiddenPhrases?: string;
  shippingNotice?: string;
  returnExchangeNotice?: string;
  customNotices?: Notice[];
  logo?: File | null;
};

async function saveLogo(userId: string, logo?: File | null) {
  if (!logo?.size) return null;
  return saveAsset({
    userId,
    kind: "brand_logo",
    fileName: logo.name,
    mimeType: logo.type,
    bytes: await fileToBuffer(logo)
  });
}

function validateBrandInput(input: BrandInput) {
  if (!input.brandName.trim()) throw new Error("브랜드명은 필수입니다.");
  if (!/^#[0-9a-fA-F]{6}$/.test(input.pointColor)) throw new Error("포인트 컬러는 HEX 형식이어야 합니다.");
}

export async function createBrand(userId: string, input: BrandInput) {
  validateBrandInput(input);
  const logoAsset = await saveLogo(userId, input.logo);

  return updateDb<BrandProfile>((db) => {
    const activeCount = db.brands.filter((brand) => brand.userId === userId && !brand.archivedAt).length;
    if (activeCount >= MAX_BRANDS_PER_USER) {
      throw new Error("브랜드는 사용자당 최대 5개까지 등록할 수 있습니다.");
    }

    const ts = timestamp();
    const brand: BrandProfile = {
      id: createId("brand"),
      userId,
      brandName: input.brandName.trim(),
      logoAssetId: logoAsset?.id ?? null,
      pointColor: input.pointColor,
      subColor: input.subColor || null,
      defaultTone: input.defaultTone || null,
      defaultSalesChannel: input.defaultSalesChannel || null,
      requiredPhrases: input.requiredPhrases || null,
      forbiddenPhrases: input.forbiddenPhrases || null,
      shippingNotice: input.shippingNotice || null,
      returnExchangeNotice: input.returnExchangeNotice || null,
      customNotices: (input.customNotices ?? []).filter((notice) => notice.title || notice.content),
      archivedAt: null,
      createdAt: ts,
      updatedAt: ts
    };
    db.brands.push(brand);
    return brand;
  });
}

export async function updateBrand(userId: string, brandId: string, input: BrandInput) {
  validateBrandInput(input);
  const logoAsset = await saveLogo(userId, input.logo);

  return updateDb<BrandProfile>((db) => {
    const brand = db.brands.find((item) => item.id === brandId && item.userId === userId && !item.archivedAt);
    if (!brand) throw new Error("수정할 브랜드를 찾을 수 없습니다.");

    brand.brandName = input.brandName.trim();
    brand.logoAssetId = logoAsset?.id ?? brand.logoAssetId;
    brand.pointColor = input.pointColor;
    brand.subColor = input.subColor || null;
    brand.defaultTone = input.defaultTone || null;
    brand.defaultSalesChannel = input.defaultSalesChannel || null;
    brand.requiredPhrases = input.requiredPhrases || null;
    brand.forbiddenPhrases = input.forbiddenPhrases || null;
    brand.shippingNotice = input.shippingNotice || null;
    brand.returnExchangeNotice = input.returnExchangeNotice || null;
    brand.customNotices = (input.customNotices ?? []).filter((notice) => notice.title || notice.content);
    brand.updatedAt = timestamp();

    return brand;
  });
}

export async function archiveBrand(userId: string, brandId: string) {
  return updateDb((db) => {
    const brand = db.brands.find((item) => item.id === brandId && item.userId === userId && !item.archivedAt);
    if (!brand) throw new Error("삭제할 브랜드를 찾을 수 없습니다.");

    const ts = timestamp();
    brand.archivedAt = ts;
    brand.updatedAt = ts;
  });
}
