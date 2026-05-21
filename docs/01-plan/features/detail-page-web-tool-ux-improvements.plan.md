# Detail Page Web Tool UX Improvements Plan

Feature: detail-page-web-tool-ux-improvements  
Phase: Plan  
Created: 2026-05-20  
Primary Workflow: `pdca plan`  
Related PRD: `docs/00-pm/detail-page-web-tool.prd.md`  
Parent Feature: `detail-page-web-tool`

## Executive Summary

| Perspective | Summary |
|---|---|
| Problem | 현재 상세페이지 생성 도구는 브랜드, 상품 입력, 초안 생성, 이미지 생성 기능은 갖췄지만 비개발자에게 내부 용어와 긴 입력폼이 그대로 노출된다. 사용자는 어떤 정보를 먼저 넣어야 하는지, 생성 결과가 테스트용인지 판매용인지, 다음에 무엇을 해야 하는지 계속 추론해야 한다. |
| Solution | 기존 SaaS/생성 구조는 유지하고, 사용자-facing UX를 `브랜드 준비 -> 상품 입력 -> 상세페이지 초안 검토 -> 이미지 생성 -> 결과 다운로드` 흐름으로 재정리한다. `승인용 MD`는 화면 용어에서 `상세페이지 초안`으로 바꾸고, 원문 MD는 고급 편집으로 숨긴다. |
| Function UX Effect | 사용자는 첫 화면 체크리스트를 따라 브랜드와 상품을 만들고, 긴 입력폼은 단계별 섹션으로 채운다. 생성 전에는 컷 카드와 확인 필요 항목을 보고 승인하며, 생성 후에는 개별 이미지와 전체 이미지를 다운로드할 수 있다. |
| Core Value | 기존 승인/컴플라이언스 통제력을 잃지 않으면서도 일반 판매자가 디자이너나 개발자 없이 상세페이지 초안을 이해하고 반복 수정할 수 있는 제품 경험으로 만든다. |

## Context Anchor

| Anchor | Detail |
|---|---|
| WHY | 기능 구현이 끝난 상세페이지 생성 도구를 실제 비개발자 사용자가 막히지 않고 쓸 수 있게 만든다. |
| WHO | 1인 쇼핑몰 운영자, 여러 브랜드를 운영하는 판매자, 상품 상세페이지 제작을 대행하는 운영자. |
| RISK | 원문 MD를 숨기면 통제력이 줄 수 있고, UX 범위를 크게 잡으면 현재 MVP 수정이 과도해질 수 있다. |
| SUCCESS | 사용자가 내부 용어를 몰라도 브랜드 등록부터 결과 다운로드까지 이어서 진행하고, 생성 전 초안 내용을 카드형으로 검토할 수 있다. |
| SCOPE | P0/P1 UX 개선을 모두 포함하되, ZIP export와 마켓플레이스별 고급 export는 다음 단계로 미룬다. |

## 1. Goal

`detail-page-web-tool-ux-improvements`의 목표는 기존 `detail-page-web-tool`의 기능적 흐름을 일반 사용자 제품 경험으로 다듬는 것이다.

이번 개선은 데이터 모델이나 이미지 생성 provider를 다시 설계하는 일이 아니다. 이미 존재하는 브랜드, 상품 초안, 승인용 Markdown, 이미지 생성 job, 컷 리뷰 기능 위에 사용자가 이해하기 쉬운 용어, 단계, 검토 UI, 다운로드 흐름을 얹는다.

핵심 방향은 다음과 같다.

| Current | Target |
|---|---|
| 승인용 MD | 상세페이지 초안 |
| MD 원문 textarea 중심 검토 | 상품 요약, 확인 필요 항목, 컷 카드 중심 검토 |
| Provider / dev-svg-provider | 테스트 이미지 / AI 생성 이미지 |
| 긴 단일 입력폼 | 기본 정보, 사진, 판매 포인트, 안내사항, 고급 설정 섹션 |
| 컷별 결과만 확인 | 전체 상세페이지 미리보기 + 개별/전체 다운로드 |

## 2. Product Scope

### 2.1 Included

