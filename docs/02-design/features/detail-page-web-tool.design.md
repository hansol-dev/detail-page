# Detail Page Web Tool Design

Feature: detail-page-web-tool  
Phase: Design  
Created: 2026-05-19  
Upstream Plan: `docs/01-plan/features/detail-page-web-tool.plan.md`  
Selected Architecture: Option B — Clean SaaS Architecture  
Related Skill: `skills/ecommerce-detail-page`

## Context Anchor

| Anchor | Detail |
|---|---|
| WHY | 터미널 기반 상세페이지 제작 자동화를 일반 사용자가 쓸 수 있는 웹 제품으로 전환한다. |
| WHO | 상세페이지를 자주 만들어야 하는 운영자, 판매자, 여러 브랜드를 운영하는 소규모 사업자. |
| RISK | SaaS 범위를 크게 잡으면 MVP가 늦어지고, 브랜드/상품/MD/이미지 생성 책임이 섞이면 데이터 구조가 빠르게 복잡해진다. |
| SUCCESS | 사용자가 브랜드 기본값을 저장한 뒤 상품 필수값만 입력해 승인용 MD와 이미지 생성 결과를 한 번에 만들 수 있다. |
| SCOPE | MVP는 운영자 수동 사용자 추가, 사용자별 최대 5개 브랜드, 입력 필수/선택 표기, 필요한 MD만 로드, 승인용 MD부터 이미지 생성까지 포함한다. |

## 1. Overview

`detail-page-web-tool`은 기존 로컬/터미널 중심 상세페이지 제작 흐름을 SaaS 제품 구조로 재설계한다. 사용자는 웹에서 브랜드 기본값을 관리하고, 상품별 입력값을 넣고, 승인용 MD를 편집한 뒤, 상세페이지 이미지 생성과 결과 리뷰까지 진행한다.

이번 Design의 선택안은 **Option B — Clean SaaS Architecture**다. 빠른 로컬 확장보다 데이터 소유권, 사용자 격리, 이미지 생성 작업 상태, 향후 회원가입/결제/팀 기능 확장을 우선한다.

## 2. Architecture Decision

### 2.1 Compared Options

| Option | Description | Complexity | Maintainability | Effort | Risk |
|---|---|---:|---:|---:|---|
| A. Minimal Changes | 기존 Node/정적 UI 프로토타입 확장 | Low | Low | Low | SaaS 전환 시 재작업 큼 |
| B. Clean SaaS Architecture | Next.js + DB + Storage + Job Queue 기준으로 신규 설계 | High | High | High | 초기 구현량 큼 |
| C. Pragmatic SaaS MVP | SaaS 구조를 일부 단순화해 MVP부터 구현 | Medium | Medium-High | Medium | 경계가 흐려질 수 있음 |

### 2.2 Selected Option

선택: **Option B — Clean SaaS Architecture**

선택 이유:

- 사용자별 데이터 격리와 브랜드 프로필 관리가 핵심 요구사항이다.
- 이미지 생성은 오래 걸리는 비동기 작업이므로 작업 큐와 상태 모델이 필요하다.
- MD 편집 범위를 allowlist로 제한하려면 파일/DB 권한 모델을 명확히 가져가야 한다.
- MVP는 운영자가 사용자를 수동 추가하지만, 구조는 셀프 회원가입/결제/팀 기능으로 확장 가능해야 한다.

## 3. System Architecture

```text
Browser
  -> Next.js App Router UI
  -> Server Actions / Route Handlers
  -> Application Services
      -> Auth/User Service
      -> Brand Service
      -> Product Draft Service
      -> Approval MD Service
      -> Image Generation Service
      -> MD Workspace Service
  -> Database
  -> Object Storage
  -> Job Queue / Worker
  -> Image Generation Provider
```

### 3.1 Recommended Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js App Router + React | SaaS 화면, API, server action을 한 코드베이스에서 관리 |
| Styling | Tailwind or CSS Modules + design tokens | 브랜드 컬러 preview와 폼 UI를 빠르게 구성 |
| Database | PostgreSQL | 사용자/브랜드/상품/작업 상태 관계형 모델에 적합 |
| ORM | Prisma or Drizzle | 마이그레이션과 타입 안정성 |
| Storage | S3-compatible object storage | 로고, 상품 사진, 생성 이미지 저장 |
| Queue | BullMQ/Redis or managed queue | 이미지 생성 비동기 처리 |
| Auth | MVP: admin-created users + password/session; later: full auth | 사용자 격리 구조를 유지하면서 MVP 단순화 |
| Image Provider | Provider adapter interface | OpenAI image API 등 교체 가능하게 추상화 |

