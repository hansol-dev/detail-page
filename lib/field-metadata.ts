import type { FieldMeta } from "./types";

export const brandFieldMeta: FieldMeta[] = [
  {
    name: "brandName",
    label: "브랜드명",
    required: true,
    importance: "required",
    source: "brand",
    helpText: "상세페이지에 표시할 브랜드 이름"
  },
  {
    name: "logo",
    label: "로고",
    required: false,
    importance: "recommended",
    source: "brand",
    helpText: "없으면 텍스트 브랜드명으로 대체"
  },
  {
    name: "pointColor",
    label: "포인트 컬러",
    required: true,
    importance: "required",
    source: "brand",
    helpText: "상세페이지의 주요 강조색"
  },
  {
    name: "subColor",
    label: "보조 컬러",
    required: false,
    importance: "optional",
    source: "brand",
    helpText: "없으면 포인트 컬러 기반으로 사용"
  },
  {
    name: "defaultTone",
    label: "기본 톤",
    required: false,
    importance: "recommended",
    source: "brand",
    helpText: "예: 브랜드 스토리형, 문제 해결형, 프리미엄 감성형"
  },
  {
    name: "defaultSalesChannel",
    label: "기본 판매 채널",
    required: false,
    importance: "optional",
    source: "brand",
    helpText: "채널별 구성 기준"
  },
  {
    name: "shippingNotice",
    label: "배송 안내",
    required: false,
    importance: "recommended",
    source: "brand",
    helpText: "브랜드 공통 배송 문구"
  },
  {
    name: "returnExchangeNotice",
    label: "반품/교환 안내",
    required: false,
    importance: "recommended",
    source: "brand",
    helpText: "브랜드 공통 반품/교환 문구"
  }
];

export const productFieldMeta: FieldMeta[] = [
  {
    name: "productName",
    label: "상품명",
    required: true,
    importance: "required",
    source: "product",
    helpText: "상세페이지 초안과 이미지 헤드라인의 기준"
  },
  {
    name: "brandProfileId",
    label: "브랜드 선택",
    required: true,
    importance: "required",
    source: "product",
    helpText: "브랜드 기본값을 자동 적용"
  },
  {
    name: "category",
    label: "카테고리",
    required: true,
    importance: "required",
    source: "product",
    helpText: "고시 정보와 주의사항 판단 기준"
  },
  {
    name: "photos",
    label: "상품 사진",
    required: false,
    importance: "recommended",
    source: "product",
    helpText: "초안은 선택, 최종 제작에는 권장"
  },
  {
    name: "sellingPoints",
    label: "핵심 판매 포인트",
    required: false,
    importance: "recommended",
    source: "product",
    helpText: "없으면 확인 필요 항목으로 표시"
  },
  {
    name: "facts",
    label: "상품 스펙/사실 정보",
    required: false,
    importance: "confirmation",
    source: "product",
    helpText: "검증된 정보만 사용"
  },
  {
    name: "targetCustomer",
    label: "주요 고객",
    required: false,
    importance: "optional",
    source: "product",
    helpText: "없으면 추천 고객을 가정으로 표시"
  },
  {
    name: "cutCount",
    label: "컷 수",
    required: false,
    importance: "optional",
    source: "product",
    helpText: "3컷, 6컷, 12컷, 15컷 중 선택"
  },
  {
    name: "salesChannel",
    label: "판매 채널",
    required: false,
    importance: "optional",
    source: "product",
    helpText: "없으면 브랜드 기본값 사용"
  },
  {
    name: "shippingNotice",
    label: "상품별 배송 안내",
    required: false,
    importance: "optional",
    source: "product",
    helpText: "브랜드 기본값보다 우선 적용"
  },
  {
    name: "returnExchangeNotice",
    label: "상품별 반품/교환 안내",
    required: false,
    importance: "optional",
    source: "product",
    helpText: "브랜드 기본값보다 우선 적용"
  }
];
