# {{product.displayName}} 상세페이지 승인용 기획안

Status: {{approval.status}}  
Product slug: `{{product.slug}}`  
Input folder: `{{product.inputFolder}}`  
recommendedCount: {{recommendedCutCount}}  
actualPlannedCuts: {{actualPlannedCuts}}

> 이 문서는 이미지 제작 전 승인용 초안입니다. 사용자는 이 MD를 기준으로 수정 요청하거나 승인합니다. JSON은 상세페이지 이미지 제작이 끝난 뒤 결과물 수정용으로만 생성합니다.

## 1. Product Summary

| 항목 | 내용 |
|---|---|
| 상품명 | {{product.displayName}} |
| 카테고리 | {{product.category}} |
| 입력 폴더 | {{product.inputFolder}} |
| 판매 채널 | {{salesChannel}} |
| 상품 사진 | {{photoSummary}} |
| 추천 컷 수 | {{recommendedCutCount}} |
| 승인 상태 | {{approval.status}} |

## 2. Facts

{{facts}}

## 3. Assumptions

{{assumptions}}

## 4. Confirmation Needed

{{confirmationNeeded}}

## 5. Product Photo Analysis and Placement

| 이미지 | 요약 | 품질 상태 | 강점 | 주의점 | 추천 컷 용도 | 배치/재생성 추천 |
|---|---|---|---|---|---|---|
{{photoRows}}

## 6. Target Customer and Selling Strategy

{{targetCustomer}}

## 7. Style Template Selection

{{style}}

## 8. Cut Plan

{{cutPlan}}

## 9. ASCII Wireframes

{{wireframes}}

## 10. Copy and Compliance Notes

{{complianceNotes}}

## 11. Question Log

| Time | Type | Question | Answer | Applied To |
|---|---|---|---|---|
{{questionLogRows}}

## 12. Approval Gate

Status: {{approval.status}}

다음 중 하나로 답해주세요.

A. 승인 - 이 MD 기준으로 상세페이지 이미지 제작 시작  
B. 수정 - 이 MD 기준으로 요청사항 반영 후 MD 갱신  
C. 중단 - 이미지 제작하지 않음