## 4. Data Model

### 4.1 Entity Relationship

```text
User 1 ── N BrandProfile
User 1 ── N ProductDraft
BrandProfile 1 ── N ProductDraft
ProductDraft 1 ── N ApprovalMarkdownVersion
ProductDraft 1 ── N ImageGenerationJob
ImageGenerationJob 1 ── N GeneratedCut
User 1 ── N UserMemoryDocument
```

### 4.2 User

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| email | string | Yes | Unique |
| displayName | string | Yes | 화면 표시명 |
| role | enum | Yes | admin, user |
| status | enum | Yes | active, disabled |
| createdAt | datetime | Yes | 생성일 |
| updatedAt | datetime | Yes | 수정일 |

MVP에서는 admin이 직접 사용자를 생성한다.

### 4.3 BrandProfile

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| userId | uuid | Yes | Owner |
| brandName | string | Yes | 브랜드명 |
| logoAssetId | uuid/null | Optional | Storage asset |
| pointColor | string | Yes | HEX color |
| subColor | string/null | Optional | HEX color |
| defaultTone | string/null | Optional | 상세페이지 기본 톤 |
| defaultSalesChannel | string/null | Optional | 기본 판매 채널 |
| requiredPhrases | text/null | Optional | 기본 필수 문구 |
| forbiddenPhrases | text/null | Optional | 기본 금지 문구 |
| shippingNotice | text/null | Optional | 배송 안내 |
| returnExchangeNotice | text/null | Optional | 반품/교환 안내 |
| customNotices | json | Optional | `{title, content}` 배열 |
| createdAt | datetime | Yes | 생성일 |
| updatedAt | datetime | Yes | 수정일 |

Constraint:

- `BrandProfile`은 `userId`당 최대 5개만 허용한다.
- 삭제는 hard delete보다 `archivedAt` soft delete를 우선 검토한다.

### 4.4 ProductDraft

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| userId | uuid | Yes | Owner |
| brandProfileId | uuid | Yes | 선택 브랜드 |
| productName | string | Yes | 상품명 |
| category | string | Yes | compliance 기준 |
| salesChannel | string/null | Optional | 브랜드 기본값 상속 가능 |
| targetCustomer | text/null | Optional | 없으면 assumption |
| sellingPoints | text/null | Optional | 핵심 판매 포인트 |
| facts | text/null | Optional | 확인된 상품 사실 |
| requiredPhrases | text/null | Optional | 상품별 필수 문구 |
| forbiddenPhrases | text/null | Optional | 상품별 금지 문구 |
| shippingNotice | text/null | Optional | 상품별 배송 안내 |
| returnExchangeNotice | text/null | Optional | 상품별 반품/교환 안내 |
| customNotices | json | Optional | 상품별 선택 안내사항 |
| cutCount | int | Optional | 기본 6, 12, 15 등 |
| status | enum | Yes | draft, md_ready, approved, generating, generated, revision_requested |
| createdAt | datetime | Yes | 생성일 |
| updatedAt | datetime | Yes | 수정일 |

상품별 값 우선순위:

```text
ProductDraft value
  -> BrandProfile default
  -> System default
```

### 4.5 ApprovalMarkdownVersion

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| productDraftId | uuid | Yes | 대상 상품 |
| version | int | Yes | 1부터 증가 |
| content | text | Yes | 승인용 MD |
| status | enum | Yes | draft, approved, superseded |
| generatedFrom | json | Yes | 입력 snapshot |
| createdBy | uuid | Yes | userId |
| createdAt | datetime | Yes | 생성일 |
| approvedAt | datetime/null | Optional | 승인일 |

이미지 생성은 `status = approved`인 최신 MD만 source of truth로 사용한다.

### 4.6 ImageGenerationJob

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| productDraftId | uuid | Yes | 대상 상품 |
| approvalMarkdownVersionId | uuid | Yes | source of truth |
| status | enum | Yes | queued, running, succeeded, failed, canceled |
| expectedCutCount | int | Yes | 승인 MD 컷 수 |
| completedCutCount | int | Yes | 진행률 |
| provider | string | Yes | image provider |
| errorMessage | text/null | Optional | 실패 사유 |
| createdAt | datetime | Yes | 생성일 |
| startedAt | datetime/null | Optional | 시작일 |
| completedAt | datetime/null | Optional | 완료일 |

