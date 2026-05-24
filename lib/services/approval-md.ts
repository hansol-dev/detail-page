import "server-only";
import { createId, readDb, timestamp, updateDb } from "../store";
import { getBrand } from "./brands";
import { getProductDraft } from "./product-drafts";
import { readMdWorkspaceFile } from "./md-workspace";
import { filterNoticesForCategory } from "../notice-categories";
import type { ApprovalMarkdownVersion, BrandProfile, Notice, ProductDraft } from "../types";

type CutTemplate = {
  title: string;
  purpose: string;
  headline: string;
  subcopy: string;
  imageText: string;
  visual: string;
  noticeDetails?: string;
};

type DetailPagePlanCut = {
  cutNumber: number;
  title: string;
  purpose: string;
  headline: string;
  subcopy: string;
  imageText: string[];
  imageComposition: string;
  photoPlacement: string;
  asciiLayout: string;
  productFacts: string[];
  sourcePhotos: string[];
  designNotes: string;
  finalImageQa: string;
  confirmationNeeded: string[];
  noticeSourceText: string[];
};

type DetailPagePlanJson = {
  productName: string;
  category: string;
  salesChannel: string;
  styleTemplate: string;
  strategySummary: string;
  assumptions: string[];
  confirmationNeeded: string[];
  complianceNotes: string[];
  cuts: DetailPagePlanCut[];
};

function valueOrNeeded(value: string | null | undefined) {
  return value?.trim() || "확인 필요";
}

