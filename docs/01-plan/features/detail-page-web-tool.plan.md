# Detail Page Web Tool Plan

Feature: detail-page-web-tool  
Phase: Plan  
Created: 2026-05-19  
Primary Workflow: `pdca plan`  
Related Skill: `skills/ecommerce-detail-page`

## Executive Summary

| Perspective | Summary |
|---|---|
| Problem | 현재 상세페이지 제작 흐름은 터미널 명령과 파일 구조를 알아야 해서 개발을 모르는 일반 사용자가 접근하기 어렵다. 입력값의 필수/선택 여부도 명확하지 않아 어떤 정보를 준비해야 하는지 판단하기 어렵다. |
| Solution | SaaS 구조를 전제로 한 웹 도구를 만들고, MVP에서는 운영자가 사용자를 직접 추가할 수 있게 한다. 사용자는 브랜드 기본값을 저장하고 상품별 입력값을 넣어 승인용 MD, 상세페이지 이미지, 리뷰 화면까지 한 흐름으로 생성한다. |
| Function UX Effect | 사용자는 브랜드를 선택하면 로고, 포인트 컬러, 기본 안내문구가 자동 적용되고, 필수 입력만 채워도 상세페이지 초안을 만들 수 있다. MD 파일은 필요한 작업 문서만 웹에서 열고 수정할 수 있다. |
| Core Value | `pdca`와 `ecommerce-detail-page`의 기획-승인-생성 규칙을 비개발자용 제품 UX로 감싸 반복 가능한 상세페이지 제작 시스템으로 만든다. |

## Context Anchor

| Anchor | Detail |
|---|---|
| WHY | 터미널 기반 상세페이지 제작 자동화를 일반 사용자가 쓸 수 있는 웹 제품으로 전환한다. |
| WHO | 상세페이지를 자주 만들어야 하는 운영자, 판매자, 여러 브랜드를 운영하는 소규모 사업자. |
| RISK | SaaS 범위를 크게 잡으면 MVP가 늦어지고, 브랜드/상품/MD/이미지 생성 책임이 섞이면 데이터 구조가 빠르게 복잡해진다. |
| SUCCESS | 사용자가 브랜드 기본값을 저장한 뒤 상품 필수값만 입력해 승인용 MD와 이미지 생성 결과를 한 번에 만들 수 있다. |
| SCOPE | MVP는 운영자 수동 사용자 추가, 사용자별 최대 5개 브랜드, 입력 필수/선택 표기, 필요한 MD만 로드, 승인용 MD부터 이미지 생성까지 포함한다. |

## 1. Goal

`detail-page-web-tool`의 목표는 기존 터미널 중심 상세페이지 제작 흐름을 SaaS형 웹 도구로 바꾸는 것이다. 사용자는 개발 지식 없이 브랜드 기본값을 저장하고, 상품별 정보를 입력하고, 승인용 Markdown을 확인/수정한 뒤, 상세페이지 이미지 생성까지 진행할 수 있어야 한다.

이번 Plan은 실제 구현 전 요구사항과 MVP 범위를 확정하는 문서다. 이전에 만들어진 로컬 프로토타입은 확정 구현이 아니며, 본 Plan과 이후 Design 문서 기준으로 유지, 수정, 삭제를 결정한다.

## 2. Product Scope

### 2.1 MVP Scope

| Area | Included |
|---|---|
| SaaS foundation | 사용자 계정과 사용자별 데이터 분리를 전제로 설계한다. MVP에서는 운영자가 사용자를 직접 추가할 수 있으면 충분하다. |
| Brand profiles | 사용자 1명당 브랜드를 최대 5개까지 등록할 수 있다. |
| User defaults | 사용자/브랜드별 기본값을 저장하고 새 상세페이지 생성 시 자동 적용한다. |
| Detail-page input | 상품별 입력 폼에서 필수/선택 값을 명확하게 표기한다. |
| Approval MD | 입력값 기반 승인용 상세페이지 MD를 생성하고 웹에서 열람/수정할 수 있다. |
| Image generation | 승인된 MD 기준으로 상세페이지 이미지를 생성하고 결과 리뷰 화면까지 제공한다. |
| MD editor | 작업에 필요한 MD만 목록화하고 편집한다. `skills/` 관련 MD는 기본 로드 대상에서 제외한다. |

### 2.2 Non-Goals

- 공개 회원가입, 셀프 온보딩, 이메일 인증은 MVP 필수가 아니다.
- 결제, 요금제, 팀 권한, 조직 관리 기능은 MVP에서 제외한다.
- 모든 기존 터미널 PDCA 기능을 웹으로 옮기지 않는다.
- `skills/` 원본 문서를 일반 사용자가 웹에서 직접 편집하지 않는다.
- 검증되지 않은 인증, 효능, 판매량, 순위, 리뷰, 수치 claims를 자동 생성하지 않는다.

