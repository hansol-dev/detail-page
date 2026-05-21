# Output Template

Use this structure for the web-based ecommerce detail page tool.

## Web Approval MD First Rule

Initial planning must produce only a Markdown approval draft stored as an `ApprovalMarkdownVersion` record.

The user reviews and revises the Markdown draft in the web approval screen. Do not create a product JSON file during the initial plan/approval phase.

Generated images are stored as assets and connected to an `ImageGenerationJob` and `GeneratedCut` records. The database records, not an `outputs/` folder, are the source of truth for review and revision.

## Cut Count Policy

- If the user specifies a cut count, use that count.
- If the user does not specify a cut count, recommend based on product complexity, photo coverage, sales channel, and production intent.
- Default recommendation for a normal product detail page is 6 cuts.
- Write `recommendedCount` in the Markdown draft.
- If the user asks to change the cut count before production, regenerate the Markdown cut plan before image production.
- After production, record the produced cut count in the image generation job and generated cut records.

## Approval Rule

Do not create final cut images until the user approves the Markdown approval draft.

The Markdown approval draft must include:

1. Product Summary
2. Facts
3. Assumptions
4. Confirmation Needed
5. Product Photo Analysis and Placement
6. Target Customer and Selling Strategy
7. Style Template Selection
8. Cut Plan
9. ASCII Wireframes
10. Copy and Compliance Notes
11. Question Log
12. Approval Gate

## Approval Gate Format

```markdown
## Approval Gate

Status: Draft

A. 승인 - 이 MD 기준으로 상세페이지 이미지 제작 시작
B. 수정 - 이 MD 기준으로 요청사항 반영 후 MD 갱신
C. 중단 - 이미지 제작하지 않음
```

## Markdown Draft Skeleton

```markdown
# [상품명] 상세페이지 승인용 기획안

Status: Draft
recommendedCount: 6
actualPlannedCuts: 6

> 이 문서는 이미지 제작 전 승인용 초안입니다. JSON은 상세페이지 이미지 제작이 끝난 뒤 결과물 수정용으로만 생성합니다.

## 1. Product Summary

| 항목 | 내용 |
|---|---|
| 상품명 |  |
| 카테고리 |  |
| 입력 폴더 |  |
| 상품 사진 |  |
| 추천 컷 수 |  |

## 2. Facts

## 3. Assumptions

## 4. Confirmation Needed

## 5. Product Photo Analysis and Placement

## 6. Target Customer and Selling Strategy

## 7. Style Template Selection

## 8. Cut Plan

## 9. ASCII Wireframes

## 10. Copy and Compliance Notes

## 11. Question Log

## 12. Approval Gate

Status: Draft

A. 승인 - 이 MD 기준으로 상세페이지 이미지 제작 시작
B. 수정 - 이 MD 기준으로 요청사항 반영 후 MD 갱신
C. 중단 - 이미지 제작하지 않음
```

## Post-production Revision Records

After production, revision state is stored in the web app data model:

- `ImageGenerationJob`: one image generation run.
- `GeneratedCut`: one produced cut image and its approval/revision status.
- `Asset`: generated image or thumbnail file.
- `ApprovalMarkdownVersion`: approved source Markdown for the run.

Do not require a separate revision JSON file for the web tool.

## ASCII Layout Rule

ASCII is only a planning blueprint. Do not output ASCII boxes, placeholder labels, or empty text-safe zones as final images. Final images must be real sales-page sections with product visuals, information blocks, and approved Korean copy rendered inside the image.

## Image Production Rule

When the user chooses image generation, convert the approved Markdown cut plan into production prompts internally.

- Generate one separate image per cut.
- Match the approved cut count exactly.
- Use the product photo as the visual source if provided.
- Render approved Korean headline, subcopy, labels, guide text, and CTA inside the image.
- Do not leave blank text-safe areas, placeholder bars, or unlabeled mockup blocks.
- Use mobile-readable type, strong contrast, and ecommerce hierarchy.
- If Korean text is missing, broken, unreadable, translated, or different from approved copy, regenerate before delivery unless the user explicitly asks for post-processing.
- If product photos or verified sale facts are missing, label the output as a sales draft and avoid fabricated claims.