function compact(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function firstSentence(value: string | null | undefined, fallback: string) {
  return compact(value, fallback).split(/[.!?\n]/)[0]?.trim() || fallback;
}

function memoryHighlights(memoryContent: string) {
  const lines = memoryContent
    .split(/\r?\n/)
    .map((line) => line.replace(/^(?:[-*]\s*|#+\s*)/, "").trim())
    .filter((line) => line && !line.endsWith(":"))
    .filter((line) => !["운영 메모리", "자주 쓰는 안내", "브랜드 운영 원칙", "생성할 때 주의할 점"].includes(line));

  return lines.slice(0, 8);
}

function memorySummary(memoryContent: string) {
  const highlights = memoryHighlights(memoryContent);
  return highlights.length ? highlights.join(" / ") : "별도 운영 메모리 없음";
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

function customNoticesForDraft(brand: BrandProfile, draft: ProductDraft) {
  return uniqueNotices([...filterNoticesForCategory(brand.customNotices, draft.category), ...draft.customNotices]);
}

function noticeMarkdownLine(title: string, content: string | null | undefined) {
  const body = content?.trim();
  if (!body) return [];
  const lines = body.split(/\r?\n/);
  if (lines.length === 1) return [`- ${title}: ${body}`];
  return [`- ${title}:`, ...lines.map((line) => `  ${line}`)];
}

function productNoticesToMarkdown(brand: BrandProfile, draft: ProductDraft) {
  const custom = customNoticesForDraft(brand, draft);
  const lines = [
    ...(brand.shippingNotice ? noticeMarkdownLine("배송 안내", brand.shippingNotice) : []),
    ...(brand.returnExchangeNotice ? noticeMarkdownLine("반품/교환 안내", brand.returnExchangeNotice) : []),
    ...(draft.shippingNotice && draft.shippingNotice !== brand.shippingNotice
      ? noticeMarkdownLine("상품별 배송 안내", draft.shippingNotice)
      : []),
    ...(draft.returnExchangeNotice && draft.returnExchangeNotice !== brand.returnExchangeNotice
      ? noticeMarkdownLine("상품별 반품/교환 안내", draft.returnExchangeNotice)
      : []),
    ...custom.flatMap((notice) => noticeMarkdownLine(valueOrNeeded(notice.title), notice.content))
  ];
  return lines.join("\n");
}

function noticeLinesForPlan(brand: BrandProfile, draft: ProductDraft) {
  const markdown = productNoticesToMarkdown(brand, draft);
  if (!markdown.trim()) return [];
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildCutTemplates(draft: ProductDraft, brand: BrandProfile, memoryText: string): CutTemplate[] {
  const product = draft.productName;
  const sellingPoint = firstSentence(draft.sellingPoints, `${product}의 핵심 장점을 한눈에 보여주기`);
  const fact = firstSentence(draft.facts, "확인 가능한 상품 정보 중심으로 정리");
  const target = firstSentence(draft.targetCustomer, "구매를 고민하는 고객");
  const notice = "배송, 반품/교환, 고객센터 안내를 구매 전 확인해 주세요.";
  const noticeDetails = productNoticesToMarkdown(brand, draft);
  const tone = compact(brand.defaultTone, "담백하고 신뢰감 있는 톤");
  const memory = memorySummary(memoryText);

  return [
    {
      title: "Hero",
      purpose: "첫 화면에서 상품명과 핵심 인상을 명확하게 전달",
      headline: product,
      subcopy: sellingPoint,
      imageText: sellingPoint,
      visual: "상품 대표 사진을 크게 배치하고 포인트 컬러로 브랜드 첫인상을 강조"
    },
    {
      title: "Problem",
      purpose: "구매 전 고객이 망설이는 지점을 짚어 공감 형성",
      headline: `${target}에게 필요한 선택 기준`,
      subcopy: `${product}을 고를 때 확인해야 할 포인트를 정리합니다.`,
      imageText: "구매 전 확인해야 할 기준",
      visual: "고객 고민을 짧은 문장 카드 2-3개로 나누고 상품 이미지는 보조로 배치"
    },
    {
      title: "Solution",
      purpose: "상품이 제공하는 해결 방향과 핵심 장점을 설득",
      headline: `${product}의 핵심 포인트`,
      subcopy: sellingPoint,
      imageText: "핵심 장점 한눈에 보기",
      visual: "상품 사진 주변에 장점 키워드를 배치하고 과장된 수치 표현은 배제"
    },
    {
      title: "Detail",
      purpose: "용량, 구성, 소재, 원산지처럼 확인 가능한 정보를 정리",
      headline: "구매 전에 확인할 상세 정보",
      subcopy: fact,
      imageText: "상세 정보 체크",
      visual: "표 또는 아이콘형 정보 블록으로 스펙을 읽기 쉽게 구성"
    },
    {
      title: "Usage",
      purpose: "사용 장면이나 추천 상황을 보여 구매 후 모습을 상상하게 함",
      headline: "이런 상황에 잘 어울립니다",
      subcopy: `${target} 기준으로 활용 장면을 제안합니다.`,
      imageText: "추천 사용 장면",
      visual: "생활 장면 또는 사용 맥락 이미지를 중심으로 부드럽게 구성"
    },
    {
      title: "Notice",
      purpose: "배송, 교환, 주의사항을 구매 전 마지막 확인 정보로 제공",
      headline: "주문 전 안내사항",
      subcopy: notice,
      imageText: "배송/교환 안내 확인",
      visual: "가독성 높은 안내 박스와 체크 리스트 형태로 정리",
      noticeDetails
    },
    {
      title: "Target",
      purpose: "주요 고객과 구매 동기를 구체화",
      headline: `${target}을 위한 선택`,
      subcopy: `${product}이 필요한 이유를 고객 상황 중심으로 설명합니다.`,
      imageText: "이런 분께 추천",
      visual: "타깃 상황을 2-3개 카드로 구분하고 상품 이미지를 함께 노출"
    },
    {
      title: "Compare",
      purpose: "비교 가능한 차별점을 정리",
      headline: "비교할 때 봐야 할 차이",
      subcopy: "증빙 가능한 기준만 사용해 선택 포인트를 보여줍니다.",
      imageText: "선택 기준 비교",
      visual: "비교표 또는 좌우 카드 구조로 구성하되 경쟁사 직접 비방은 제외"
    },
    {
      title: "Options",
      purpose: "구성, 옵션, 용량 정보를 정리",
      headline: "구성과 옵션 확인",
      subcopy: fact,
      imageText: "구성품 체크",
      visual: "옵션/구성 이미지를 나열하고 각 항목을 짧은 라벨로 설명"
    },
    {
      title: "FAQ",
      purpose: "구매 전 자주 묻는 질문을 줄여 이탈 방지",
      headline: "자주 묻는 질문",
      subcopy: "구매 전 확인이 필요한 내용을 짧게 정리합니다.",
      imageText: "FAQ",
      visual: "질문/답변 아코디언 느낌의 카드형 레이아웃"
    },
    {
      title: "Final Check",
      purpose: "구매 직전 핵심 체크포인트를 다시 정리",
      headline: "마지막 체크포인트",
      subcopy: `${product} 구매 전 핵심 정보를 다시 확인하세요.`,
      imageText: "구매 전 최종 확인",
      visual: "체크리스트와 CTA 느낌의 마무리 레이아웃"
    },
    {
      title: "Brand Trust",
      purpose: "브랜드 기준과 운영 톤을 통해 신뢰 형성",
      headline: `${brand.brandName} 기준으로 준비했습니다`,
      subcopy: `${tone} / ${memory}`,
      imageText: "브랜드 기준 적용",
      visual: "브랜드 컬러와 로고를 절제해서 사용하고 과한 장식은 피함"
    }
  ];
}

function fallbackPlanJson(draft: ProductDraft, brand: BrandProfile, memoryText: string): DetailPagePlanJson {
  const count = Math.max(1, Math.min(15, Number(draft.cutCount || 6)));
  const templates = buildCutTemplates(draft, brand, memoryText);
  const notices = noticeLinesForPlan(brand, draft);
  const facts = valueOrNeeded(draft.facts)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    productName: draft.productName,
    category: draft.category,
    salesChannel: valueOrNeeded(draft.salesChannel || brand.defaultSalesChannel),
    styleTemplate: (draft.salesChannel || brand.defaultSalesChannel || "").includes("스마트스토어")
      ? "B. 네이버 브랜드 스토리형"
      : "A. 실용 정보형",
    strategySummary: `${draft.productName}의 핵심 구매 이유를 먼저 보여주고, 확인 가능한 상품 정보와 안내사항으로 구매 불안을 줄입니다.`,
    assumptions: [
      "입력되지 않은 정보는 확인 필요로 표시합니다.",
      "상품 사진과 사실 정보가 부족하면 결과물은 판매 확정본이 아니라 컨셉 초안입니다."
    ],
    confirmationNeeded: [
      "원산지, 용량, 구성, 소재/성분, 보관/사용 주의사항",
      "인증, 수상, 리뷰, 판매량, 수치 자료 증빙"
    ],
    complianceNotes: [
      "증빙 없는 기능, 인증, 판매량, 순위, 리뷰, 의학적 표현은 사용하지 않습니다.",
      "제공된 사실 정보와 브랜드 안내사항은 임의로 요약하거나 변경하지 않습니다."
    ],
    cuts: Array.from({ length: count }, (_, index) => {
      const item = templates[index] ?? {
        title: `Extra ${index + 1}`,
        purpose: "상품 이해를 돕는 추가 정보를 제공",
        headline: `${draft.productName} 추가 정보`,
        subcopy: "구매 판단에 필요한 정보를 보완합니다.",
        imageText: "추가 확인 포인트",
        visual: "상품 사진과 정보 카드를 균형 있게 구성"
      };
      const isNoticeCut = item.title === "Notice";
      return {
        cutNumber: index + 1,
        title: item.title,
        purpose: item.purpose,
        headline: item.headline,
        subcopy: item.subcopy,
        imageText: [item.imageText],
        imageComposition: item.visual,
        photoPlacement: isNoticeCut ? "상품 사진보다 안내 정보 카드와 아이콘 중심으로 구성" : "제공된 상품 사진을 중심 비주얼로 사용",
        asciiLayout: isNoticeCut
          ? "[상단: 주문 전 안내사항]\n[중앙: 배송 안내 카드]\n[하단: 반품/교환 안내 카드]"
          : "[상단: 헤드라인]\n[중앙: 상품 이미지]\n[하단: 핵심 문구/정보 카드]",
        productFacts: facts,
        sourcePhotos: draft.photoAssetIds.length ? ["업로드된 상품 사진 참조"] : ["상품 사진 없음"],
        designNotes: `${brand.brandName} 포인트 컬러 ${brand.pointColor}를 과하지 않게 사용합니다.`,
        finalImageQa: "한국어 문구가 모바일에서 읽히고, 제공되지 않은 인증/리뷰/수치 주장을 만들지 않습니다.",
        confirmationNeeded: ["인증, 리뷰, 판매량, 수치 정보는 증빙이 있을 때만 사용"],
        noticeSourceText: isNoticeCut ? notices : []
      };
    })
  };
}

function normalizePlanJson(plan: DetailPagePlanJson, draft: ProductDraft, brand: BrandProfile, memoryText: string): DetailPagePlanJson {
  const fallback = fallbackPlanJson(draft, brand, memoryText);
  const count = Math.max(1, Math.min(15, Number(draft.cutCount || 6)));
  const noticeIndex = Math.min(5, count - 1);
  const noticeText = noticeLinesForPlan(brand, draft);
  const hasNoticeText = noticeText.length > 0;
  const noticePattern = /Notice|안내사항|고객센터|배송|반품|교환|택배|톡톡|운영시간|점심시간|휴무일|한진택배|수령일/i;
  const nonNoticeValue = (value: string, fallbackValue: string) =>
    !value?.trim() || noticePattern.test(value) ? fallbackValue : value;
  const nonNoticeArray = (value: string[], fallbackValue: string[]) =>
    value.length && !value.some((item) => noticePattern.test(item)) ? value : fallbackValue;
  const seenCopy = new Set<string>();
  const copyKey = (value: string) => value.replace(/\s+/g, " ").trim();
  const uniqueCopy = (value: string, fallbackValue: string) => {
    const candidate = copyKey(value);
    if (!candidate) return fallbackValue;
    if (seenCopy.has(candidate)) return fallbackValue;
    seenCopy.add(candidate);
    return value;
  };
  const uniqueCopyArray = (value: string[], fallbackValue: string[]) => {
    const result: string[] = [];
    for (const item of value) {
      const key = copyKey(item);
      if (!key || seenCopy.has(key)) continue;
      seenCopy.add(key);
      result.push(item);
    }
    return result.length ? result : fallbackValue;
  };

  const cuts = Array.from({ length: count }, (_, index) => {
    const source = plan.cuts?.find((cut) => Number(cut.cutNumber) === index + 1) ?? plan.cuts?.[index] ?? fallback.cuts[index];
    const isNoticeCut = hasNoticeText && index === noticeIndex;
    const baseFallback =
      !hasNoticeText && index === noticeIndex
        ? {
            ...fallback.cuts[index],
            title: "Final Check",
            purpose: "구매 전 상품의 핵심 정보를 마지막으로 정리",
            headline: `${draft.productName} 구매 전 최종 확인`,
            subcopy: "상품 사진과 확인 가능한 정보 기준으로 핵심 포인트를 다시 정리합니다.",
            imageText: ["최종 확인", "핵심 포인트"],
            imageComposition: "상품 대표 이미지와 핵심 체크포인트를 CTA 느낌으로 구성",
            photoPlacement: "상품 사진을 중심에 두고 핵심 포인트를 주변 카드로 배치",
            asciiLayout: "[상단: 최종 확인 헤드라인]\n[중앙: 상품 이미지]\n[하단: 핵심 포인트 카드]",
            designNotes: "이전 컷과 중복되지 않게 마무리 요약 역할만 수행합니다.",
            finalImageQa: "중복 카피 없이 마지막 구매 확인 메시지로 보이는지 확인합니다.",
            noticeSourceText: []
          }
        : fallback.cuts[index];
    return {
      ...baseFallback,
      ...source,
      cutNumber: index + 1,
      productFacts:
        Array.isArray(source.productFacts) && source.productFacts.length ? source.productFacts : baseFallback.productFacts,
      sourcePhotos:
        Array.isArray(source.sourcePhotos) && source.sourcePhotos.length ? source.sourcePhotos : baseFallback.sourcePhotos,
      confirmationNeeded:
        Array.isArray(source.confirmationNeeded) && source.confirmationNeeded.length
          ? source.confirmationNeeded
          : baseFallback.confirmationNeeded,
      noticeSourceText: isNoticeCut ? noticeText : [],
      title: isNoticeCut ? "Notice" : nonNoticeValue(source.title, baseFallback.title),
      purpose:
        isNoticeCut
          ? "사용자가 입력한 고객센터, 배송 안내, 반품/교환 안내만 한 컷에 모아 구매 전 확인 정보로 제공"
          : nonNoticeValue(source.purpose, baseFallback.purpose),
      headline: isNoticeCut
        ? "주문 전 안내사항"
        : uniqueCopy(nonNoticeValue(source.headline, baseFallback.headline), baseFallback.headline),
      subcopy:
        isNoticeCut
          ? "아래 안내는 사용자가 입력한 원문 기준으로만 표시됩니다."
          : uniqueCopy(nonNoticeValue(source.subcopy, baseFallback.subcopy), baseFallback.subcopy),
      imageText:
        isNoticeCut
          ? noticeText.length
            ? ["입력된 안내사항 확인"]
            : ["입력된 안내사항 없음"]
          : uniqueCopyArray(nonNoticeArray(source.imageText ?? [], baseFallback.imageText), baseFallback.imageText),
      imageComposition:
        isNoticeCut
          ? "사용자가 입력한 안내 항목만 정보 카드로 구성하고, 입력되지 않은 고객센터/배송/반품/교환 정보는 새로 만들지 않음"
          : nonNoticeValue(source.imageComposition, baseFallback.imageComposition),
      photoPlacement:
        isNoticeCut
          ? "상품 사진은 사용하지 않거나 아주 작게만 사용하고, 안내 정보와 아이콘 중심으로 구성"
          : nonNoticeValue(source.photoPlacement, baseFallback.photoPlacement),
      asciiLayout:
        isNoticeCut
          ? "[상단: 주문 전 안내사항]\n[중앙: 입력된 안내사항 원문 카드]\n[하단: 입력되지 않은 안내는 표시하지 않음]"
          : nonNoticeValue(source.asciiLayout, baseFallback.asciiLayout),
      designNotes:
        isNoticeCut
          ? "고객센터/배송/반품·교환 정보는 두 컷으로 나누지 않고 이 한 컷 안에서만 다루며, 사용자가 입력하지 않은 항목은 생성하지 않습니다."
          : nonNoticeValue(source.designNotes, baseFallback.designNotes),
      finalImageQa:
        isNoticeCut
          ? "사용자가 입력한 안내 원문만 들어갔는지, 입력되지 않은 고객센터/배송/반품·교환 정보가 새로 만들어지지 않았는지 확인합니다."
          : nonNoticeValue(source.finalImageQa, baseFallback.finalImageQa)
    };
  });

  return {
    ...fallback,
    ...plan,
    productName: draft.productName,
    category: draft.category,
    salesChannel: valueOrNeeded(draft.salesChannel || brand.defaultSalesChannel),
    cuts
  };
}

function planPromptInput(draft: ProductDraft, brand: BrandProfile, memoryText: string) {
  return {
    product: {
      name: draft.productName,
      category: draft.category,
      salesChannel: draft.salesChannel || brand.defaultSalesChannel || "채널 무관 모바일 상세페이지",
      targetCustomer: draft.targetCustomer || "확인 필요",
      sellingPoints: draft.sellingPoints || "확인 필요",
      facts: draft.facts || "확인 필요",
      requestedCutCount: draft.cutCount,
      uploadedProductPhotoCount: draft.photoAssetIds.length,
      thumbnailRequested: draft.thumbnailRequested
    },
    brand: {
      name: brand.brandName,
      pointColor: brand.pointColor,
      subColor: brand.subColor,
      tone: brand.defaultTone || "담백하고 신뢰감 있는 톤",
      brandCopy: draft.requiredPhrases || brand.requiredPhrases || "",
      forbiddenPhrases: draft.forbiddenPhrases || brand.forbiddenPhrases || "",
      shippingNotice: brand.shippingNotice || "",
      returnExchangeNotice: brand.returnExchangeNotice || "",
      customNotices: customNoticesForDraft(brand, draft)
    },
    productSpecificNotices: {
      shippingNotice: draft.shippingNotice || "",
      returnExchangeNotice: draft.returnExchangeNotice || "",
      customNotices: draft.customNotices
    },
    operatingMemory: memoryHighlights(memoryText)
  };
}

function planJsonSchema() {
  const stringArray = { type: "array", items: { type: "string" } };
  return {
    name: "ecommerce_detail_page_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "productName",
        "category",
        "salesChannel",
        "styleTemplate",
        "strategySummary",
        "assumptions",
        "confirmationNeeded",
        "complianceNotes",
        "cuts"
      ],
      properties: {
        productName: { type: "string" },
        category: { type: "string" },
        salesChannel: { type: "string" },
        styleTemplate: { type: "string" },
        strategySummary: { type: "string" },
        assumptions: stringArray,
        confirmationNeeded: stringArray,
        complianceNotes: stringArray,
        cuts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "cutNumber",
              "title",
              "purpose",
              "headline",
              "subcopy",
              "imageText",
              "imageComposition",
              "photoPlacement",
              "asciiLayout",
              "productFacts",
              "sourcePhotos",
              "designNotes",
              "finalImageQa",
              "confirmationNeeded",
              "noticeSourceText"
            ],
            properties: {
              cutNumber: { type: "number" },
              title: { type: "string" },
              purpose: { type: "string" },
              headline: { type: "string" },
              subcopy: { type: "string" },
              imageText: stringArray,
              imageComposition: { type: "string" },
              photoPlacement: { type: "string" },
              asciiLayout: { type: "string" },
              productFacts: stringArray,
              sourcePhotos: stringArray,
              designNotes: { type: "string" },
              finalImageQa: { type: "string" },
              confirmationNeeded: stringArray,
              noticeSourceText: stringArray
            }
          }
        }
      }
    }
  };
}

