# Detail Page Web Tool UX Improvement PRD

Feature: detail-page-web-tool  
Phase: PM  
Created: 2026-05-20  
Context: post-MVP user-perspective review  

## Executive Summary

| Perspective | Summary |
|---|---|
| Problem | 현재 도구는 브랜드, 상품 입력, 승인용 MD, 이미지 생성까지 기능은 연결되어 있지만 비개발자에게는 `MD`, `승인`, `목업`, `Provider` 같은 내부 용어와 단계가 그대로 노출된다. 사용자는 “무엇을 넣으면 어느 정도 품질이 나오는지”, “다음에 뭘 눌러야 하는지”, “결과를 어디에 쓰면 되는지”를 계속 추론해야 한다. |
| Solution | 상세페이지 제작을 `브랜드 준비 -> 상품 입력 -> 초안 확인 -> 이미지 생성 -> 결과 사용`의 일반 사용자 언어로 재구성하고, 각 단계에 준비도, 품질 경고, 다음 액션, 미리보기, 수정 루프를 넣는다. MD는 고급 편집 영역으로 유지하되 기본 사용자에게는 컷별 요약/체크리스트 중심으로 보여준다. |
| Function UX Effect | 사용자는 브랜드와 상품 사진만 준비해도 첫 결과까지 안내받고, 부족한 정보는 “나중에 확인 가능” 또는 “최종 제작 전 필요”로 구분해서 볼 수 있다. 생성 후에는 컷별 수정뿐 아니라 전체 상세페이지로 검토하고 바로 다운로드/복사/재생성할 수 있다. |
| Core Value | `pdca` 기반 승인/통제 강점은 유지하면서, 일반 판매자가 디자이너나 개발자 없이도 실제 판매 채널에 올릴 수 있는 상세페이지 초안을 반복 생성하는 제품 경험으로 만든다. |

## 1. Product Discovery

### 1.1 Current Product Strengths

| Strength | Evidence |
|---|---|
| 브랜드 기본값 저장 | 사용자당 최대 5개 브랜드, 로고/컬러/톤/배송/반품 문구를 저장한다. |
| 필수/선택 표기 | 브랜드/상품 폼에 필수/선택 배지가 표시된다. |
| 승인 게이트 | 이미지 생성 전 승인용 MD를 확인하고 승인해야 한다. |
| 이미지 생성 흐름 | 승인 후 컷 수만큼 생성하고 리뷰 화면에서 컷별 수정 요청이 가능하다. |
| 안전한 문구 통제 | 인증, 리뷰, 수치, 효능 등 검증 필요 문구를 MD에 표시한다. |

### 1.2 Main User Friction

| Severity | Friction | Why It Hurts |
|---|---|---|
| Critical | 첫 사용자가 시작 순서를 알기 어렵다. | 대시보드는 숫자와 최근 초안 중심이라 “1. 브랜드 만들기 2. 상품 만들기 3. 승인 4. 이미지 생성”이 제품 안에서 충분히 강제되지 않는다. |
| Critical | 상품 입력 폼이 긴데 품질 영향도가 구분되지 않는다. | 비개발자는 모든 선택값을 채워야 하는지 헷갈린다. “필수”, “권장”, “나중에 확인”의 차이가 필요하다. |
| Critical | `승인용 MD`가 일반 사용자에게 어렵다. | MD 원문 편집기는 강력하지만, 상세페이지 검토 경험이라기보다 개발/기획 문서 편집처럼 보인다. |
| Important | 이미지 생성 결과가 판매용인지 목업인지 판단이 어렵다. | `개발용 SVG 목업`, `Provider` 같은 표현은 내부 개발 상태를 보여주지만 사용자가 다음 행동을 결정하기 어렵다. |
| Important | 생성 후 최종 산출물 사용 경로가 없다. | 컷별 리뷰는 있지만 전체 상세페이지 보기, 다운로드, ZIP export, 판매 채널 업로드 준비가 없다. |
| Important | 브랜드 기본값이 실제 상품 입력에 어떻게 적용됐는지 보이지 않는다. | 사용자는 배송/반품/필수문구가 자동 반영됐는지 MD를 읽어야 확인할 수 있다. |
| Important | 실패/대기/생성 중 상태의 회복 액션이 약하다. | 오래 걸리거나 실패하면 원인과 해결책보다 상태 텍스트 중심으로 보인다. |
| Moderate | 브랜드 수정 UI가 `details` 안에 숨어 있다. | 기능은 있지만 발견성이 낮고, 로고 미리보기/컬러 미리보기가 약하다. |
| Moderate | 메모리 화면이 너무 추상적이다. | “상세페이지를 만들 때 계속 참고할 운영 메모리”가 어떤 내용을 쓰면 좋은지 예시가 없다. |