## 3. User Model

### 3.1 User

MVP의 사용자는 운영자가 직접 추가한다. 사용자는 자신에게 속한 브랜드, 상품 초안, 승인용 MD, 생성 결과만 볼 수 있어야 한다.

| Field | Required | Notes |
|---|---:|---|
| userId | Yes | 내부 식별자 |
| email or loginId | Yes | MVP에서는 운영자 수동 등록 가능 |
| displayName | Yes | 화면 표시명 |
| status | Yes | active, disabled |
| createdAt | Yes | 감사/운영 기록 |

### 3.2 Brand Profile

사용자 1명당 최대 5개 브랜드를 등록할 수 있다.

| Field | Required | Notes |
|---|---:|---|
| brandName | Yes | 상세페이지에 표시되는 브랜드명 |
| logo | Optional | 이미지 파일 또는 URL |
| pointColor | Yes | 기본 강조색 |
| subColor | Optional | 보조 색상 |
| defaultTone | Optional | 예: 실용 정보형, 브랜드 스토리형 |
| defaultSalesChannel | Optional | 스마트스토어, 쿠팡, 자사몰 등 |
| requiredPhrases | Optional | 브랜드마다 반드시 넣을 문구 |
| forbiddenPhrases | Optional | 브랜드마다 피해야 할 문구 |
| shippingNotice | Optional | 배송 관련 안내사항 |
| returnExchangeNotice | Optional | 반품/교환 관련 안내사항 |
| customNotices | Optional | 제목+내용 형식의 선택 안내사항 목록 |

`customNotices`는 여러 개를 허용하되, MVP에서는 과도한 복잡도를 피하기 위해 브랜드당 최대 개수를 Design 단계에서 정한다.

## 4. Detail Page Creation Flow

```text
운영자 사용자 추가
  -> 사용자가 브랜드 기본값 등록 또는 선택
  -> 상품 상세페이지 생성 시작
  -> 필수/선택 표시가 있는 입력 폼 작성
  -> 브랜드 기본값 자동 적용
  -> 승인용 MD 생성
  -> 웹에서 MD 검토/수정
  -> 승인
  -> 상세페이지 이미지 생성
  -> 리뷰 화면에서 컷별 결과 확인
  -> 필요한 경우 MD 또는 결과 수정 요청
```

이미지 생성은 승인용 MD를 source of truth로 사용한다. 사용자가 컷 수, 문구, 구성 변경을 요청하면 이미지 생성 전에는 MD를 다시 갱신하고, 이미지 생성 후에는 결과 수정 요청으로 기록한다.

## 5. Input Field Rules

모든 입력 필드는 `required` 또는 `optional`을 명확히 가진다. UI는 라벨 옆에 필수/선택 배지를 표시한다.

### 5.1 Brand-level Defaults

| Field | Required | Default Behavior |
|---|---:|---|
| 브랜드명 | Yes | 브랜드 프로필 생성 시 필수 |
| 로고 | Optional | 없으면 텍스트 브랜드명으로 대체 |
| 포인트 컬러 | Yes | 기본값을 제공하되 사용자가 변경 가능 |
| 보조 컬러 | Optional | 없으면 포인트 컬러 기반으로 UI에서 보조색 계산 가능 |
| 기본 상세페이지 톤 | Optional | 없으면 실용 정보형 추천 |
| 기본 판매 채널 | Optional | 없으면 채널 무관 모바일 상세페이지 |
| 금지 문구 | Optional | 전역 기본 금지 문구와 합쳐서 사용 |
| 반드시 넣을 문구 | Optional | 상품별 문구보다 낮은 우선순위 |
| 배송 안내사항 | Optional | 상품별 입력이 있으면 상품별 값 우선 |
| 반품/교환 안내사항 | Optional | 상품별 입력이 있으면 상품별 값 우선 |
| 선택 안내사항 | Optional | 제목+내용 목록으로 마지막 안내 컷 등에 사용 |

### 5.2 Product-level Inputs