async function generatePlanJsonWithAi(draft: ProductDraft, brand: BrandProfile, memoryText: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
  const timeoutMs = Math.max(1000, Number(process.env.OPENAI_TEXT_TIMEOUT_MS || 4500) || 4500);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: {
        type: "json_schema",
        json_schema: planJsonSchema()
      },
      messages: [
        {
          role: "system",
          content: [
            "You are an ecommerce detail-page planning engine following the local ecommerce-detail-page skill.",
            "Create a production-ready Korean mobile ecommerce detail-page plan before image generation.",
            "Return JSON only.",
            "Plan cut-by-cut Korean sales copy, image composition, photo placement, ASCII wireframe, compliance notes, and confirmation-needed items.",
            "Do not write final image-generation prompts.",
            "Use only provided facts. Never invent certifications, rankings, review counts, ingredients, prices, origins, awards, medical claims, or quantified claims.",
            "Do not use 확인 필요 as a headline or subcopy unless the product name itself is missing.",
            "Headlines and subcopy should still be useful Korean sales copy based on safe inputs such as product name, category, sales channel, target context, brand tone, and visible product photos.",
            "Use 확인 필요 only inside productFacts, confirmationNeeded, or specific factual fields that require verification, such as origin, ingredients, certifications, review evidence, sales numbers, exact composition, or quantified claims.",
            "When sellingPoints are missing, infer a cautious non-factual angle from the product name/category, and mark missing evidence separately in confirmationNeeded.",
            "If uploaded product photos exist, treat them as the product appearance source of truth and assign photo placement per cut.",
            "Recommend and apply a detail-page style template. For Naver Smart Store or brand story, prefer 네이버 브랜드 스토리형 unless product facts require 실용 정보형.",
            "The cuts array length must exactly match requestedCutCount.",
            "All customer-center, shipping, return, and exchange information must be consolidated into one notice cut only. Use Cut 06 when requestedCutCount is 6 or more; use the final cut when requestedCutCount is less than 6.",
            "Do not create a separate customer-center cut and a separate shipping/return cut.",
            "For every non-notice cut, noticeSourceText must be an empty array and the visible copy must not mention customer-center, shipping, return, or exchange policy.",
            "The single notice cut may contain customer-center 안내, 배송 안내, and 반품/교환 안내 only if those exact details are present in the user-provided brand or product notices.",
            "Never invent, infer, complete, or add customer-center phone numbers, operating hours, delivery carrier, delivery period, shipping fee, return period, exchange rules, return cost, or contact channel.",
            "If a notice item is not user-provided or verified, leave it out of noticeSourceText entirely. Do not write 확인 필요 as visible policy copy.",
            "The full set of cuts becomes one detail page, so each cut must have a distinct role and distinct visible copy.",
            "Brand copy is not a required phrase for every cut. Use brandCopy sparingly only where it naturally improves the cut, such as hero, final trust, or a brand-context cut.",
            "Do not repeat brandCopy across all cuts. Overusing brand copy creates resistance; avoid using it in more than 1-2 cuts unless the user explicitly asks.",
            "Avoid repeating the same headline, subcopy, imageText, brand slogan, product benefit, or notice concept across cuts. Use repeated brand phrases only when explicitly required by the approved product/brand inputs.",
            "Keep copy mobile-first: short Korean headline, concrete subcopy, concise imageText labels.",
            "For any noticeSourceText, preserve the user's original notice lines exactly without omission, summary, paraphrase, merge, or order change."
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify(planPromptInput(draft, brand, memoryText), null, 2)
        }
      ]
    })
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content) as DetailPagePlanJson;
}