| Area | Included |
|---|---|
| Dashboard onboarding | 첫 사용 체크리스트와 빈 상태 CTA를 제공한다. |
| User-facing terminology | `승인용 MD`, `Provider`, `dev-svg-provider`, `목업` 같은 내부 용어를 사용자 용어로 바꾼다. |
| Product form UX | 상품 입력폼을 단계형 섹션으로 나누고 필드를 `필수`, `권장`, `선택`, `최종 확인 필요`로 구분한다. |
| Brand defaults preview | 상품 생성 전 선택 브랜드의 로고/컬러/배송/반품/필수 문구 적용 예정값을 보여준다. |
| Draft review UX | 상세페이지 초안을 카드형으로 검토하고, 원문 MD는 고급 편집 탭/영역으로 이동한다. |
| Image readiness | 테스트 이미지와 실제 AI 생성 이미지를 구분하고 판매 사용 가능 여부를 명확히 표시한다. |
| Review and download | 생성 결과의 전체 미리보기, 개별 이미지 다운로드, 전체 이미지 다운로드를 제공한다. |
| Results management | 결과 목록에서 상태별 필터를 제공한다. |
| Memory guidance | 메모리 화면에 브랜드 말투, 금지 표현, 자주 쓰는 안내문 예시를 제공한다. |

### 2.2 Deferred

| Area | Reason |
|---|---|
| ZIP export | 이번 범위는 전체 다운로드 버튼까지만 잡고 ZIP 패키징은 다음 단계로 미룬다. |
| 마켓플레이스별 export 규격 | 스마트스토어/쿠팡/Amazon별 규격화는 별도 설계가 필요하다. |
| Batch selected cut regeneration | 컷별 수정 요청은 유지하되 선택 컷 일괄 재생성은 후속 고도화로 둔다. |
| Full auth/payment/team features | 기존 MVP 범위를 유지한다. |
| Database/storage migration | 현재 파일-backed 개발 저장소 구조를 UX 개선 때문에 바꾸지 않는다. |

## 3. User Problem

### 3.1 Current Friction

| Friction | User Impact | Plan Response |
|---|---|---|
| 시작 순서가 명확하지 않음 | 처음 들어온 사용자가 브랜드부터 만들어야 하는지 상품부터 만들어야 하는지 모른다. | Dashboard에 단계형 checklist를 넣는다. |
| 입력폼이 길고 중요도 차이가 없음 | 모든 선택값을 채워야 하는 부담을 느낀다. | progressive sections와 중요도 badge를 적용한다. |
| `승인용 MD`가 어렵게 느껴짐 | 원문 문서를 읽고 편집해야 할 것처럼 보인다. | `상세페이지 초안` 카드형 검토를 기본으로 제공한다. |
| 생성 결과의 용도를 판단하기 어려움 | 테스트 이미지인지 판매용 AI 결과인지 헷갈린다. | readiness label과 경고 메시지를 표준화한다. |
| 결과물을 바로 쓸 수 없음 | 이미지 확인 후 따로 저장 방법을 찾아야 한다. | 개별/전체 다운로드 액션을 추가한다. |

### 3.2 Why Expose The Draft At All?

`상세페이지 초안`은 사용자에게 원문 Markdown으로 노출할 필요는 낮다. 하지만 생성 전 검토 단계 자체는 계속 필요하다.

이유:

| Reason | Detail |
|---|---|
| 비용/시간 절감 | 이미지 생성 전에 컷 구성, 문구, 안내사항을 고치면 재생성 비용을 줄일 수 있다. |
| 법적/플랫폼 리스크 감소 | 인증, 효능, 리뷰, 수치 claims를 이미지에 넣기 전에 확인할 수 있다. |
| 브랜드 통제 | 로고, 포인트 컬러, 배송/반품 문구 적용 여부를 눈으로 확인할 수 있다. |
| 비개발자 이해 | 원문 MD 대신 컷 카드와 확인 필요 목록으로 보여주면 승인 게이트는 유지하면서 부담은 줄일 수 있다. |

따라서 기본 사용자 화면의 이름은 `상세페이지 초안`이며, 원문 Markdown은 `고급 편집`으로 둔다.

## 4. User Flow

### 4.1 First Run Flow

```text
Dashboard
  -> 1. 브랜드 등록
  -> 2. 상품 정보 입력
  -> 3. 상세페이지 초안 확인
  -> 4. 이미지 생성
  -> 5. 결과 다운로드
```

각 단계는 완료/진행/대기 상태를 가진다. 사용자가 브랜드가 없으면 `새 상세페이지`보다 `브랜드 등록`을 우선 CTA로 보여준다.

### 4.2 Product Creation Flow

