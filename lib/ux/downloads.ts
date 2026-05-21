import type { Asset, GeneratedCut } from "@/lib/types";

export interface DownloadableCut {
  cutId: string;
  cutNumber: number;
  title: string;
  assetId: string;
  fileName: string;
  href: string;
}

function safeName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "detail-page";
}

function extensionForAsset(asset: Asset) {
  if (asset.mimeType === "image/svg+xml") return "svg";
  if (asset.mimeType === "image/jpeg") return "jpg";
  if (asset.mimeType === "image/webp") return "webp";
  return "png";
}

export function buildDownloadableThumbnail(input: { productName: string; asset?: Asset | null }) {
  if (!input.asset) return null;
  return {
    assetId: input.asset.id,
    fileName: `${safeName(input.productName)}-thumbnail.${extensionForAsset(input.asset)}`,
    href: `/api/assets/${input.asset.id}`
  };
}

export function buildDownloadableCuts(input: {
  productName: string;
  cuts: GeneratedCut[];
  assets: Asset[];
}): DownloadableCut[] {
  return input.cuts
    .map((cut) => {
      const asset = input.assets.find((item) => item.id === cut.imageAssetId);
      if (!asset) return null;
      const cutNumber = String(cut.cutNumber).padStart(2, "0");
      return {
        cutId: cut.id,
        cutNumber: cut.cutNumber,
        title: cut.title,
        assetId: asset.id,
        fileName: `${safeName(input.productName)}-cut-${cutNumber}.${extensionForAsset(asset)}`,
        href: `/api/assets/${asset.id}`
      };
    })
    .filter((item): item is DownloadableCut => Boolean(item));
}
