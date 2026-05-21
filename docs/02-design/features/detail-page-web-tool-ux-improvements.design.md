# Detail Page Web Tool UX Improvements Design

Feature: detail-page-web-tool-ux-improvements  
Phase: Design  
Created: 2026-05-20  
Upstream Plan: `docs/01-plan/features/detail-page-web-tool-ux-improvements.plan.md`  
Upstream PRD: `docs/00-pm/detail-page-web-tool.prd.md`  
Selected Architecture: Option B - Clean UX Architecture  
Parent Feature: `detail-page-web-tool`

## Context Anchor

| Anchor | Detail |
|---|---|
| WHY | 기능 구현이 끝난 상세페이지 생성 도구를 실제 비개발자 사용자가 막히지 않고 쓸 수 있게 만든다. |
| WHO | 1인 쇼핑몰 운영자, 여러 브랜드를 운영하는 판매자, 상품 상세페이지 제작을 대행하는 운영자. |
| RISK | 원문 MD를 숨기면 통제력이 줄 수 있고, UX 범위를 크게 잡으면 현재 MVP 수정이 과도해질 수 있다. |
| SUCCESS | 사용자가 내부 용어를 몰라도 브랜드 등록부터 결과 다운로드까지 이어서 진행하고, 생성 전 초안 내용을 카드형으로 검토할 수 있다. |
| SCOPE | P0/P1 UX 개선을 모두 포함하되, ZIP export와 마켓플레이스별 고급 export는 다음 단계로 미룬다. |

## 1. Overview

`detail-page-web-tool-ux-improvements`는 기존 상세페이지 생성 MVP의 데이터 모델과 server action 흐름은 유지하면서, 사용자-facing 화면을 일반 판매자가 이해할 수 있는 제품 UX로 재구성한다.

핵심 변경은 네 가지다.

| Area | Design Decision |
|---|---|
| Terminology | 화면 기본 용어는 `상세페이지 초안`, `테스트 이미지`, `AI 생성 이미지`, `전체 다운로드`로 통일한다. |
| UX data layer | Dashboard 단계, 필드 중요도, 초안 검토 카드, 생성 준비도, 다운로드 목록을 `lib/ux/*`에서 파생한다. |
| UI component layer | 체크리스트, 필드 라벨, 초안 카드, 준비도 배지, 다운로드 버튼을 `components/ux/*` 공통 컴포넌트로 분리한다. |
| Page composition | 기존 페이지는 도메인 데이터 fetch와 action binding만 담당하고, 사용자-facing 표현은 UX 컴포넌트에 위임한다. |

## 2. Architecture Decision

### 2.1 Compared Options

| Option | Description | Complexity | Maintainability | Effort | Risk |
|---|---|---:|---:|---:|---|
| A. Minimal Changes | 기존 페이지의 문구와 레이아웃을 직접 수정 | Low | Low | Low | 페이지마다 용어와 상태 로직이 흩어짐 |
| B. Clean UX Architecture | 파생 데이터 service와 공통 UX 컴포넌트 계층 분리 | Medium-High | High | Medium-High | 초기 파일 수와 설계량 증가 |
| C. Pragmatic UX Layer | 일부 helper와 컴포넌트만 추가하고 페이지별 구현 유지 | Medium | Medium | Medium | 빠르지만 UX 규칙 중복 가능 |

### 2.2 Selected Option

선택: **Option B - Clean UX Architecture**

선택 이유:

- 이번 feature는 데이터 모델보다 “사용자가 어떻게 이해하는가”가 핵심이다.
- `승인용 MD`, `Provider`, `dev-svg-provider` 같은 내부 용어 제거는 페이지별 치환이 아니라 copy map으로 중앙 관리해야 한다.
- 초안 카드, 생성 준비도, 다운로드 목록은 approval/review/result page에서 재사용될 파생 데이터다.
- 이후 ZIP export, 마켓플레이스별 export, 초안 승인 플로우 고도화를 붙이기 쉽다.

Trade-off:

- 새 entity나 DB migration은 만들지 않는다.
- 대신 `lib/ux/*`와 `components/ux/*` 파일을 추가해 page component가 길어지는 문제를 줄인다.

## 3. System Architecture

```text
Next.js App Router Pages
  -> Existing domain services
      -> brands
      -> product-drafts
      -> approval-md
      -> image-generation
      -> md-workspace
  -> UX derivation services
      -> lib/ux/copy.ts
      -> lib/ux/onboarding.ts
      -> lib/ux/field-importance.ts
      -> lib/ux/draft-review.ts
      -> lib/ux/generation-readiness.ts
      -> lib/ux/downloads.ts
  -> UX components
      -> components/ux/OnboardingChecklist.tsx
      -> components/ux/ImportanceFieldLabel.tsx
      -> components/ux/ProductFormSection.tsx
      -> components/ux/BrandDefaultsPreview.tsx
      -> components/ux/DraftReviewCards.tsx
      -> components/ux/ReadinessBadge.tsx
      -> components/ux/FullDetailPreview.tsx
      -> components/ux/DownloadActions.tsx
```

### 3.1 Existing Flow Kept

| Existing Flow | Keep / Change |
|---|---|
| Brand CRUD | Keep, add preview UI |
| Product draft creation | Keep, reorganize form presentation |
| Approval Markdown generation | Keep as source of truth |
| Approval action | Keep, rename user-facing copy |
| Image generation job | Keep, add readiness label |
| Cut revision action | Keep |
| Asset route | Keep for image display and individual download links |

## 4. Data Design

No new persistent entity is required. The UX layer creates derived view models.

### 4.1 Field Importance

Extend `FieldMeta` in `lib/types.ts`.

```ts
export type FieldImportance = "required" | "recommended" | "optional" | "confirmation";

export interface FieldMeta {
  name: string;
  label: string;
  required: boolean;
  importance: FieldImportance;
  source: "brand" | "product" | "system";
  helpText: string;
}
```

Mapping rules:

| Importance | Badge | Form Behavior |
|---|---|---|
| required | 필수 | HTML `required`, cannot generate without it |
| recommended | 권장 | Optional technically, emphasized for quality |
| optional | 선택 | Can be blank, fallback applies |
| confirmation | 최종 확인 필요 | Can be blank for draft, must be checked before production use |

### 4.2 Onboarding Step View Model

File: `lib/ux/onboarding.ts`

```ts
export interface OnboardingStep {
  id: "brand" | "product" | "draft" | "image" | "download";
  title: string;
  description: string;
  status: "complete" | "current" | "locked";
  href: string;
  actionLabel: string;
}
```

Derivation:

| Step | Complete Condition |
|---|---|
| brand | active brand count > 0 |
| product | product draft count > 0 |
| draft | any latest draft status in `md_ready`, `approved`, `generating`, `generated`, `revision_requested` |
| image | latest job exists or latest draft status is `generated` |
| download | generated cuts with imageAssetId exist |

### 4.3 Draft Review Summary

File: `lib/ux/draft-review.ts`

```ts
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
    pointColor: string;
    requiredPhrases: string[];
    forbiddenPhrases: string[];
    notices: Array<{ title: string; content: string; source: "product" | "brand" | "system" }>;
  };
  confirmationNeeded: string[];
  readiness: GenerationReadiness;
  cuts: DraftCutCard[];
}

export interface DraftCutCard {
  cutNumber: number;
  title: string;
  purpose: string;
  headline: string;
  subcopy: string;
  visualDirection: string;
  confirmationNeeded: string[];
}
```

Source priority:

1. `ApprovalMarkdownVersion.content` for cut titles and edited copy.
2. `ApprovalMarkdownVersion.generatedFrom` snapshot for product/brand values.
3. Current `ProductDraft` and `BrandProfile` as fallback for live assets and status.

This avoids the mismatch risk where a user edits the Markdown and the card UI still shows stale generated snapshot data.

### 4.4 Generation Readiness

File: `lib/ux/generation-readiness.ts`

```ts
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
```

Rules:

| Condition | Result |
|---|---|
| `OPENAI_API_KEY` absent or job provider is `dev-svg-provider` | `mode = test`, `productionReady = false` |
| `OPENAI_API_KEY` present and provider is OpenAI model | `mode = ai`, `productionReady = true` if product photo exists |
| product photo missing | warning: `상품 사진이 없어 콘셉트 초안으로 생성되었습니다.` |
| logo missing | warning: `로고가 없어 텍스트 브랜드명 기준으로 생성됩니다.` |

### 4.5 Download View Model

File: `lib/ux/downloads.ts`

```ts
export interface DownloadableCut {
  cutId: string;
  cutNumber: number;
  title: string;
  assetId: string;
  fileName: string;
  href: string;
}
```

Behavior:

- Individual download uses `/api/assets/{assetId}` with an `<a download>`.
- Whole download uses a small client component that sequentially triggers each individual cut download.
- ZIP is explicitly excluded.

## 5. Copy System

File: `lib/ux/copy.ts`

```ts
export const userFacingTerms = {
  approvalMarkdown: "상세페이지 초안",
  rawMarkdown: "고급 편집",
  approveDraft: "이 초안으로 이미지 생성 준비",
  generateImage: "이미지 생성",
  testImage: "테스트 이미지",
  aiImage: "AI 생성 이미지",
  provider: "생성 방식"
} as const;
```

Page-level replacement rules:

| Page | Replace |
|---|---|
| `/detail-pages/[id]/approval` | `승인용 MD`, `Markdown`, `MD 승인`, `MD 재생성` |
| `/detail-pages/[id]/review` | `Provider`, `dev-svg-provider`, `목업 이미지` |
| `/detail-pages/new` | `승인용 MD 생성` |
| `/detail-pages` | `MD 확인`, `이미지 작업` internal labels |
| Dashboard | recent table action names |

Internal service and type names may remain as-is to avoid unnecessary code churn.

## 6. Component Design

### 6.1 `OnboardingChecklist`

Path: `components/ux/OnboardingChecklist.tsx`

Props:

```ts
type Props = {
  steps: OnboardingStep[];
};
```

UI:

- 5 compact horizontal/vertical steps.
- Current step has primary CTA.
- Locked steps show why unavailable.
- Mobile stacks into one column.

### 6.2 `ImportanceFieldLabel`

Path: `components/ux/ImportanceFieldLabel.tsx`

Replaces or wraps existing `FieldLabel`.

Props:

```ts
type Props = {
  field: FieldMeta;
};
```

Badge class mapping:

| Importance | Class |
|---|---|
| required | `badge` |
| recommended | `badge recommended` |
| optional | `badge optional` |
| confirmation | `badge warning` |

### 6.3 `ProductFormSection`

Path: `components/ux/ProductFormSection.tsx`

Purpose:

- Group fields into stable sections without a full wizard.
- Keep standard form submission.
- Use semantic `fieldset` and `legend`.

Sections:

| Section | Fields |
|---|---|
| 기본 정보 | brandProfileId, productName, category, cutCount, salesChannel |
| 사진 | photos |
| 판매 포인트 | targetCustomer, sellingPoints, facts |
| 안내사항 | shippingNotice, returnExchangeNotice, customNotices |
| 고급 설정 | requiredPhrases, forbiddenPhrases |

### 6.4 `BrandDefaultsPreview`

Path: `components/ux/BrandDefaultsPreview.tsx`

Server-rendered fallback:

- If no client interactivity, show all registered brands in compact cards or the currently first selectable brand.

Client-enhanced behavior:

- Optional later enhancement can update preview on brand select.
- MVP Design allows server-rendered static preview by selected/default brand to avoid JS dependency.

Content:

- Logo status.
- Brand name.
- Point/sub color swatches.
- Tone/channel.
- Shipping/return notices.
- Required/forbidden phrase summary.

### 6.5 `DraftReviewCards`

Path: `components/ux/DraftReviewCards.tsx`

Composed of:

- Product summary panel.
- Brand applied panel.
- Confirmation-needed panel.
- Cut card list.
- Readiness panel.

This component must not mutate data. Save/approve actions stay in the page.

### 6.6 `AdvancedMarkdownEditor`

Path: `components/ux/AdvancedMarkdownEditor.tsx`

Purpose:

- Keep raw Markdown editing available.
- Hide it under a `details` or tab-like section labeled `고급 편집`.
- Existing `saveApprovalMarkdownAction` continues to submit the form.

Progressive enhancement:

- Use `<details>` for no-JS compatibility.
- Avoid client-only tabs for the first implementation unless needed.

### 6.7 `ReadinessBadge`

Path: `components/ux/ReadinessBadge.tsx`

Shows:

- `테스트 이미지` or `AI 생성 이미지`.
- Production readiness.
- Warnings.

Usage:

- Approval page side panel.
- Review page job summary.
- Generated cut cards if helpful.

### 6.8 `FullDetailPreview`

Path: `components/ux/FullDetailPreview.tsx`

Purpose:

- Show all generated cuts in one vertical mobile-detail-page preview.
- Uses existing asset route images.
- Not a separate export format.

Layout:

```text
Preview container
  cut-01 image
  cut-02 image
  cut-03 image
  ...
```

### 6.9 `DownloadActions`

Path: `components/ux/DownloadActions.tsx`

Client component because whole download triggers multiple files.

Props:

```ts
type Props = {
  cuts: DownloadableCut[];
};
```

Behavior:

- Individual links can be rendered server-side.
- `전체 다운로드` loops through `cuts` and clicks temporary anchors with `download`.
- Shows a small note if the browser blocks multiple downloads.

## 7. Page Design

### 7.1 Dashboard `/`

Changes:

- Add `OnboardingChecklist` above summary stats.
- Primary CTA depends on current step.
- Recent table action labels:
  - `초안 확인`
  - `이미지 생성`
  - `결과 보기`

Data:

```ts
const steps = buildOnboardingSteps({ brands, drafts, jobs, cuts });
```

### 7.2 Brands `/brands`

Changes:

- Registered brand cards show visual preview:
  - color swatches instead of only hex badge
  - logo preview if uploaded
  - notice preview
- Edit details can remain, but summary should expose `수정` more clearly.

No domain service changes required.

### 7.3 New Detail Page `/detail-pages/new`

Changes:

- Use `ProductFormSection`.
- Use `ImportanceFieldLabel`.
- Add `BrandDefaultsPreview` side panel.
- Button text: `상세페이지 초안 만들기`.
- Busy text: `상세페이지 초안 생성 중입니다.`

Form still posts to `createProductDraftAction`.

### 7.4 Draft Review `/detail-pages/[id]/approval`

Rename page title: `상세페이지 초안`.

Layout:

```text
Header
  title: 상세페이지 초안
  action: 초안 다시 만들기

Main grid
  Left: DraftReviewCards
  Right: next action panel
    - readiness
    - uploaded logo/photo reference preview
    - approve draft action
    - generate image action

Advanced section
  AdvancedMarkdownEditor
```

Actions:

| Current | New User Copy |
|---|---|
| MD 재생성 | 초안 다시 만들기 |
| 저장 | 고급 편집 저장 |
| MD 승인 | 초안 승인 |
| AI 이미지 생성 / 목업 이미지 생성 | 이미지 생성 |

Important:

- Existing route path can remain `/approval` to avoid route churn.
- User-facing navigation and links should say `초안 확인`.

### 7.5 Review `/detail-pages/[id]/review`

Changes:

- Job summary uses `ReadinessBadge`.
- Remove visible `Provider` value from normal user UI.
- Add `FullDetailPreview` before cut grid or as top section.
- Add `DownloadActions` for all cuts.
- Each cut card gets individual download link.

Warnings:

- Test image warning if provider is `dev-svg-provider`.
- Product photo missing warning if `qa.productMatchesReference` is false.

### 7.6 Results `/detail-pages`

Changes:

- Add status filter UI.
- Use query param `?status=generated` for server-rendered filtering.
- Labels:
  - `전체`
  - `초안 작성`
  - `초안 확인`
  - `이미지 생성 완료`
  - `수정 요청`

Implementation:

```ts
const status = searchParams.status;
const filteredRows = filterResultRows(rows, status);
```

### 7.7 Memory `/md-workspace`

Changes:

- Add example prompts/sections above editor:
  - 브랜드 말투
  - 자주 쓰는 금지 표현
  - 배송 안내 기본 문구
  - 반품/교환 기본 문구
  - 상세페이지에서 피하고 싶은 표현

No storage change.

## 8. Service Design

### 8.1 `lib/ux/draft-review.ts`

Responsibilities:

- Parse cut headings from Markdown.
- Extract basic cut fields.
- Build confirmation-needed list.
- Merge current draft/brand/asset status.

Parser rules:

| Markdown Pattern | Field |
|---|---|
| `### Cut NN. Title` | cutNumber, title |
| `- 목적:` | purpose |
| `- 헤드라인:` | headline |
| `- 서브카피:` | subcopy |
| `- 확인 필요:` | confirmationNeeded |

Fallbacks:

- Missing headline: product name.
- Missing subcopy: `확인 필요`.
- Missing purpose: cut title.
- Missing cuts: create placeholder cards from `draft.cutCount`.

### 8.2 `lib/ux/downloads.ts`

Responsibilities:

- Convert generated cuts and assets into `DownloadableCut[]`.
- Generate predictable file names.

File naming:

```text
{safeProductName}-cut-{NN}.png
```

If original mime type is SVG:

```text
{safeProductName}-cut-{NN}.svg
```

### 8.3 `lib/ux/result-filters.ts`

Responsibilities:

- Map draft/job statuses to user-facing filter groups.

Mapping:

| Filter | Draft/Job Condition |
|---|---|
| draft | draft.status = `draft` |
| review | draft.status in `md_ready`, `approved` |
| generated | draft.status = `generated` or latestJob.status = `succeeded` |
| revision | draft.status = `revision_requested` or any cut.status = `needs_revision` |

### 8.4 `lib/ux/copy.ts`

Responsibilities:

- Centralize user-facing labels.
- Avoid inconsistent terminology across pages.

No runtime translation framework is needed.

## 9. Styling Design

Existing `app/globals.css` remains the styling entry point.

New CSS groups:

| Class Prefix | Purpose |
|---|---|
| `.checklist*` | dashboard onboarding |
| `.formSection*` | product form fieldsets |
| `.brandPreview*` | brand default preview |
| `.draftReview*` | summary and cut cards |
| `.readiness*` | test/AI image label |
| `.fullPreview*` | full detail-page preview |
| `.download*` | download action row |
| `.filterBar*` | results status filters |

Design constraints:

- No nested cards inside cards.
- Cards are only repeated items or framed tools.
- Keep page sections unframed where possible.
- Use 8px radius or less unless existing design token already differs.
- Mobile layout must stack without horizontal scrolling.

## 10. Accessibility

| Element | Requirement |
|---|---|
| Checklist | Use ordered list or semantic list with current step text. |
| Status badges | Do not rely on color only. Text label required. |
| Advanced editor | `<details><summary>고급 편집</summary>` for keyboard support. |
| Downloads | Buttons/links must have asset-specific accessible labels. |
| Filter bar | Active filter must be textually indicated. |
| Full preview | Each image gets meaningful alt text: `상품명 Cut NN 제목`. |

## 11. Test Plan

| Layer | Test |
|---|---|
| Unit | `buildOnboardingSteps`, `buildDraftReviewSummary`, `buildGenerationReadiness`, `buildDownloadableCuts`, result status filter |
| UI static | User-facing pages do not show `승인용 MD`, `Provider`, `dev-svg-provider` in normal view |
| UI flow | Brand absent dashboard CTA goes to `/brands`; brand present CTA goes to `/detail-pages/new` |
| Draft review | Edited Markdown cut headings appear in card UI |
| Review/download | Individual cut download hrefs exist; whole download button receives all generated cuts |
| Regression | Existing server actions still submit: create draft, save advanced edit, approve, generate, save revision |