| Field | Required | Notes |
|---|---:|---|
| 상품명 | Yes | 승인용 MD와 이미지 헤드라인의 기본값 |
| 브랜드 선택 | Yes | 최대 5개 브랜드 중 하나 선택 |
| 카테고리 | Yes | compliance 체크와 컷 구성에 필요 |
| 상품 사진 | Optional for draft, Yes for production-quality output | 사진이 없으면 콘셉트 초안으로 표시 |
| 핵심 판매 포인트 | Optional | 없으면 확인 필요로 표시 |
| 용량/구성/스펙 | Optional | 검증된 정보만 사용 |
| 원산지/성분/소재 | Category-dependent | 식품, 화장품, 건강 관련 제품은 중요도 상승 |
| 주요 고객 | Optional | 없으면 추천 고객을 assumption으로 표시 |
| 컷 수 | Optional | 기본값 6 또는 브랜드/카테고리 기준 추천 |
| 판매 채널 | Optional | 브랜드 기본값 적용 가능 |
| 배송 안내사항 | Optional | 브랜드 기본값 상속 가능 |
| 반품/교환 안내사항 | Optional | 브랜드 기본값 상속 가능 |
| 선택 안내사항 | Optional | 제목+내용 목록 |

## 6. MD Loading and Editing Rules

웹의 MD 편집기는 사용자 작업에 필요한 파일만 로드한다.

### 6.1 Include

| Path | Purpose |
|---|---|
| `docs/00-pm/` | PRD/기획 참고 문서 |
| `docs/01-plan/features/` | Plan 문서 |
| `docs/02-design/features/` | Design 문서 |
| `docs/03-analysis/` | 분석 문서 |
| `docs/04-report/` | 완료 보고서 |
| DB `ApprovalMarkdownVersion` | 상품별 승인용 MD |
| DB `ProductDraft` | 상품별 사실 정보 |
| 사용자 메모리 MD | 사용자별 운영 메모 |

### 6.2 Exclude

| Path | Reason |
|---|---|
| `skills/` | 스킬 원본/작업 규칙은 일반 사용자 편집 대상이 아니다. |
| `.agents/`, `.codex/` | 시스템/개인 도구 설정 영역이다. |
| `node_modules/`, `.git/` | 작업 문서가 아니다. |
| `server/`, `app/` | 소스 코드는 MD 편집기의 대상이 아니다. |
| `templates/` | 원본 템플릿은 별도 관리 대상이다. |

Design 단계에서는 MD 목록 API가 include allowlist 방식으로 동작하도록 설계한다. 단순 전체 탐색 후 제외 방식은 MVP에서는 피한다.

## 7. Approval MD Requirements

승인용 MD는 이미지 생성 전 반드시 만들어져야 하며, 다음 정보를 포함한다.

| Section | Purpose |
|---|---|
| Product Summary | 상품명, 브랜드, 카테고리, 채널, 컷 수 |
| Brand Defaults Applied | 로고, 포인트 컬러, 기본 톤, 안내문 적용 내역 |
| Facts | 확인된 상품 정보 |
| Assumptions | 추정한 정보 |
| Confirmation Needed | 최종 확인이 필요한 정보 |
| Photo Analysis | 사진 사용 가능성, 컷별 배치 추천 |
| Target Customer | 주요 고객과 구매 동기 |
| Style Template | 상세페이지 톤앤매너 |
| Cut Plan | 컷별 목적, 문구, 구성 |
| Notices | 배송, 반품/교환, 선택 안내사항 |
| Compliance Notes | 과장/인증/효능/리뷰/수치 관련 주의 |
| Approval Gate | 승인, 수정, 중단 선택 |

## 8. Image Generation Requirements

이미지 생성은 이번 feature 범위에 포함한다.

| Requirement | Detail |
|---|---|
| Source of truth | 승인된 MD를 기준으로 이미지 생성 |
| Cut count | 승인된 MD의 컷 수와 동일한 이미지 수 생성 |
| Brand application | 로고, 포인트 컬러, 기본 톤 반영 |
| Notices | 배송/반품/교환/선택 안내사항을 적절한 컷에 반영 |
| Compliance | 검증되지 않은 claims는 이미지에 넣지 않음 |
| Result review | 컷별 결과를 웹에서 확인 |
| Revision | 이미지 생성 후 수정 요청은 결과 수정 요청으로 기록 |

이미지 생성 도구/모델 연동 방식은 Design 단계에서 결정한다. MVP에서는 비동기 작업 상태가 필요할 가능성이 높다.

## 9. Data Ownership and Isolation

SaaS 구조를 전제로 하므로 모든 핵심 데이터는 사용자 소유권을 가져야 한다.

| Entity | Owner |
|---|---|
| BrandProfile | User |
| ProductDraft | User |
| ApprovalMarkdown | User/ProductDraft |
| GeneratedImageSet | User/ProductDraft |
| UserMemoryMarkdown | User |

MVP에서 운영자가 사용자를 직접 추가하더라도, 데이터 모델은 나중에 셀프 회원가입으로 확장 가능한 구조여야 한다.