function replaceNeededCopy(value: string, fallback: string) {
  const normalized = value?.trim();
  return !normalized || normalized === "확인 필요" ? fallback : normalized;
}

function markdownList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- 확인 필요";
}

function cutMarkdownFromPlan(plan: DetailPagePlanJson, brand: BrandProfile) {
  return plan.cuts
    .map((cut) => {
      const headline = replaceNeededCopy(cut.headline, `${plan.productName} 상세 정보`);
      const subcopy = replaceNeededCopy(cut.subcopy, `${plan.category} 상품을 구매 전 확인하기 쉽게 정리했습니다.`);
      const noticeLines = cut.noticeSourceText.length
        ? ["- 안내사항 원문:", ...cut.noticeSourceText.map((line) => `  ${line}`)]
        : [];
      return [
        `### Cut ${String(cut.cutNumber).padStart(2, "0")}. ${cut.title}`,
        "",
        `- 목적: ${cut.purpose}`,
        `- 헤드라인: ${headline}`,
        `- 서브카피: ${subcopy}`,
        `- 이미지 삽입 문구: ${cut.imageText.join(" / ")}`,
        `- 이미지 구성: ${cut.imageComposition}`,
        `- 이미지 방향: ${cut.imageComposition}`,
        `- 사진 배치 추천: ${cut.photoPlacement}`,
        "- ASCII 레이아웃:",
        ...cut.asciiLayout.split(/\r?\n/).map((line) => `  ${line}`),
        `- 상품 사실 정보: ${cut.productFacts.join(" / ") || "확인 필요"}`,
        `- 사용 사진: ${cut.sourcePhotos.join(" / ") || "확인 필요"}`,
        `- 디자인 메모: ${cut.designNotes}`,
        `- 최종 이미지 QA: ${cut.finalImageQa}`,
        `- 브랜드 적용: ${brand.brandName}, 포인트 컬러 ${brand.pointColor}`,
        ...noticeLines,
        `- 확인 필요: ${cut.confirmationNeeded.join(" / ") || "없음"}`,
        ""
      ].join("\n");
    })
    .join("\n");
}

