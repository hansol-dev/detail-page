import type { GeneratedCut, ImageGenerationJob, ProductDraft } from "@/lib/types";

export type OnboardingStepId = "brand" | "product" | "draft" | "image" | "download";
export type OnboardingStepStatus = "complete" | "current" | "locked";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  href: string;
  actionLabel: string;
}

type BuildInput = {
  brandCount: number;
  drafts: ProductDraft[];
  jobs: ImageGenerationJob[];
  cuts: GeneratedCut[];
};

function latestDraft(drafts: ProductDraft[]) {
  return [...drafts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

function latestJob(jobs: ImageGenerationJob[]) {
  return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

export function buildOnboardingSteps(input: BuildInput): OnboardingStep[] {
  const draft = latestDraft(input.drafts);
  const job = latestJob(input.jobs);
  const hasBrand = input.brandCount > 0;
  const hasProduct = input.drafts.length > 0;
  const hasDraftReview = Boolean(
    draft && ["md_ready", "approved", "generating", "generated", "revision_requested"].includes(draft.status)
  );
  const hasImage = Boolean(job || draft?.status === "generated");
  const hasDownload = input.cuts.some((cut) => Boolean(cut.imageAssetId));

  const completeByStep: Record<OnboardingStepId, boolean> = {
    brand: hasBrand,
    product: hasProduct,
    draft: hasDraftReview,
    image: hasImage,
    download: hasDownload
  };

  const specs: Array<Omit<OnboardingStep, "status">> = [
    {
      id: "brand",
      title: "브랜드 등록",
      description: "로고, 컬러, 공통 안내사항을 저장합니다.",
      href: "/brands",
      actionLabel: "브랜드 만들기"
    },
    {
      id: "product",
      title: "상품 정보 입력",
      description: "필수 정보부터 넣어 상세페이지 초안을 만듭니다.",
      href: "/detail-pages/new",
      actionLabel: "새 상세페이지"
    },
    {
      id: "draft",
      title: "상세페이지 초안 확인",
      description: "컷 구성과 확인 필요 항목을 검토합니다.",
      href: draft ? `/detail-pages/${draft.id}/approval` : "/detail-pages",
      actionLabel: "초안 확인"
    },
    {
      id: "image",
      title: "이미지 생성",
      description: "승인한 초안을 기준으로 이미지를 생성합니다.",
      href: draft ? `/detail-pages/${draft.id}/approval` : "/detail-pages",
      actionLabel: "이미지 생성"
    },
    {
      id: "download",
      title: "결과 다운로드",
      description: "컷별 이미지와 전체 결과를 저장합니다.",
      href: draft && job ? `/detail-pages/${draft.id}/review?jobId=${job.id}` : "/detail-pages",
      actionLabel: "결과 보기"
    }
  ];

  const firstIncompleteIndex = specs.findIndex((step) => !completeByStep[step.id]);

  return specs.map((step, index) => ({
    ...step,
    status:
      completeByStep[step.id] ? "complete" : firstIncompleteIndex === index ? "current" : "locked"
  }));
}

export function currentOnboardingStep(steps: OnboardingStep[]) {
  return steps.find((step) => step.status === "current") ?? steps[steps.length - 1];
}