```text
상세페이지 생성
  -> 기본 정보: 브랜드, 상품명, 카테고리, 컷 수
  -> 사진: 상품 사진, 로고 적용 상태
  -> 판매 포인트: 핵심 장점, 상품 사실 정보, 주요 고객
  -> 안내사항: 배송, 반품/교환, 선택 안내사항
  -> 고급 설정: 필수 문구, 금지 문구
  -> 브랜드 기본값 미리보기
  -> 상세페이지 초안 만들기
```

### 4.3 Draft Review Flow

```text
상세페이지 초안
  -> 상품 요약
  -> 브랜드 기본값 적용 내역
  -> 최종 확인 필요 항목
  -> 컷별 카드 목록
  -> 승인하고 이미지 생성
  -> 고급 편집에서 원문 MD 수정 가능
```

### 4.4 Review And Download Flow

```text
이미지 생성 리뷰
  -> 전체 상세페이지 미리보기
  -> 컷별 이미지 확인
  -> 컷별 수정 요청
  -> 개별 다운로드
  -> 전체 다운로드
```

## 5. Terminology Rules

| Internal Term | User-facing Term | Notes |
|---|---|---|
| 승인용 MD | 상세페이지 초안 | 화면 기본 용어는 초안으로 통일한다. |
| Markdown / MD | 고급 편집 | 원문을 직접 수정하는 영역에서만 사용한다. |
| Provider | 생성 방식 | 관리자/개발 로그가 아닌 사용자 화면에는 provider 값을 그대로 노출하지 않는다. |
| dev-svg-provider | 테스트 이미지 | 실제 AI 이미지가 아니며 판매 사용 전 재생성이 필요하다고 표시한다. |
| 목업 이미지 | 테스트 이미지 | `목업`보다 사용자가 이해하기 쉬운 표현으로 통일한다. |
| approval | 초안 확인 / 초안 승인 | 버튼 문구는 작업 의미를 직접 표현한다. |

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| UX-FR-01 | Dashboard는 브랜드 등록, 상품 입력, 초안 확인, 이미지 생성, 결과 다운로드 단계 checklist를 보여준다. | Must |
| UX-FR-02 | Dashboard 빈 상태는 사용자의 다음 필수 행동으로 직접 연결한다. 브랜드가 없으면 브랜드 등록, 브랜드가 있으면 새 상세페이지 생성으로 안내한다. | Must |
| UX-FR-03 | 사용자 화면에서 `승인용 MD` 명칭을 `상세페이지 초안`으로 대체한다. | Must |
| UX-FR-04 | Product form은 기본 정보, 사진, 판매 포인트, 안내사항, 고급 설정 섹션으로 구분한다. | Must |
| UX-FR-05 | Product form 필드는 `필수`, `권장`, `선택`, `최종 확인 필요` badge 중 하나를 표시한다. | Must |
| UX-FR-06 | 상품 생성 화면은 선택한 브랜드 기본값 적용 예정값을 요약해서 보여준다. | Must |
| UX-FR-07 | Draft review 화면은 MD 원문보다 상품 요약, 확인 필요 항목, 컷 카드 목록을 기본으로 보여준다. | Must |
| UX-FR-08 | 원문 Markdown 편집은 `고급 편집` 영역에 둔다. | Must |
| UX-FR-09 | 초안 승인 버튼은 사용자가 이해할 수 있는 문구로 바꾼다. 예: `이 초안으로 이미지 생성 준비`. | Must |
| UX-FR-10 | 이미지 생성/리뷰 화면은 `테스트 이미지`와 `AI 생성 이미지`를 구분해서 표시한다. | Must |
| UX-FR-11 | 테스트 이미지는 판매용이 아니며 OPENAI_API_KEY 설정 후 실제 이미지 생성이 필요하다는 readiness warning을 표시한다. | Must |
| UX-FR-12 | 리뷰 화면은 전체 상세페이지 미리보기를 제공한다. | Must |
| UX-FR-13 | 각 컷은 개별 다운로드 액션을 제공한다. | Must |
| UX-FR-14 | 리뷰 화면은 전체 다운로드 액션을 제공한다. 단, ZIP 패키징은 이번 범위가 아니다. | Must |
| UX-FR-15 | 결과 목록은 전체, 초안 작성, 초안 확인, 이미지 생성 완료, 수정 요청 상태 필터를 제공한다. | Should |
| UX-FR-16 | 메모리 화면은 브랜드 말투, 금지 표현, 자주 쓰는 안내문 예시를 제공한다. | Should |
| UX-FR-17 | 브랜드 관리 화면은 로고/컬러/공통 안내사항 preview를 강화한다. | Should |