### 4.7 GeneratedCut

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| imageGenerationJobId | uuid | Yes | 작업 |
| cutNumber | int | Yes | 1-based |
| title | string | Yes | 컷 제목 |
| imageAssetId | uuid/null | Optional | 생성 이미지 |
| approvedCopySnapshot | json | Yes | MD에서 추출한 승인 문구 |
| status | enum | Yes | queued, running, produced, failed, needs_revision, approved |
| qa | json | Optional | 텍스트/브랜드/상품 일치 QA |
| revisionRequest | text/null | Optional | 컷별 수정 요청 |

### 4.8 Asset

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | Yes | Primary key |
| userId | uuid | Yes | Owner |
| kind | enum | Yes | brand_logo, product_photo, generated_cut |
| storageKey | string | Yes | object storage key |
| mimeType | string | Yes | 파일 타입 |
| sizeBytes | int | Yes | 파일 크기 |
| width | int/null | Optional | 이미지 너비 |
| height | int/null | Optional | 이미지 높이 |
| createdAt | datetime | Yes | 생성일 |

## 5. Application Services

### 5.1 UserAdminService

Responsibilities:

- admin 사용자 생성
- 사용자 활성/비활성 전환
- 사용자별 데이터 접근 범위 제한

MVP:

- 관리자 화면 또는 admin-only server action으로 사용자 생성
- 공개 회원가입 없음

### 5.2 BrandService

Responsibilities:

- 브랜드 생성/수정/삭제
- 사용자당 5개 제한 검증
- 로고 업로드와 기본 컬러 저장
- 브랜드 기본 안내사항 저장

Validation:

- `brandName`, `pointColor` 필수
- `customNotices`는 `{ title: string, content: string }[]`
- `pointColor`, `subColor`는 HEX 형식

### 5.3 ProductDraftService

Responsibilities:

- 상품 초안 생성
- 브랜드 기본값 병합
- 입력 필수/선택 메타데이터 제공
- 상품 사진 asset 연결

Field metadata shape:

```json
{
  "name": "productName",
  "label": "상품명",
  "required": true,
  "source": "product",
  "helpText": "승인용 MD와 이미지 헤드라인의 기본값"
}
```

### 5.4 ApprovalMdService

Responsibilities:

- 입력 snapshot 기반 승인용 MD 생성
- MD 버전 관리
- 웹 편집 내용 저장
- 승인 상태 전환
- 이미지 생성 전 승인된 최신 MD 제공

Rules:

- 이미지 생성 전 반드시 승인 상태 MD가 있어야 한다.
- MD 재생성 시 이전 승인 전 draft는 `superseded` 처리한다.
- 상품별 컷 수가 변경되면 Cut Plan 전체를 재생성한다.

### 5.5 MdWorkspaceService

Responsibilities:

- 사용자가 접근 가능한 MD 목록 제공
- include allowlist 적용
- `skills/`, `templates/`, source code 영역 제외
- SaaS DB 저장 MD와 legacy file-backed MD를 분리 관리

MVP include allowlist:

```text
docs/00-pm/
docs/01-plan/features/
docs/02-design/features/
docs/03-analysis/
docs/04-report/
DB ApprovalMarkdownVersion
DB ProductDraft
user-memory/{userId}/**/*.md
```

Design decision:

- SaaS 신규 데이터는 DB의 `ApprovalMarkdownVersion`, `UserMemoryDocument`에 저장한다.
- 기존 로컬 문서 호환을 위해 read-only 또는 admin-only file-backed adapter를 둘 수 있다.
- 일반 사용자 화면은 자기 소유 DB 문서를 우선 표시한다.

### 5.6 ImageGenerationService

Responsibilities:

- 승인 MD에서 컷 계획 추출
- 이미지 생성 job 생성
- 컷별 prompt payload 생성
- provider adapter 호출
- 결과 asset 저장
- 컷별 QA 결과 기록

Provider adapter:

```ts
interface ImageProvider {
  generateCut(input: GenerateCutInput): Promise<GeneratedImageResult>;
}
```

Important rule:

- 승인 MD와 다르게 컷 수를 임의로 줄이거나 합치지 않는다.
- 생성 이미지에는 승인된 한국어 문구가 포함되어야 한다.
- 실패한 컷만 재생성할 수 있어야 한다.

## 6. User Flows

### 6.1 Admin Adds User

```text
Admin opens Users
  -> Create user
  -> Enter email/loginId and displayName
  -> User status active
  -> User can log in or receive temporary credential
```

### 6.2 User Creates Brand