## 2. Opportunity Solution Tree

| Outcome | Opportunity | Solution Direction |
|---|---|---|
| 첫 결과 생성률 상승 | 사용자가 어디서 시작할지 모름 | 온보딩 체크리스트와 빈 상태 CTA를 단계형으로 변경 |
| 입력 완료율 상승 | 어떤 정보가 품질에 중요한지 모름 | 필드를 `필수 / 품질 권장 / 있으면 좋음 / 최종 확인 필요`로 재분류 |
| 승인 이탈 감소 | MD 원문 검토가 부담스러움 | 기본 검토 화면은 컷 카드, 문구, 확인 필요 항목으로 표시하고 MD 원문은 고급 편집으로 이동 |
| 결과 신뢰도 상승 | AI 이미지가 상품과 다를 수 있다는 불안 | 참조 이미지 사용 여부, 로고 반영 여부, 확인 필요 문구를 컷별 QA로 명확히 표시 |
| 반복 사용 증가 | 결과를 바로 쓸 수 없음 | 전체 미리보기, 다운로드, 재생성, 판매 채널별 export 제공 |

## 3. Target Personas

| Persona | Job To Be Done | Current Pain | Success Moment |
|---|---|---|---|
| 1인 쇼핑몰 운영자 | 새 상품을 빠르게 올릴 수 있는 상세페이지 초안이 필요하다. | 사진과 상품명은 있지만 상세페이지 구조/문구를 어떻게 만들지 모른다. | 사진 업로드 후 10분 안에 검토 가능한 상세페이지 컷 세트를 얻는다. |
| 브랜드 여러 개 운영자 | 브랜드별 톤/배송/반품 문구를 반복 적용하고 싶다. | 매번 같은 문구를 복사하고 브랜드별 색/로고가 섞일까 걱정한다. | 브랜드 선택만으로 기본값이 자동 반영된 것을 눈으로 확인한다. |
| 운영 대행자 | 여러 상품을 빠르게 초안화하고 클라이언트 승인 자료를 만들어야 한다. | 수정 요청이 컷별로 흩어지고 최종본 구분이 어렵다. | 승인 대기, 수정 요청, 완료 상태를 한 화면에서 관리한다. |

## 4. Competitive Context

| Product | Observed Positioning | Relevant Learning |
|---|---|---|
| Pebblely | 한 장의 상품 사진에서 여러 마케팅 이미지를 만드는 쉬운 3단계 흐름과 템플릿/컬러 선택을 강조한다. | 첫 경험은 `상품 추가 -> 이미지 생성 -> 결과 보기`처럼 단순해야 한다. 또한 상품 사진의 텍스트 추출/수정 흐름은 라벨 보존 신뢰도에 중요하다. |
| Photoroom | 배경 제거, AI 배경, batch edit, web app 등 빠른 상품 이미지 편집을 강조한다. | 초보자에게는 원문 문서보다 사진 편집/결과 중심 UI가 이해하기 쉽다. |
| Mujo Design Editor | 일반 디자인 도구가 아니라 ecommerce PDP/gallery용 구조화된 템플릿, 레이어 편집, 마켓플레이스 compliance를 강조한다. | 우리 도구의 차별점은 단순 이미지가 아니라 상세페이지 컷 세트와 compliance/승인 흐름이라는 점이다. 이를 UI에서 더 전면화해야 한다. |

Sources:

- Pebblely How It Works: https://pebblely.com/how-to/
- Pebblely product page: https://www.pebblely.com/
- Photoroom Help Center: https://help.photoroom.com/en/articles/9626719-what-is-photoroom
- Mujo Design Editor: https://mujoai.com/product/design-editor

## 5. Product Requirements

### 5.1 Must Improve

