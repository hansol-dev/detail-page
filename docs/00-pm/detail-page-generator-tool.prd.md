# Detail Page Generator Tool PRD

Feature: detail-page-generator-tool  
Phase: PM  
Created: 2026-05-19  
Skill source: `skills/ecommerce-detail-page`

## Executive Summary

| Perspective | Summary |
|---|---|
| Problem | 상품 사진과 간단한 요청만으로 상세페이지를 만들고 싶지만, 매번 컷 구성, 카피, 주의 문구, 이미지 제작 순서를 사람이 다시 정해야 한다. |
| Solution | 프로젝트 안에 상품별 사진 폴더를 두고, 요청을 받으면 먼저 승인용 상세페이지 MD 기획서를 생성한 뒤 승인 후 실제 상세페이지 이미지를 제작하는 로컬 도구를 만든다. |
| Function UX Effect | 사용자는 `올리브오일 상세 페이지 만들어줘`처럼 말하고, 도구는 사진 폴더를 찾고 MD 초안을 만든 다음 승인 여부를 기다린다. |
| Core Value | `ecommerce-detail-page` 스킬을 현재 상태 그대로 로컬에 복사해 시작하고, 실제 제작 과정에서 스킬과 템플릿을 계속 개선할 수 있는 반복 제작 체계를 만든다. |

## 1. Product Goal

이 도구의 목표는 상세페이지 제작을 “대화형 일회성 작업”이 아니라 “반복 가능한 폴더 기반 제작 파이프라인”으로 바꾸는 것이다.

첫 번째 성공 사례는 기존 `01_olive-oil` 폴더의 사진을 사용해 올리브오일 상세페이지 승인용 MD 파일을 먼저 생성하고, 사용자가 승인하면 컷 이미지와 리뷰용 HTML을 제작하는 흐름이다.

## 2. Target Users

| Segment | Needs | Priority |
|---|---|---|
| 상품 상세페이지를 자주 만드는 운영자 | 사진을 넣어두고 상품명만 말하면 기획안과 결과물이 정리되길 원함 | High |
| 상세페이지 카피/구성 초안을 빠르게 보고 싶은 판매자 | 이미지 제작 전 문구와 컷 순서를 먼저 검토하고 싶음 | High |
| 스킬을 직접 개선하며 제작 품질을 높이고 싶은 사용자 | 현재 스킬을 복사해 로컬에서 계속 수정하며 쓰길 원함 | High |

## 3. User Workflow

### 3.1 Recommended Folder Contract

사용자가 만들 폴더:

```text
products/
  olive-oil/
    photos/
      01-front.jpg
      02-detail.jpg
      03-package.jpg
    facts.md
```

현재 프로젝트에 이미 있는 상품 폴더도 입력으로 허용한다:

```text
01_olive-oil/
  01_detail.png
  01_thumbnail.jpg
```

도구가 생성할 산출물:

```text
outputs/
  olive-oil/
    plan/
      olive-oil.detail-page.md
    cuts/
      cut-01.png
      cut-02.png
    review/
      index.html
```

### 3.2 Command-Like User Flow

1. User: `올리브오일 상세 페이지 만들어줘`
2. Tool: `products/olive-oil`, `01_olive-oil` 등 후보 폴더를 찾는다.
3. Tool: 사진 목록과 부족한 상품 사실을 점검한다.
4. Tool: `skills/ecommerce-detail-page` 스킬 규칙을 적용해 승인용 MD를 생성한다.
5. Tool: 사용자에게 MD 경로와 핵심 요약을 보여주고 승인을 기다린다.
6. User: 승인 또는 수정 요청.
7. Tool: 승인 후 컷 이미지와 리뷰 HTML을 제작한다.

## 4. Product Requirements

| ID | Requirement | Priority |
|---|---|---|
| PRD-01 | `C:\Users\gyro\.codex\skills`의 스킬을 프로젝트 `skills/`로 원본 상태 그대로 복사한다. | Must |
| PRD-02 | 복사된 `skills/ecommerce-detail-page`를 상세페이지 기획/제작의 기준 스킬로 사용한다. | Must |
| PRD-03 | 상품명 기반으로 상품 폴더 후보를 자동 탐색한다. 예: `올리브오일` → `products/olive-oil`, `01_olive-oil`. | Must |
| PRD-04 | 이미지 제작 전에 승인용 MD 파일을 먼저 생성한다. | Must |
| PRD-05 | 승인 전에는 최종 상세페이지 이미지를 만들지 않는다. | Must |
| PRD-06 | MD에는 컷별 목적, 카피, 이미지 구성, ASCII 와이어프레임, 확인 필요 사실, 법적/플랫폼 리스크를 포함한다. | Must |
| PRD-07 | 승인 후에는 계획된 컷 수대로 이미지를 만들고 리뷰 HTML을 생성한다. | Should |
| PRD-08 | 제작 중 발견한 개선점은 로컬 스킬 또는 참조 문서에 반영할 수 있게 한다. | Should |