```text
User opens Brand Settings
  -> Add Brand
  -> Enter brandName and pointColor
  -> Optional logo/subColor/tone/channel/notices
  -> Save
  -> System checks max 5 active brands
```

### 6.3 User Creates Detail Page

```text
Select brand
  -> Brand defaults fill form
  -> Required/optional labels visible
  -> Enter productName and category
  -> Upload photos if available
  -> Generate approval MD
  -> Edit MD if needed
  -> Approve MD
  -> Start image generation job
  -> Review generated cuts
```

### 6.4 User Edits MD

```text
Open MD Workspace
  -> System lists only allowed documents
  -> User selects owned approval MD or memory MD
  -> Edit content
  -> Save as new version or update draft
```

## 7. API Design

### 7.1 Admin/User

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/users` | admin creates user |
| GET | `/api/admin/users` | admin lists users |
| PATCH | `/api/admin/users/:id` | admin updates status/displayName |

### 7.2 Brand

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/brands` | list current user's brands |
| POST | `/api/brands` | create brand, enforce max 5 |
| PATCH | `/api/brands/:id` | update brand defaults |
| DELETE | `/api/brands/:id` | archive brand |

### 7.3 Product Draft

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/product-drafts` | list drafts |
| POST | `/api/product-drafts` | create draft |
| GET | `/api/product-drafts/:id` | get draft |
| PATCH | `/api/product-drafts/:id` | update draft |
| POST | `/api/product-drafts/:id/photos` | upload photos |

### 7.4 Approval MD

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/product-drafts/:id/approval-md` | generate MD version |
| GET | `/api/product-drafts/:id/approval-md/latest` | get latest MD |
| PATCH | `/api/approval-md/:versionId` | save edited draft MD |
| POST | `/api/approval-md/:versionId/approve` | approve MD |

### 7.5 Image Generation

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/product-drafts/:id/image-jobs` | start image generation from approved MD |
| GET | `/api/image-jobs/:id` | get job status |
| GET | `/api/image-jobs/:id/cuts` | list generated cuts |
| POST | `/api/generated-cuts/:id/revision` | record revision request |
| POST | `/api/generated-cuts/:id/regenerate` | regenerate one cut |

### 7.6 MD Workspace

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/md-workspace/files` | list allowlisted user-accessible MD files |
| GET | `/api/md-workspace/files/:id` | read file/document |
| PATCH | `/api/md-workspace/files/:id` | save editable document |

## 8. UI Design

### 8.1 Main Navigation

| Page | Purpose |
|---|---|
| Dashboard | 최근 상품 초안과 이미지 생성 상태 |
| Brands | 브랜드 프로필 최대 5개 관리 |
| New Detail Page | 브랜드 선택 후 상품 입력 |
| Approval MD Editor | 승인용 MD 확인/수정/승인 |
| Generation Review | 컷별 이미지 결과 확인/수정 요청 |
| MD Workspace | 필요한 MD만 편집 |
| Admin Users | MVP 관리자용 사용자 추가 |

### 8.2 Form Field Required/Optional UI

모든 입력 label은 다음 구조를 가진다.

```text
상품명 [필수]
브랜드 로고 [선택]
상품 사진 [선택: 초안 가능 / 최종 제작 권장]
```

Rules:

- 필수 필드는 저장/생성 전 validation을 막는다.
- 선택 필드는 비어 있으면 MD에 `확인 필요` 또는 브랜드 기본값 상속으로 표시한다.
- category-dependent 필드는 카테고리 선택 후 필수성 설명을 보여준다.

### 8.3 Brand Settings UI

Controls:

- 브랜드명 text input
- 로고 upload
- 포인트 컬러 color picker
- 보조 컬러 color picker
- 기본 상세페이지 톤 select
- 기본 판매 채널 select
- 필수 문구 textarea
- 금지 문구 textarea
- 배송 안내 textarea
- 반품/교환 안내 textarea
- 선택 안내사항 repeater: title + content

Constraint display:

```text
브랜드 3 / 5
```

### 8.4 Image Generation Review UI

Each cut card:

- 컷 번호
- 승인 MD에서 추출한 headline/subcopy
- 생성 이미지
- QA status
- 수정 요청 textarea
- 해당 컷 재생성 action

## 9. Storage Design

### 9.1 Object Keys

```text
users/{userId}/brands/{brandId}/logo/{assetId}.{ext}
users/{userId}/detail-pages/{productDraftId}/photos/{assetId}.{ext}
users/{userId}/detail-pages/{productDraftId}/generated/{jobId}/cut-{NN}.{ext}
```

### 9.2 Database vs File

