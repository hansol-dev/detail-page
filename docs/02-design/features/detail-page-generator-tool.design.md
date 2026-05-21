# Detail Page Generator Tool Design

Feature: detail-page-generator-tool  
Phase: Design  
Created: 2026-05-19  
Upstream Plan: `docs/01-plan/features/detail-page-generator-tool.plan.md`  
Primary Skill: `skills/ecommerce-detail-page`

## 1. 설계 원칙

이 도구의 기준 문서는 최초에는 MD 하나다.

사용자는 MD를 읽고 자연어로 수정 요청한다. 상세페이지 이미지가 제작되기 전에는 상품별 JSON을 만들지 않는다. JSON은 제작이 끝난 뒤 결과물을 수정하기 위한 보조 파일로만 사용한다.

## 2. 시스템 흐름

```text
User request
  -> Resolve product folder
  -> Inspect photos and facts.md
  -> Ask one missing-info question when needed
  -> Write approval Markdown
  -> Wait for user revision or approval
  -> Produce cut images from approved Markdown
  -> Build review HTML
  -> Write post-production revision JSON
  -> Apply result revisions from JSON or user request
```

## 3. 역할 분리

| 역할 | 책임 |
|---|---|
| User | 상품 폴더와 사진 준비, MD 검토, 수정 요청, 제작 승인 |
| Codex Orchestrator | 폴더 탐색, 사진 분석, 질문, MD 작성, 제작 진행, 결과 JSON 생성 |
| `ecommerce-detail-page` skill | 상세페이지 기획 규칙, 사진 분석 기준, 카피/컴플라이언스 기준 제공 |
| Approval MD | 제작 전 유일한 기획 source of truth |
| Revision JSON | 제작 후 결과물 수정 요청을 구조화하는 보조 파일 |

## 4. 디렉터리 구조

```text
products/
  queens-tree-crunchy-peanut-butter/
    facts.md
    01.jpg
    02.jpg

outputs/
  queens-tree-crunchy-peanut-butter/
    plan/
      queens-tree-crunchy-peanut-butter.detail-page.md
    cuts/
      cut-01.png
      cut-02.png
    review/
      index.html
    revision/
      queens-tree-crunchy-peanut-butter.revision.json
```

`outputs/{product}/plan/{product}.detail-page.json`은 사용하지 않는다.

## 5. Product Context

작업 중 내부적으로 다루는 상품 컨텍스트는 다음 정보를 포함한다.

```json
{
  "displayName": "퀸즈트리 피넛버터 크런치",
  "slug": "queens-tree-crunchy-peanut-butter",
  "inputFolder": "products/03_코스트코 무가당 땅콩버터 피넛버터 퀸즈트리 크런치",
  "photoFiles": ["01.jpg", "02.jpg"],
  "factsFile": "facts.md",
  "recommendedCount": 6,
  "facts": [],
  "assumptions": [],
  "confirmationNeeded": [],
  "questionLog": []
}
```

이 컨텍스트는 MD 작성에 쓰는 작업 메모리이며, 상품별 JSON 파일로 저장하지 않는다.

## 6. Approval MD Writer

입력:

- 사용자 요청 상품명
- 탐색된 상품 폴더
- 이미지 파일 목록
- `facts.md`
- 사진에서 읽히는 라벨/영양성분/주의문구
- `skills/ecommerce-detail-page` 규칙

출력:

```text
outputs/{product}/plan/{product}.detail-page.md
```

필수 섹션:

1. Product Summary
2. Facts
3. Assumptions
4. Confirmation Needed
5. Photo Analysis
6. Target Customer
7. Style Template
8. Cut Plan
9. ASCII Wireframes
10. Compliance Notes
11. Question Log
12. Approval Gate

## 7. Cut Count Design

기본 추천값은 6컷이다.

MD에는 다음처럼 명시한다.

```markdown
recommendedCount: 6
actualPlannedCuts: 6
```

사용자가 컷 수를 바꾸면 기존 컷 배열을 억지로 줄이거나 늘리지 않는다. 새 컷 수에 맞춰 컷별 목적과 문구를 다시 설계한 MD를 재생성한다.

예:

```text
사용자: 이 상품은 4컷으로 줄여줘
도구: 4컷 기준으로 Cut Plan과 Wireframe을 다시 작성한 MD를 갱신
```

## 8. Approval Gate

MD 끝에는 다음 선택지가 있어야 한다.

```markdown
## Approval Gate

Status: Draft

A. 승인 - 이 MD 기준으로 상세페이지 이미지 제작 시작
B. 수정 - 아래 요청사항을 반영해서 MD 갱신
C. 중단 - 이미지 제작하지 않음
```

상태가 승인되기 전에는 `outputs/{product}/cuts/`를 만들지 않는다.

## 9. Image Production

제작 입력은 승인된 MD다.

제작 규칙:

- MD의 컷 수와 동일한 개수의 이미지를 만든다.
- 한 컷당 하나의 이미지 파일을 만든다.
- 상품 사진을 외형 기준으로 사용한다.
- 승인된 한국어 문구를 이미지 안에 직접 렌더링한다.
- 문구가 깨지거나 누락되면 실패로 보고 재생성한다.
- 제작 완료 후 리뷰 HTML을 만든다.

## 10. Post-production Revision JSON

이미지 제작이 끝난 뒤 다음 경로에 JSON을 만든다.

```text
outputs/{product}/revision/{product}.revision.json
```

구조:

```json
{
  "schemaVersion": "1.0",
  "product": {
    "displayName": "",
    "slug": "",
    "inputFolder": ""
  },
  "sourceApprovalMd": "outputs/{product}/plan/{product}.detail-page.md",
  "producedAt": null,
  "cuts": [
    {
      "id": "cut-01",
      "name": "",
      "imagePath": "outputs/{product}/cuts/cut-01.png",
      "approvedHeadline": "",
      "approvedSubcopy": "",
      "status": "produced",
      "revisionRequest": ""
    }
  ],
  "revisionRequests": [],
  "qa": {
    "textReadable": null,
    "koreanTextMatchesApprovedCopy": null,
    "productMatchesReference": null,
    "notes": []
  }
}
```

이 JSON을 수정하면 이미 제작된 컷에 대한 재생성/부분 수정 요청으로 해석한다. 최초 기획이나 제작 전 컷 수 변경에는 사용하지 않는다.

## 11. 테스트 기준

| 테스트 | 기대 결과 |
|---|---|
| 상품 상세페이지 요청 | 승인용 MD만 생성 |
| MD 승인 전 이미지 제작 요청 | 승인 요청 후 대기 |
| 제작 전 4컷 변경 요청 | 4컷 기준 MD 재작성 |
| 제작 전 JSON 파일 확인 | `plan/*.detail-page.json` 없음 |
| 제작 후 JSON 파일 확인 | `revision/*.revision.json` 생성 |
| revision JSON 수정 | 이미 제작된 결과물 수정 요청으로 처리 |