## 7. UX Requirements

### 7.1 Dashboard Checklist

| Step | Complete Condition | CTA |
|---|---|---|
| 브랜드 등록 | active brand count > 0 | 브랜드 만들기 |
| 상품 정보 입력 | product draft count > 0 | 새 상세페이지 |
| 상세페이지 초안 확인 | latest draft status is `md_ready` or later | 초안 확인 |
| 이미지 생성 | latest image job exists or approved draft exists | 이미지 생성 |
| 결과 다운로드 | generated cuts exist | 결과 보기 |

### 7.2 Field Importance Badges

| Badge | Meaning | Example |
|---|---|---|
| 필수 | 없으면 초안 생성 불가 | 브랜드 선택, 상품명, 카테고리 |
| 권장 | 넣으면 결과 품질이 크게 좋아짐 | 상품 사진, 핵심 판매 포인트, 상품 사실 정보 |
| 선택 | 비워도 브랜드 기본값 또는 확인 필요로 처리 | 주요 고객, 판매 채널 |
| 최종 확인 필요 | 입력은 선택이지만 판매 전 확인이 필요 | 원산지, 성분, 인증, 수치 자료 |

### 7.3 Draft Review Cards

카드형 초안 검토 화면은 최소 다음 블록을 가진다.

| Block | Content |
|---|---|
| 상품 요약 | 상품명, 브랜드, 카테고리, 컷 수, 판매 채널 |
| 브랜드 적용 | 로고 여부, 포인트 컬러, 필수/금지 문구, 배송/반품 안내 |
| 확인 필요 | 원산지, 성분, 인증, 리뷰, 수치, 주의사항 |
| 컷 구성 | 컷 번호, 목적, 헤드라인, 서브카피, 이미지 방향 |
| 생성 준비도 | 상품 사진 있음/없음, 로고 있음/없음, 테스트/AI 이미지 가능 여부 |

### 7.4 Download Behavior

| Action | Behavior |
|---|---|
| 개별 다운로드 | 각 컷 이미지 옆에 다운로드 버튼을 둔다. |
| 전체 다운로드 | 현재 생성된 모든 컷 이미지를 한 번에 다운로드한다. 브라우저 제한 때문에 MVP에서는 순차 다운로드 또는 전체 다운로드 페이지 방식도 허용한다. |
| ZIP 다운로드 | 제외. 다음 단계에서 별도 구현한다. |

## 8. Data And Logic Requirements

이번 개선은 새 핵심 entity를 요구하지 않는다. 다만 UI를 쉽게 만들기 위해 아래 파생 데이터가 필요하다.

| Derived Data | Source | Use |
|---|---|---|
| onboardingSteps | brands, drafts, approvalMarkdownVersions, imageGenerationJobs, generatedCuts | Dashboard checklist |
| fieldImportance | existing field metadata 확장 | Product form badges |
| draftReviewSummary | Approval Markdown content + ProductDraft + BrandProfile | Card-based draft review |
| generationReadiness | job.provider, OPENAI_API_KEY, photo assets, logo asset | 테스트/AI 생성 이미지 구분 |
| downloadableCuts | GeneratedCut + Asset | 개별/전체 다운로드 |

Design 단계에서 `field-metadata.ts` 확장과 `approval-md` summary parser 또는 generated snapshot 기반 summary 생성 방식을 결정한다.

## 9. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Accessibility | Checklist, tabs/details, download buttons는 keyboard focus와 label을 가져야 한다. |
| Mobile layout | 상품 입력 섹션과 컷 카드 검토는 모바일에서 한 줄 흐름으로 읽혀야 한다. |
| Korean copy clarity | 사용자-facing 용어는 한국어 작업 단어로 통일하고 개발 용어를 노출하지 않는다. |
| No data loss | 고급 MD 편집 기능은 유지하고 기존 승인/저장 action을 깨지 않는다. |
| Graceful fallback | JS 없이도 기본 form 제출과 링크 이동은 동작해야 한다. |

## 10. Success Criteria