| Data | Storage |
|---|---|
| User/Brand/Product entities | Database |
| Approval MD | Database versioned text |
| User memory MD | Database text document |
| Legacy project docs | File-backed adapter, admin/dev only |
| Uploaded images | Object storage |
| Generated images | Object storage |

## 10. Compliance and Safety Rules

Approval MD and image generation must enforce:

- 인증, 수상, 시험자료, 리뷰, 판매량, 순위는 증빙 없으면 사용 금지
- 식품, 화장품, 건강기능식품, 유아, 반려동물 카테고리는 고시/주의사항 확인 필요 표시
- 상품 사진이 없으면 최종 생산본이 아니라 콘셉트 초안으로 표시
- 생성 이미지는 승인된 MD의 문구와 컷 수를 따라야 함
- 배송/반품/교환 안내는 브랜드 기본값보다 상품별 입력값 우선

## 11. Implementation Guide

### 11.1 Module Map

| Module | Files/Areas | Responsibility |
|---|---|---|
| module-1-auth-admin | `app/admin/users`, `services/user-admin`, `db/user` | 관리자 수동 사용자 추가 |
| module-2-brand-profiles | `app/brands`, `services/brand`, `db/brand` | 브랜드 최대 5개, 기본값 저장 |
| module-3-product-drafts | `app/detail-pages/new`, `services/product-draft`, `db/product` | 필수/선택 입력 폼과 브랜드 기본값 병합 |
| module-4-approval-md | `app/detail-pages/[id]/approval`, `services/approval-md`, `db/approval-md` | 승인용 MD 생성/편집/버전/승인 |
| module-5-md-workspace | `app/md-workspace`, `services/md-workspace` | allowlist 기반 MD 로드/편집 |
| module-6-image-generation | `services/image-generation`, `workers/image-worker`, `db/image-job` | 승인 MD 기반 이미지 생성 job |
| module-7-review | `app/detail-pages/[id]/review`, `db/generated-cut` | 컷별 결과 리뷰와 수정 요청 |

### 11.2 Implementation Order

1. Database schema and migrations
2. Admin-created users and session guard
3. Brand profile CRUD with max 5 constraint
4. Product draft form metadata and brand default merge
5. Approval MD generation and editor
6. MD workspace allowlist
7. Image generation job model and worker adapter
8. Generated cut review UI
9. Compliance/QA checks

### 11.3 Session Guide

Recommended incremental sessions:

| Session | Scope | Deliverable |
|---|---|---|
| S1 | `module-1-auth-admin,module-2-brand-profiles` | SaaS user and brand foundation |
| S2 | `module-3-product-drafts,module-4-approval-md` | 입력 폼, 필수/선택 표시, 승인용 MD |
| S3 | `module-5-md-workspace` | 필요한 MD만 로드하는 편집기 |
| S4 | `module-6-image-generation,module-7-review` | 이미지 생성 job과 리뷰 화면 |
| S5 | QA/compliance | success criteria 검증 |

Future `/pdca do` usage:

```text
/pdca do detail-page-web-tool --scope module-1-auth-admin,module-2-brand-profiles
/pdca do detail-page-web-tool --scope module-3-product-drafts,module-4-approval-md
/pdca do detail-page-web-tool --scope module-6-image-generation,module-7-review
```

## 12. Test Plan

| Layer | Test |
|---|---|
| Unit | brand max 5 constraint, default merge priority, field metadata required/optional |
| API | user ownership guard, brand CRUD, approval MD versioning, image job start only after approved MD |
| UI | required/optional labels visible, brand defaults fill product form, MD editor excludes `skills/` |
| Worker | job status transition, generated cut count equals approved cut count, failed cut retry |
| Compliance | unverified claims blocked or marked confirmation needed |

## 13. Design Anchor Note

이 feature는 UI가 핵심이므로 실제 구현 전에 1-2개 화면의 UI 컨셉을 먼저 만들고 디자인 토큰을 고정하는 것이 좋다.

Recommended anchor pages:

- Brand Settings
- New Detail Page + Approval MD split view

If available later:

```text
/design-anchor capture detail-page-web-tool
```

## 14. Open Questions

| Question | Proposed Default |
|---|---|
| Auth provider | MVP는 자체 admin-created user/session, 이후 provider 연동 |
| `customNotices` max count | 브랜드당 5개 |
| Approval MD storage | DB versioned text |
| Legacy local files exposure | admin/dev only |
| Image generation provider | adapter로 추상화하고 provider는 구현 단계에서 결정 |