## 10. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | 운영자는 MVP에서 사용자를 직접 추가할 수 있다. | Must |
| FR-02 | 사용자는 최대 5개 브랜드 프로필을 등록할 수 있다. | Must |
| FR-03 | 브랜드 프로필에는 로고, 포인트 컬러, 보조 컬러, 기본 톤, 기본 판매 채널, 필수/금지 문구, 배송 안내, 반품/교환 안내, 선택 안내사항을 저장할 수 있다. | Must |
| FR-04 | 상세페이지 생성 폼은 모든 입력값에 필수/선택 여부를 표시한다. | Must |
| FR-05 | 새 상세페이지 생성 시 선택한 브랜드 기본값이 자동 적용된다. | Must |
| FR-06 | 상품 입력값과 브랜드 기본값을 합쳐 승인용 MD를 생성한다. | Must |
| FR-07 | 사용자는 승인용 MD를 웹에서 보고 수정할 수 있다. | Must |
| FR-08 | MD 목록은 필요한 작업 문서만 로드하고 `skills/` 관련 MD는 제외한다. | Must |
| FR-09 | 사용자가 승인하면 승인용 MD 기준으로 상세페이지 이미지를 생성한다. | Must |
| FR-10 | 생성된 이미지는 컷별로 웹에서 리뷰할 수 있다. | Must |
| FR-11 | 이미지 생성 후 수정 요청을 컷별로 기록할 수 있다. | Should |
| FR-12 | 상품 사진이 부족하면 결과물이 생산 확정본이 아니라 초안임을 표시한다. | Must |

## 11. Success Criteria

| ID | Criteria |
|---|---|
| SC-01 | 사용자는 브랜드 기본값을 저장하고, 새 상품 생성 시 해당 기본값이 자동 적용되는 것을 확인할 수 있다. |
| SC-02 | 사용자 1명당 브랜드는 최대 5개 제한이 적용된다. |
| SC-03 | 상세페이지 입력 폼의 모든 필드가 필수/선택으로 구분되어 보인다. |
| SC-04 | 승인용 MD에는 브랜드 기본값, 상품 입력값, 확인 필요 항목, 컷 플랜, 배송/반품/선택 안내사항이 포함된다. |
| SC-05 | MD 편집기는 `skills/` 문서를 로드하지 않고, 허용된 작업 문서만 표시한다. |
| SC-06 | 승인 후 이미지 생성이 시작되고, 승인된 컷 수와 같은 수의 결과가 생성된다. |
| SC-07 | 생성 결과는 웹 리뷰 화면에서 컷별로 확인할 수 있다. |

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SaaS 범위가 커져 MVP가 늦어짐 | 핵심 생성 경험 검증 지연 | MVP는 운영자 수동 사용자 추가로 제한하고 회원가입/결제는 제외 |
| 브랜드 기본값과 상품별 입력값 우선순위 혼란 | 잘못된 문구나 안내사항 적용 | 상품별 입력값 > 브랜드 기본값 > 시스템 기본값 순서로 명시 |
| MD 편집기가 불필요한 시스템 문서까지 노출 | 사용자가 스킬/템플릿을 잘못 수정 | include allowlist 방식으로 필요한 문서만 로드 |
| 이미지 생성이 오래 걸림 | 사용자가 멈춘 것으로 오해 | 비동기 작업 상태와 컷별 진행률 표시 |
| 검증되지 않은 claims 생성 | 정책/법적 리스크 | 승인용 MD와 이미지 생성 단계 모두 compliance 체크 적용 |

## 13. Open Decisions for Design Phase

| Decision | Options |
|---|---|
| 기술 스택 | 기존 프로토타입 유지/수정, Next.js 기반 SaaS, 별도 backend+frontend |
| 사용자 수동 추가 방식 | 관리자 화면, seed/admin script, DB 직접 입력 |
| 이미지 생성 방식 | Codex orchestration, OpenAI image API, 작업 큐 기반 백엔드 |
| MD 저장 위치 | 파일 시스템 유지, DB 저장, hybrid 방식 |
| 브랜드 선택 안내사항 개수 제한 | 무제한, 5개 제한, 10개 제한 |

## 14. Next PDCA Step

다음 단계는 `/pdca design detail-page-web-tool`이다.

Design 단계에서는 다음을 확정한다.

- SaaS 아키텍처와 데이터 저장 방식
- 사용자/브랜드/상품/MD/이미지 생성 엔티티 구조
- MD allowlist 로딩 API
- 이미지 생성 비동기 작업 흐름
- 기존 로컬 프로토타입을 유지할지, 폐기하고 새 구조로 갈지