| ID | Requirement | User Value |
|---|---|---|
| UX-01 | Dashboard must show a clear first-run checklist: 브랜드 등록, 상품 입력, 초안 확인, 이미지 생성, 결과 다운로드. | 처음 쓰는 사람이 다음 행동을 바로 안다. |
| UX-02 | New Detail Page form must separate fields into progressive sections: 기본 정보, 사진, 판매 포인트, 고급/안내사항. | 긴 폼 부담이 줄고 필수값부터 입력할 수 있다. |
| UX-03 | Field labels must distinguish `필수`, `권장`, `선택`, `최종 확인 필요`. | 선택값을 안 넣어도 되는지 판단할 수 있다. |
| UX-04 | Approval page must provide a non-MD review mode with product summary, applied brand defaults, confirmation-needed list, and cut cards. | 일반 사용자가 MD 문법을 몰라도 승인할 수 있다. |
| UX-05 | Raw MD editor must move behind `고급 편집` or secondary tab. | 초보 사용자에게 문서 편집 부담을 주지 않는다. |
| UX-06 | Image generation status must show progress, estimated wait copy, and safe recovery actions. | 무한 로딩/멈춤으로 오해하지 않는다. |
| UX-07 | Review page must provide full-page preview and export/download actions. | 결과물을 판매 채널에 옮길 수 있다. |
| UX-08 | Dev/mock generation must be reframed as `테스트 이미지` with a clear production readiness warning. | 사용자가 실제 판매용 결과인지 오해하지 않는다. |

### 5.2 Should Improve

| ID | Requirement | User Value |
|---|---|---|
| UX-09 | Brand page should show logo preview, color swatches, and default notice preview. | 저장된 기본값을 눈으로 확인한다. |
| UX-10 | Product creation should preview inherited brand values before submission. | 자동 적용될 값을 사전에 확인한다. |
| UX-11 | Review page should allow cut-level approve/reject and batch regenerate selected cuts. | 반복 수정 시간이 줄어든다. |
| UX-12 | Results list should support status filters: 작성 중, 승인 대기, 생성 완료, 수정 요청. | 여러 상품을 운영할 때 관리가 쉬워진다. |
| UX-13 | Memory page should provide editable examples: 브랜드 말투, 금지 표현, 자주 쓰는 안내문. | 메모리에 무엇을 써야 하는지 알 수 있다. |

## 6. Proposed User Flow

```text
First visit
  -> Checklist: 브랜드 등록부터 시작
  -> Brand setup with preview
  -> Create detail page
      -> Required basics first
      -> Optional quality boosters next
      -> Brand defaults preview
  -> Generate draft
  -> Review draft as readable cut cards
      -> 확인 필요 항목 resolve or approve as draft
      -> Advanced MD edit only if needed
  -> Generate images
      -> progress + readiness warning
  -> Review full page and individual cuts
      -> export, selected cut regenerate, revision log
```

## 7. Success Metrics

| Metric | Target |
|---|---|
| First-run activation | 신규 사용자가 첫 방문에서 브랜드 1개와 상품 초안 1개를 생성한다. |
| Draft approval rate | 생성된 승인 초안 중 70% 이상이 MD 원문 편집 없이 승인 단계까지 간다. |
| Image generation completion | 승인된 초안 중 90% 이상이 리뷰 화면까지 도달한다. |
| Revision clarity | 수정 요청의 80% 이상이 컷 단위로 기록된다. |
| Production readiness | 상품 사진 없음/테스트 이미지/확인 필요 claims가 결과 화면에서 명확히 구분된다. |

## 8. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MD를 숨기면 고급 사용자의 통제력이 줄어듦 | 기존 강점 약화 | 기본은 카드형 검토, 고급 탭에서 원문 MD 편집을 유지 |
| 입력 단계를 나누면 구현량 증가 | MVP 수정 범위 확대 | 우선 섹션 접기/펼치기와 준비도 배지만 추가하고 wizard는 후순위 |
| 테스트 이미지와 실제 AI 이미지 구분이 복잡함 | 사용자 오해 | Provider 대신 `테스트 이미지 / AI 생성 이미지` 라벨과 판매 사용 가능 여부를 표시 |
| export 범위가 커짐 | 작업 지연 | 1차는 이미지 개별 다운로드와 전체 미리보기, 2차에서 ZIP/채널별 규격 추가 |

## 9. Priority Roadmap

### P0 — Confusion Killers

1. Dashboard first-run checklist and empty-state routing.
2. Approval page card-based review mode.
3. Image generation status/readiness labels.
4. Replace internal labels: `MD`, `Provider`, `dev-svg-provider` with user-facing terms.

### P1 — Conversion Improvers

1. Progressive product form sections.
2. Brand defaults preview on product form.
3. Results page status filters.
4. Full-page result preview.

### P2 — Power User Workflow

1. Batch cut regeneration.
2. Export/download package.
3. Memory examples and presets.
4. Marketplace-specific templates.

## 10. Next PDCA Step

Recommended next command:

```text
$pdca plan detail-page-web-tool-ux-improvements
```

Plan 단계에서는 P0 범위를 먼저 확정한다. 전체 SaaS 아키텍처를 다시 바꾸기보다, 현재 구현 위에 사용자 혼란을 줄이는 UX 레이어를 얹는 것이 가장 빠른 개선 방향이다.
