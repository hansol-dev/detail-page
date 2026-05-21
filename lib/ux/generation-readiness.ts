import type { Asset, BrandProfile, ProductDraft, ImageGenerationJob } from "@/lib/types";
import { userFacingTerms } from "./copy";

export interface GenerationReadiness {
  mode: "test" | "ai";
  label: "테스트 이미지" | "AI 생성 이미지";
  productionReady: boolean;
  warnings: string[];
  referenceStatus: {
    logo: "uploaded" | "missing";
    productPhotoCount: number;
  };
}

type BuildInput = {
  hasImageApiKey: boolean;
  job?: ImageGenerationJob | null;
  draft?: ProductDraft | null;
  brand?: BrandProfile | null;
  assets?: Asset[];
};

export function buildGenerationReadiness(input: BuildInput): GenerationReadiness {
  const mode = !input.hasImageApiKey || input.job?.provider === "dev-svg-provider" ? "test" : "ai";
  const logoUploaded = Boolean(input.brand?.logoAssetId);
  const productPhotoCount = input.draft?.photoAssetIds.length ?? 0;
  const warnings: string[] = [];

  if (mode === "test") {
    warnings.push("현재 결과는 흐름 확인용 테스트 이미지입니다. 판매용 최종 이미지는 AI 생성 설정 후 다시 생성하세요.");
  }
  if (!productPhotoCount) {
    warnings.push("상품 사진이 없어 콘셉트 초안으로 생성됩니다.");
  }
  if (!logoUploaded) {
    warnings.push("로고가 없어 텍스트 브랜드명 기준으로 생성됩니다.");
  }

  return {
    mode,
    label: mode === "test" ? userFacingTerms.testImage : userFacingTerms.aiImage,
    productionReady: mode === "ai" && productPhotoCount > 0,
    warnings,
    referenceStatus: {
      logo: logoUploaded ? "uploaded" : "missing",
      productPhotoCount
    }
  };
}