## 12. Implementation Guide

### 12.1 Module Map

| Module | Files/Areas | Responsibility |
|---|---|---|
| module-1-ux-foundation | `lib/ux/copy.ts`, `lib/ux/onboarding.ts`, `components/ux/OnboardingChecklist.tsx`, `app/page.tsx` | terminology and dashboard checklist |
| module-2-form-ux | `lib/types.ts`, `lib/field-metadata.ts`, `components/ux/ImportanceFieldLabel.tsx`, `components/ux/ProductFormSection.tsx`, `components/ux/BrandDefaultsPreview.tsx`, `app/detail-pages/new/page.tsx` | field importance and product form sections |
| module-3-draft-review | `lib/ux/draft-review.ts`, `components/ux/DraftReviewCards.tsx`, `components/ux/AdvancedMarkdownEditor.tsx`, `app/detail-pages/[id]/approval/page.tsx` | card-based 상세페이지 초안 review |
| module-4-readiness-download | `lib/ux/generation-readiness.ts`, `lib/ux/downloads.ts`, `components/ux/ReadinessBadge.tsx`, `components/ux/FullDetailPreview.tsx`, `components/ux/DownloadActions.tsx`, `app/detail-pages/[id]/review/page.tsx` | test/AI readiness, full preview, downloads |
| module-5-results-memory-brand-polish | `lib/ux/result-filters.ts`, `app/detail-pages/page.tsx`, `app/md-workspace/page.tsx`, `app/brands/page.tsx` | status filters, memory examples, brand preview |
| module-6-styles-tests | `app/globals.css`, unit tests or lightweight verification scripts | responsive styles and regression verification |

### 12.2 Implementation Order

1. Add UX copy map and field importance types.
2. Add dashboard onboarding derivation and component.
3. Refactor product form into semantic sections.
4. Add brand defaults preview.
5. Add draft review summary builder and card UI.
6. Move raw Markdown editor into advanced edit section.
7. Add readiness derivation and replace provider UI.
8. Add full preview and download actions.
9. Add result filters.
10. Add memory examples and brand preview polish.
11. Run typecheck/build.

### 12.3 Session Guide

Recommended incremental sessions:

| Session | Scope | Deliverable |
|---|---|---|
| S1 | `module-1-ux-foundation,module-2-form-ux` | Dashboard checklist, terminology foundation, product form sections |
| S2 | `module-3-draft-review` | 상세페이지 초안 card review and advanced MD editor |
| S3 | `module-4-readiness-download` | readiness labels, full preview, individual/whole download |
| S4 | `module-5-results-memory-brand-polish` | results filters, memory examples, brand preview |
| S5 | `module-6-styles-tests` | responsive CSS and verification |

Future `/pdca do` usage:

```text
$pdca do detail-page-web-tool-ux-improvements --scope module-1-ux-foundation,module-2-form-ux
$pdca do detail-page-web-tool-ux-improvements --scope module-3-draft-review
$pdca do detail-page-web-tool-ux-improvements --scope module-4-readiness-download
```

## 13. Design Anchor Note

This feature is UI-heavy. Before implementation, it would be useful to create and capture a design anchor for:

- Dashboard checklist
- 상세페이지 초안 review page
- Image review with full preview and download actions

Recommended follow-up if the design anchor tool is available:

```text
/design-anchor capture detail-page-web-tool-ux-improvements
```

## 14. Open Questions

| Question | Proposed Default |
|---|---|
| Should `/approval` route be renamed? | Keep route path, change only user-facing labels. |
| Should whole download use ZIP? | No, use sequential individual downloads in this iteration. |
| Should the draft summary persist? | No, derive from Markdown and snapshot for this iteration. |
| Should product form become a multi-step wizard? | No, use sectioned single form to preserve speed and no-JS submit. |
| Should test image warning block downloads? | No, allow download but show clear readiness warning. |