function cutMarkdownForPlanCut(plan: DetailPagePlanJson, brand: BrandProfile, cut: DetailPagePlanCut) {
  return cutMarkdownFromPlan({ ...plan, cuts: [cut] }, brand).trim();
}

function replaceCutSectionContent(content: string, cutNumber: number, nextSection: string) {
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

function updateEmbeddedPlanJson(content: string, cut: DetailPagePlanCut) {
  const match = content.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  if (!match?.[1] || match.index === undefined) return content;

  try {
    const parsed = JSON.parse(match[1]) as DetailPagePlanJson;
    if (!Array.isArray(parsed.cuts)) return content;
    parsed.cuts = parsed.cuts.map((item) => (Number(item.cutNumber) === cut.cutNumber ? cut : item));
    const nextBlock = `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
    return `${content.slice(0, match.index)}${nextBlock}${content.slice(match.index + match[0].length)}`;
  } catch {
    return content;
  }
}

function contentWithRegeneratedCut(content: string, plan: DetailPagePlanJson, brand: BrandProfile, cutNumber: number) {
  const cut = plan.cuts.find((item) => Number(item.cutNumber) === cutNumber);
  if (!cut) throw new Error("다시 만들 컷 초안을 찾을 수 없습니다.");
  const sectionUpdated = replaceCutSectionContent(content, cutNumber, cutMarkdownForPlanCut(plan, brand, cut));
  return updateEmbeddedPlanJson(sectionUpdated, cut);
}

export async function generateApprovalMarkdown(userId: string, productDraftId: string) {
  const draft = await getProductDraft(userId, productDraftId);
  if (!draft) throw new Error("상품 초안을 찾을 수 없습니다.");
  const brand = await getBrand(userId, draft.brandProfileId);
  if (!brand) throw new Error("브랜드를 찾을 수 없습니다.");
  const memory = await readMdWorkspaceFile(userId);
  const memoryLines = memoryHighlights(memory.content);
  const aiPlan = await generatePlanJsonWithAi(draft, brand, memory.content).catch(() => null);
  const plan = normalizePlanJson(aiPlan ?? fallbackPlanJson(draft, brand, memory.content), draft, brand, memory.content);

  const content = [
    `# ${draft.productName} 상세페이지 초안`,
    "",
    "Status: Draft",
    `Product draft: \`${draft.id}\``,
    `Brand: ${brand.brandName}`,
    `actualPlannedCuts: ${plan.cuts.length}`,
    `Planning source: ${aiPlan ? "AI JSON plan based on ecommerce-detail-page skill" : "Fallback template plan"}`,
    "",
    "## 1. 상품 요약",
    "",
    "| 항목 | 내용 |",
    "|---|---|",
    `| 상품명 | ${draft.productName} |`,
    `| 브랜드 | ${brand.brandName} |`,
    `| 카테고리 | ${draft.category} |`,
    `| 판매 채널 | ${valueOrNeeded(draft.salesChannel || brand.defaultSalesChannel)} |`,
    `| 포인트 컬러 | ${brand.pointColor} |`,
    `| 보조 컬러 | ${valueOrNeeded(brand.subColor)} |`,
    `| 컷 수 | ${plan.cuts.length} |`,
    `| 스타일 | ${plan.styleTemplate} |`,
    "",
    "## 2. 브랜드 기본값",
    "",
    `- 기본 톤: ${valueOrNeeded(brand.defaultTone)}`,
    `- 브랜드 카피: ${valueOrNeeded(draft.requiredPhrases || brand.requiredPhrases)}`,
    `- 금지 문구: ${valueOrNeeded(draft.forbiddenPhrases || brand.forbiddenPhrases)}`,
    "",
    "## 3. 사실 정보",
    "",
    valueOrNeeded(draft.facts),
    "",
    "## 4. 가정",
    "",
    markdownList(plan.assumptions),
    "",
    "## 5. 최종 확인 필요",
    "",
    markdownList(plan.confirmationNeeded),
    "",
    "## 6. 주요 고객",
    "",
    valueOrNeeded(draft.targetCustomer),
    "",
    "## 7. 상품별/선택 안내사항",
    "",
    productNoticesToMarkdown(brand, draft),
    "",
    "## 8. 운영 메모리 반영",
    "",
    ...(memoryLines.length ? memoryLines.map((line) => `- ${line}`) : ["- 별도 운영 메모리 없음"]),
    "",
    "## 9. 상세페이지 기획 JSON",
    "",
    "```json",
    JSON.stringify(plan, null, 2),
    "```",
    "",
    "## 10. 컷 구성",
    "",
    cutMarkdownFromPlan(plan, brand),
    "## 11. 표현 가이드",
    "",
    markdownList(plan.complianceNotes),
    "",
    "## 12. 승인",
    "",
    "A. 승인 - 이 초안 기준으로 이미지 생성",
    "B. 수정 - 컷별 초안을 수정하고 다시 검토",
    "C. 중단 - 이미지 생성하지 않음",
    ""
  ].join("\n");

  return updateDb<ApprovalMarkdownVersion>((db) => {
    for (const md of db.approvalMarkdownVersions) {
      if (md.productDraftId === productDraftId && md.status === "draft") {
        md.status = "superseded";
      }
    }

    const version = db.approvalMarkdownVersions.filter((md) => md.productDraftId === productDraftId).length + 1;
    const ts = timestamp();
    const md: ApprovalMarkdownVersion = {
      id: createId("md"),
      productDraftId,
      version,
      content,
      status: "draft",
      generatedFrom: { draft, brand, plan, planningSource: aiPlan ? "ai-json" : "fallback-template" },
      createdBy: userId,
      createdAt: ts,
      approvedAt: null
    };
    db.approvalMarkdownVersions.push(md);
    const target = db.productDrafts.find((item) => item.id === productDraftId);
    if (target) {
      target.status = "md_ready";
      target.updatedAt = ts;
    }
    return md;
  });
}

export async function regenerateApprovalCutMarkdown(userId: string, markdownId: string, cutNumber: number) {
  const existing = await getApprovalMarkdown(userId, markdownId);
  if (!existing) throw new Error("초안을 찾을 수 없습니다.");
  if (existing.status === "superseded") throw new Error("이전 버전 초안은 다시 만들 수 없습니다.");

  const draft = await getProductDraft(userId, existing.productDraftId);
  if (!draft) throw new Error("상품 초안을 찾을 수 없습니다.");
  const brand = await getBrand(userId, draft.brandProfileId);
  if (!brand) throw new Error("브랜드를 찾을 수 없습니다.");

  const memory = await readMdWorkspaceFile(userId);
  const aiPlan = await generatePlanJsonWithAi(draft, brand, memory.content).catch(() => null);
  const plan = normalizePlanJson(aiPlan ?? fallbackPlanJson(draft, brand, memory.content), draft, brand, memory.content);
  const nextContent = contentWithRegeneratedCut(existing.content, plan, brand, cutNumber);
  const ts = timestamp();

  return updateDb<ApprovalMarkdownVersion>((db) => {
    const current = db.approvalMarkdownVersions.find((item) => item.id === markdownId);
    if (!current) throw new Error("초안을 찾을 수 없습니다.");

    if (current.status === "approved") {
      for (const md of db.approvalMarkdownVersions) {
        if (md.productDraftId === current.productDraftId && md.status === "draft") {
          md.status = "superseded";
        }
      }

      const version = db.approvalMarkdownVersions.filter((md) => md.productDraftId === current.productDraftId).length + 1;
      const nextMd: ApprovalMarkdownVersion = {
        id: createId("md"),
        productDraftId: current.productDraftId,
        version,
        content: nextContent,
        status: "draft",
        generatedFrom: {
          ...(typeof current.generatedFrom === "object" && current.generatedFrom ? current.generatedFrom : {}),
          regeneratedCutNumber: cutNumber,
          regeneratedFromMarkdownId: current.id,
          plan,
          planningSource: aiPlan ? "ai-json-cut-regeneration" : "fallback-template-cut-regeneration"
        },
        createdBy: userId,
        createdAt: ts,
        approvedAt: null
      };
      db.approvalMarkdownVersions.push(nextMd);
      const targetDraft = db.productDrafts.find((item) => item.id === current.productDraftId);
      if (targetDraft) {
        targetDraft.status = "md_ready";
        targetDraft.updatedAt = ts;
      }
      return nextMd;
    }

    current.content = nextContent;
    current.generatedFrom = {
      ...(typeof current.generatedFrom === "object" && current.generatedFrom ? current.generatedFrom : {}),
      regeneratedCutNumber: cutNumber,
      plan,
      planningSource: aiPlan ? "ai-json-cut-regeneration" : "fallback-template-cut-regeneration"
    };
    const targetDraft = db.productDrafts.find((item) => item.id === current.productDraftId);
    if (targetDraft) {
      targetDraft.status = "md_ready";
      targetDraft.updatedAt = ts;
    }
    return current;
  });
}

export async function getLatestApprovalMarkdown(userId: string, productDraftId: string) {
  const draft = await getProductDraft(userId, productDraftId);
  if (!draft) return null;
  const db = await readDb();
  return (
    db.approvalMarkdownVersions
      .filter((md) => md.productDraftId === productDraftId)
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export async function getApprovalMarkdown(userId: string, markdownId: string) {
  const db = await readDb();
  const md = db.approvalMarkdownVersions.find((item) => item.id === markdownId);
  if (!md) return null;
  const draft = db.productDrafts.find((item) => item.id === md.productDraftId && item.userId === userId);
  return draft ? md : null;
}

export async function saveApprovalMarkdown(userId: string, markdownId: string, content: string) {
  const existing = await getApprovalMarkdown(userId, markdownId);
  if (!existing) throw new Error("MD를 찾을 수 없습니다.");
  if (existing.status === "approved") throw new Error("승인된 MD는 직접 수정할 수 없습니다.");

  return updateDb<ApprovalMarkdownVersion>((db) => {
    const md = db.approvalMarkdownVersions.find((item) => item.id === markdownId);
    if (!md) throw new Error("MD를 찾을 수 없습니다.");
    md.content = content;
    return md;
  });
}

export async function approveMarkdown(userId: string, markdownId: string) {
  const existing = await getApprovalMarkdown(userId, markdownId);
  if (!existing) throw new Error("MD를 찾을 수 없습니다.");

  return updateDb<ApprovalMarkdownVersion>((db) => {
    const md = db.approvalMarkdownVersions.find((item) => item.id === markdownId);
    if (!md) throw new Error("MD를 찾을 수 없습니다.");
    for (const other of db.approvalMarkdownVersions) {
      if (other.productDraftId === md.productDraftId && other.id !== md.id && other.status === "approved") {
        other.status = "superseded";
      }
    }
    md.status = "approved";
    md.approvedAt = timestamp();
    const draft = db.productDrafts.find((item) => item.id === md.productDraftId);
    if (draft) draft.status = "approved";
    return md;
  });
}
