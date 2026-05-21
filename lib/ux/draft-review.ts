import { filterNoticesForCategory } from "@/lib/notice-categories";
import type { ApprovalMarkdownVersion, BrandProfile, Notice, ProductDraft } from "@/lib/types";
import type { GenerationReadiness } from "./generation-readiness";

export interface DraftCutCard {
  cutNumber: number;
  title: string;
  rawSection: string;
  purpose: string;
  headline: string;
  subcopy: string;
  imageText: string;
  visualDirection: string;
  memoryNote: string;
  confirmationNeeded: string[];
}

export interface DraftReviewSummary {
  product: {
    name: string;
    brandName: string;
    category: string;
    salesChannel: string;
    cutCount: number;
  };
  brandApplied: {
    logoStatus: "uploaded" | "missing";
    logoAssetId: string | null;
    pointColor: string;
    requiredPhrases: string[];
    forbiddenPhrases: string[];
    notices: Array<{ title: string; content: string; source: "product" | "brand" | "system"; sourceLabel: string }>;
  };
  markdown: {
    id: string;
    productDraftId: string;
    status: ApprovalMarkdownVersion["status"];
  };
  confirmationNeeded: string[];
  readiness: GenerationReadiness;
  cuts: DraftCutCard[];
}

function valueOrNeeded(value: string | null | undefined) {
  return value?.trim() || "확인 필요";
}

function splitLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fieldFromSection(section: string, labels: string[]) {
  for (const label of labels) {
    const match = section.match(new RegExp(`^- ${label}:\\s*(.+)$`, "m"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function parseCuts(markdown: string, fallbackDraft: ProductDraft): DraftCutCard[] {
  const matches = [...markdown.matchAll(/^### Cut\s+(\d+)\.\s*(.+)$/gm)];
  if (!matches.length) {
    return Array.from({ length: fallbackDraft.cutCount }, (_, index) => ({
      cutNumber: index + 1,
      title: `Cut ${String(index + 1).padStart(2, "0")}`,
      rawSection: "",
      purpose: "상품 이해를 돕는 상세페이지 컷입니다.",
      headline: fallbackDraft.productName,
      subcopy: valueOrNeeded(fallbackDraft.sellingPoints),
      imageText: "추가 확인 포인트",
      visualDirection: "상품 사진과 브랜드 컬러를 기준으로 구성",
      memoryNote: "",
      confirmationNeeded: ["인증, 리뷰, 판매량, 수치 정보는 증빙이 있을 때만 사용"]
    }));
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const next = matches[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(start, next).trim();
    const confirmation = fieldFromSection(section, ["확인 필요", "?뺤씤 ?꾩슂"]);
    return {
      cutNumber: Number(match[1]),
      title: match[2].trim(),
      rawSection: section,
      purpose: fieldFromSection(section, ["목적", "紐⑹쟻"]) || match[2].trim(),
      headline: fieldFromSection(section, ["헤드라인", "?ㅻ뱶?쇱씤"]) || fallbackDraft.productName,
      subcopy: fieldFromSection(section, ["서브카피", "?쒕툕移댄뵾"]) || valueOrNeeded(fallbackDraft.sellingPoints),
      imageText: fieldFromSection(section, ["이미지 삽입 문구"]) || "확인 필요",
      visualDirection:
        fieldFromSection(section, ["브랜드 적용", "이미지 방향", "釉뚮옖???곸슜"]) ||
        "상품 사진과 브랜드 컬러를 기준으로 구성",
      memoryNote: fieldFromSection(section, ["운영 메모리 반영"]),
      confirmationNeeded: confirmation ? [confirmation] : ["인증, 리뷰, 판매량, 수치 정보는 증빙이 있을 때만 사용"]
    };
  });
}

function parseCutsStable(markdown: string, fallbackDraft: ProductDraft): DraftCutCard[] {
  const matches = [...markdown.matchAll(/^### Cut\s+(\d+)\.\s*(.+)$/gm)];
  if (!matches.length) return parseCuts(markdown, fallbackDraft);

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const next = matches[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(start, next).trim();
    const confirmation = fieldFromSection(section, ["확인 필요"]);
    return {
      cutNumber: Number(match[1]),
      title: match[2].trim(),
      rawSection: section,
      purpose: fieldFromSection(section, ["목적"]) || match[2].trim(),
      headline: fieldFromSection(section, ["헤드라인"]) || fallbackDraft.productName,
      subcopy: fieldFromSection(section, ["서브카피"]) || valueOrNeeded(fallbackDraft.sellingPoints),
      imageText: fieldFromSection(section, ["이미지 삽입 문구"]) || "확인 필요",
      visualDirection:
        fieldFromSection(section, ["이미지 방향", "이미지 구성", "사진 배치 추천"]) ||
        "상품 사진과 브랜드 컬러를 기준으로 구성",
      memoryNote: fieldFromSection(section, ["운영 메모리 반영"]),
      confirmationNeeded: confirmation ? [confirmation] : ["인증, 리뷰, 판매량, 수치 정보는 증빙이 있을 때만 사용"]
    };
  });
}

function sameNoticeList(a: Notice[], b: Notice[]) {
  if (a.length !== b.length) return false;
  return a.every((notice, index) => {
    const other = b[index];
    return notice.title === other?.title && notice.content === other?.content;
  });
}

function uniqueNotices(notices: Notice[]) {
  const seen = new Set<string>();
  return notices.filter((notice) => {
    const key = `${notice.title}\n${notice.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceForValue(productValue: string | null, brandValue: string | null) {
  if (productValue && productValue !== brandValue) {
    return { source: "product" as const, sourceLabel: "상품 안내사항" };
  }
  if (brandValue) return { source: "brand" as const, sourceLabel: "브랜드 안내사항" };
  return { source: "system" as const, sourceLabel: "확인 필요" };
}

export function buildDraftReviewSummary(input: {
  draft: ProductDraft;
  brand: BrandProfile;
  markdown: ApprovalMarkdownVersion;
  readiness: GenerationReadiness;
}): DraftReviewSummary {
  const { draft, brand, markdown, readiness } = input;
  const brandCategoryNotices = filterNoticesForCategory(brand.customNotices, draft.category);
  const customNoticesAreBrand = draft.customNotices.length > 0 && sameNoticeList(draft.customNotices, brandCategoryNotices);
  const customNoticeSource = draft.customNotices.length && !customNoticesAreBrand ? "product" : "brand";
  const customNoticeSourceLabel = customNoticeSource === "product" ? "상품 안내사항" : "브랜드 안내사항";
  const customNotices = uniqueNotices([...brandCategoryNotices, ...draft.customNotices]);
  const shippingSource = sourceForValue(draft.shippingNotice, brand.shippingNotice);
  const returnSource = sourceForValue(draft.returnExchangeNotice, brand.returnExchangeNotice);

  const notices: DraftReviewSummary["brandApplied"]["notices"] = [
    {
      title: "배송 안내",
      content: valueOrNeeded(draft.shippingNotice || brand.shippingNotice),
      ...shippingSource
    },
    {
      title: "반품/교환 안내",
      content: valueOrNeeded(draft.returnExchangeNotice || brand.returnExchangeNotice),
      ...returnSource
    },
    ...customNotices.map((notice) => ({
      title: valueOrNeeded(notice.title),
      content: valueOrNeeded(notice.content),
      source: customNoticeSource as "product" | "brand",
      sourceLabel: customNoticeSourceLabel
    }))
  ];

  return {
    product: {
      name: draft.productName,
      brandName: brand.brandName,
      category: draft.category,
      salesChannel: valueOrNeeded(draft.salesChannel || brand.defaultSalesChannel),
      cutCount: draft.cutCount
    },
    brandApplied: {
      logoStatus: brand.logoAssetId ? "uploaded" : "missing",
      logoAssetId: brand.logoAssetId,
      pointColor: brand.pointColor,
      requiredPhrases: splitLines(draft.requiredPhrases || brand.requiredPhrases),
      forbiddenPhrases: splitLines(draft.forbiddenPhrases || brand.forbiddenPhrases),
      notices
    },
    markdown: {
      id: markdown.id,
      productDraftId: draft.id,
      status: markdown.status
    },
    confirmationNeeded: [
      "원산지, 용량, 구성, 소재/성분, 보관/사용 주의사항",
      "인증, 수상, 리뷰, 판매량, 수치 자료 증빙",
      ...(readiness.productionReady ? [] : readiness.warnings)
    ],
    readiness,
    cuts: parseCutsStable(markdown.content, draft)
  };
}
