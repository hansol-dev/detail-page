# Detail Page Generator Tool Plan

Feature: detail-page-generator-tool  
Phase: Plan  
Created: 2026-05-19  
Primary Skill: `skills/ecommerce-detail-page`

## 1. 목표

상품 사진 폴더와 상품명을 기준으로 전자상거래 상세페이지 제작 흐름을 반복 가능하게 만든다.

첫 산출물은 반드시 승인용 Markdown 파일 하나만 생성한다. 사용자는 이 MD를 보고 문구, 컷 수, 구성, 확인 필요 항목을 수정 요청한다. 상세페이지 이미지가 모두 제작된 뒤에만 결과물 수정용 JSON을 생성한다.

## 2. 확정 프로세스

```text
사용자 요청
  -> 상품 폴더 탐색
  -> 사진 및 facts.md 확인
  -> 필요한 질문을 한 번에 하나씩 진행
  -> 승인용 MD 생성
  -> 사용자가 MD 기준으로 수정 요청 또는 승인
  -> 승인된 MD 기준으로 상세페이지 컷 제작
  -> 리뷰 HTML 생성
  -> 제작 결과 기반 revision JSON 생성
  -> 사용자가 JSON 또는 자연어로 결과물 수정 요청
```

## 3. 산출물 규칙

| 산출물 | 생성 시점 | 경로 | 용도 |
|---|---|---|---|
| 승인용 MD | 이미지 제작 전 | `outputs/{product}/plan/{product}.detail-page.md` | 최초 기획, 컷 구성, 카피, 확인 필요 항목 승인 |
| 상세페이지 컷 이미지 | MD 승인 후 | `outputs/{product}/cuts/cut-XX.png` | 실제 상세페이지 결과물 |
| 리뷰 HTML | 컷 이미지 제작 후 | `outputs/{product}/review/index.html` | 결과물 순서 확인 및 다운로드 |
| revision JSON | 컷 이미지 제작 후 | `outputs/{product}/revision/{product}.revision.json` | 이미 제작된 결과물을 보고 후속 수정 요청을 구조화 |

금지 사항:

- 최초 기획 단계에서 `outputs/{product}/plan/{product}.detail-page.json`을 만들지 않는다.
- JSON을 최초 상세페이지 제작의 source of truth로 쓰지 않는다.
- 이미지 제작 전 컷 수 변경은 JSON 수정이 아니라 MD 수정 요청으로 처리한다.

## 4. 상품 폴더 규칙

권장 구조:

```text
products/
  {product-folder}/
    facts.md
    01.jpg
    02.jpg
    03.jpg
```

`facts.md`가 있으면 검증된 상품 정보로 사용한다. 없거나 부족한 정보는 MD의 `Confirmation Needed`에 남긴다.

지원 이미지 확장자:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

## 5. 질문 규칙

상세페이지 제작 중 필요한 정보가 있으면 질문할 수 있다. 단, 질문은 한 번에 하나만 한다.

질문이 필요한 대표 상황:

- 상품 폴더를 찾지 못했을 때
- 사진이 부족하거나 최종 제작 품질에 부적합할 때
- 카테고리, 원산지, 용량, 구성, 보관법 같은 판매 필수 정보가 불명확할 때
- 인증, 기능성, 수치, 리뷰, 순위처럼 증빙 없이는 사용할 수 없는 표현이 있을 때
- 컷 수나 스타일이 사용자의 의도와 다를 가능성이 높을 때

질문하지 않고 진행 가능한 정보는 MD에 `Assumption` 또는 `Confirmation Needed`로 표시한다.

## 6. 컷 수 정책

기본 추천 컷 수는 6컷이다.

MD에는 `recommendedCount`를 반드시 적는다. 사용자가 이 상품의 컷 수를 바꾸고 싶으면 MD 기준으로 “4컷으로 줄여줘”처럼 요청한다. 그러면 컷 계획 전체를 새 컷 수에 맞게 다시 작성한 MD로 갱신한다.

중요: 컷 수가 바뀌면 각 컷의 목적, 문구, 이미지 구성도 함께 다시 맞춰야 한다. 제작 전에는 JSON을 수정해서 컷 수를 바꾸지 않는다.

## 7. 승인용 MD 요구사항

승인용 MD에는 다음 섹션이 있어야 한다.

| 섹션 | 목적 |
|---|---|
| Product Summary | 상품명, 폴더, 사진 수, 추천 컷 수 |
| Facts | 사진 또는 facts.md에서 확인된 사실 |
| Assumptions | 상품명/카테고리 기반 추정 |
| Confirmation Needed | 사용자가 확인해야 할 정보 |
| Photo Analysis | 사진별 사용 가능성, 강점, 주의점 |
| Target Customer | 예상 고객과 구매 동기 |
| Style Template | 상세페이지 스타일 방향 |
| Cut Plan | 컷별 목적, 헤드라인, 서브카피, 구성 |
| ASCII Wireframes | 컷별 배치 초안 |
| Compliance Notes | 과장/증빙/식품 표시 관련 주의 |
| Question Log | 질문과 답변 기록 |
| Approval Gate | 승인, 수정, 중단 선택 |

## 8. 이미지 제작 조건

다음 조건을 만족하기 전에는 상세페이지 이미지를 만들지 않는다.

- 승인용 MD가 존재한다.
- 사용자가 MD 기준 제작을 승인했다.
- 컷 수가 MD 안에서 확정되어 있다.
- 확인 필요 항목이 최종 이미지에 넣어도 되는 방식으로 정리되어 있다.
- 상품 사진이 최종 제작에 충분하거나, 부족한 경우 초안/컨셉 결과물임을 명시했다.

## 9. 제작 후 revision JSON

상세페이지 컷 이미지가 생성된 뒤에는 결과물 기준으로 revision JSON을 만든다.

경로:

```text
outputs/{product}/revision/{product}.revision.json
```

이 JSON에는 다음을 기록한다.

- 원본 승인 MD 경로
- 제작된 컷 이미지 경로
- 컷별 승인 문구
- 컷별 상태
- 발견된 QA 이슈
- 사용자의 후속 수정 요청

revision JSON은 “처음 만들 상세페이지의 설계도”가 아니라 “이미 만든 결과물을 어떻게 고칠지”를 기록하는 수정용 파일이다.

## 10. 성공 기준

| ID | 기준 |
|---|---|
| SC-01 | 상품 요청 시 먼저 승인용 MD만 생성된다. |
| SC-02 | 제작 전 `plan/*.detail-page.json`이 생성되지 않는다. |
| SC-03 | 컷 수 변경은 MD 컷 계획 재작성으로 처리된다. |
| SC-04 | 사용자가 MD를 승인해야만 이미지 제작이 시작된다. |
| SC-05 | 이미지 제작 후에만 `revision/*.revision.json`이 생성된다. |
| SC-06 | JSON은 제작 결과물 수정용으로만 사용된다. |