| ID | Criteria |
|---|---|
| SC-01 | 첫 방문 Dashboard에서 사용자는 현재 단계와 다음 CTA를 볼 수 있다. |
| SC-02 | 브랜드가 없을 때 새 상세페이지 생성보다 브랜드 등록이 먼저 안내된다. |
| SC-03 | 상품 입력폼은 섹션별로 나뉘고 각 필드가 필수/권장/선택/최종 확인 필요로 표시된다. |
| SC-04 | 사용자 화면 기본 용어에서 `승인용 MD`, `Provider`, `dev-svg-provider`가 사라진다. |
| SC-05 | 초안 검토 화면은 원문 MD를 읽지 않아도 상품 요약, 브랜드 적용, 확인 필요 항목, 컷 구성을 이해할 수 있다. |
| SC-06 | 원문 Markdown 편집은 고급 편집 영역에서 계속 가능하다. |
| SC-07 | 테스트 이미지 결과는 판매용 AI 생성 이미지가 아님을 명확히 표시한다. |
| SC-08 | 리뷰 화면에서 전체 상세페이지 미리보기를 볼 수 있다. |
| SC-09 | 리뷰 화면에서 각 컷 이미지를 개별 다운로드할 수 있다. |
| SC-10 | 리뷰 화면에서 전체 다운로드 액션을 실행할 수 있다. ZIP 패키징은 요구하지 않는다. |
| SC-11 | 결과 목록에서 상태별 필터로 작업을 좁혀 볼 수 있다. |

## 11. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 초안 카드와 원문 MD가 불일치할 수 있음 | 사용자가 승인한 내용과 실제 생성 기준이 달라질 수 있다. | 카드 summary는 MD 또는 generated snapshot에서 파생하고 저장 직후 재계산한다. |
| 전체 다운로드가 브라우저 정책에 막힐 수 있음 | 여러 파일 자동 다운로드가 제한될 수 있다. | MVP는 순차 다운로드 또는 전체 다운로드 안내 페이지를 허용하고 ZIP은 후속으로 둔다. |
| 용어 변경이 기존 코드/문서와 혼재될 수 있음 | 화면마다 다른 표현이 나와 혼란이 커진다. | user-facing copy map을 Design에서 정의하고 페이지별 적용 범위를 체크한다. |
| 입력폼 단계화가 과도한 wizard가 될 수 있음 | 빠른 입력이 느려질 수 있다. | 같은 페이지 안의 섹션/접기 구조로 시작하고 필수 섹션을 우선 노출한다. |
| 테스트 이미지 경고가 너무 강하면 사용자가 기능이 안 된다고 느낄 수 있음 | 전환 저하 | 테스트 이미지는 흐름 확인용으로 표현하고 실제 AI 생성 설정 시 전환된다는 안내를 제공한다. |

## 12. Open Decisions For Design Phase

| Decision | Options | Recommended |
|---|---|---|
| 초안 검토 UI 구조 | 별도 페이지, 기존 approval 페이지 대체, 탭 구조 | 기존 approval 페이지에서 기본 검토 + 고급 편집 탭 |
| Draft summary 생성 | MD parser, generatedFrom snapshot, 별도 summary service | snapshot + 간단 parser 조합 |
| Product form section UI | full wizard, accordion, fieldset sections | fieldset/section 기반 progressive layout |
| 전체 다운로드 구현 | 순차 다운로드, canvas merge, server bundle, ZIP | 순차 다운로드 또는 전체 다운로드 페이지, ZIP 제외 |
| 상태 필터 위치 | Dashboard, 결과 목록, 둘 다 | 결과 목록 우선, Dashboard는 checklist 중심 |

## 13. Implementation Slices

| Slice | Scope | Deliverable |
|---|---|---|
| S1 | Dashboard and terminology | 첫 사용 checklist, 빈 상태 CTA, user-facing copy 변경 |
| S2 | Product form UX | 섹션 분리, badge 확장, 브랜드 기본값 미리보기 |
| S3 | Draft review | 상세페이지 초안 카드 UI, 고급 MD 편집 유지 |
| S4 | Review/download | 테스트/AI 이미지 readiness, 전체 미리보기, 개별/전체 다운로드 |
| S5 | Results and memory polish | 상태 필터, 메모리 예시, 브랜드 preview 개선 |

## 14. Next PDCA Step

다음 단계는 `/pdca design detail-page-web-tool-ux-improvements`다.

Design 단계에서는 다음을 확정한다.

- 초안 검토 카드 데이터 생성 방식
- 기존 approval page를 탭 구조로 바꾸는 컴포넌트 설계
- `field-metadata.ts` 확장 방식
- 전체 다운로드 MVP 구현 방식
- 사용자-facing 용어 맵과 페이지별 copy 적용 범위