## 5. Non-Goals

- 처음부터 완전한 SaaS나 GUI를 만들지 않는다.
- 승인 없이 이미지 컷을 바로 생성하지 않는다.
- 제품 성분, 인증, 수상, 리뷰, 원산지, 효능 같은 검증되지 않은 사실을 임의로 만들지 않는다.
- 복사 원본인 `C:\Users\gyro\.codex\skills`를 직접 수정하지 않는다.

## 6. Input Rules

### 6.1 Product Photos

상품 폴더에는 최소 1장 이상의 이미지가 있어야 한다. 권장 구성은 다음과 같다.

| Photo Type | Purpose |
|---|---|
| front/package | 메인 히어로와 썸네일 기준 |
| contents/detail | 질감, 원물, 사용감 설명 |
| label/notice | 식품, 화장품, 건강기능식품 등 주의 문구 확인 |
| usage scene | 사용 상황 컷 구성 |
| shipping/package | 배송/구성품 안내 |

사진이 부족하면 MD에는 `확인 필요`로 표시하고, 결과물은 판매 확정본이 아니라 기획 초안으로 분류한다.

### 6.2 Product Facts

선택 파일:

```text
products/olive-oil/facts.md
```

권장 항목:

```markdown
# Product Facts

- Product name:
- Brand:
- Category:
- Volume/size:
- Origin:
- Ingredients:
- Key selling points:
- Cautions:
- Sales channel:
```

## 7. Approval Gate

MD 승인 게이트는 필수다.

| Step | Output | User Decision |
|---|---|---|
| Draft Plan | `outputs/{product}/plan/{product}.detail-page.md` | 승인 / 수정 요청 / 중단 |
| Production | `outputs/{product}/cuts/*.png`, `outputs/{product}/review/index.html` | 검수 / 재생성 요청 |

## 8. Success Criteria

| ID | Success Criteria |
|---|---|
| SC-01 | `skills/`에 원본 스킬이 복사되어 있고 로컬 작업본으로 사용할 수 있다. |
| SC-02 | 사용자에게 “어떤 폴더를 만들고 어디에 사진을 넣을지”를 명확히 안내할 수 있다. |
| SC-03 | `올리브오일 상세 페이지 만들어줘` 요청 시 이미지 제작 전 MD 초안이 먼저 생성된다. |
| SC-04 | 승인 전 최종 이미지 제작을 하지 않는 흐름이 문서와 도구 규칙에 반영된다. |
| SC-05 | 스킬을 현재 상태로 시작하되, 사용 중 개선사항을 로컬 스킬에 누적할 수 있다. |

## 9. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 사진이 부족하거나 품질이 낮음 | 실제 판매용 이미지 품질 저하 | MD에서 사진 상태를 표시하고 추가 촬영 또는 참조 기반 재생성 옵션을 제안 |
| 검증되지 않은 효능/인증 문구 생성 | 플랫폼 정책 또는 법적 리스크 | 스킬의 compliance 규칙을 적용하고 확인 필요 필드를 분리 |
| 스킬 업데이트가 원본과 섞임 | 재사용성 저하 | 원본은 복사만 하고 프로젝트 `skills/`를 살아있는 작업본으로 사용 |
| 승인 게이트 누락 | 원치 않는 결과물 생성 | 도구 요구사항에 승인 전 이미지 제작 금지를 명시 |

## 10. First Implementation Slice

1. `skills/`에 현재 스킬 복사.
2. `products/README.md`에 상품 폴더 규칙 작성.
3. `outputs/` 산출물 규칙 정의.
4. `01_olive-oil` 또는 `products/olive-oil`을 입력으로 사용해 승인용 MD 생성 흐름을 테스트.

## 11. Next PDCA Step

다음 단계는 `/pdca plan detail-page-generator-tool`이다.

Plan 단계에서는 다음 결정을 확정한다.

- CLI 스크립트로 만들지, Codex 작업 규약 문서와 템플릿 중심으로 시작할지
- 기존 `01_olive-oil` 폴더를 그대로 지원할지, `products/olive-oil`로 이관할지
- 승인용 MD 템플릿의 필수 섹션
- 첫 상품인 올리브오일의 실제 MD 생성 위치
