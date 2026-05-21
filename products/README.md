# Product Folder Guide

이 폴더는 상세페이지 제작용 상품 입력 폴더를 두는 곳입니다.

## 권장 구조

```text
products/
  olive-oil/
    photos/
      01-front.jpg
      02-detail.jpg
      03-package.jpg
    facts.md
```

## 최소 입력

사진만 있어도 시작할 수 있습니다.

```text
products/
  olive-oil/
    photos/
      01.jpg
      02.jpg
```

사진만 있는 경우, 상세페이지 MD에는 검증되지 않은 내용이 `확인 필요`로 표시됩니다.

## facts.md 예시

```markdown
# Product Facts

- Product name: 올리브오일
- Brand:
- Category: 식품
- Volume/size:
- Origin:
- Ingredients:
- Key selling points:
- Cautions:
- Sales channel:
```

## 작업 흐름

1. 상품별 폴더를 만듭니다.
2. `photos/` 안에 상품 사진을 넣습니다.
3. 필요하면 `facts.md`에 확인된 상품 정보를 적습니다.
4. `올리브오일 상세 페이지 만들어줘`처럼 요청합니다.
5. 먼저 `outputs/{product}/plan/{product}.detail-page.md`가 생성됩니다.
6. MD를 승인한 뒤에만 상세페이지 컷 이미지 제작을 진행합니다.

## 기존 폴더 호환

현재 작업 폴더의 기존 상품 폴더도 입력으로 사용할 수 있습니다.

```text
01_olive-oil/
02_bubai-spread/
```

장기적으로는 `products/{product}/photos/` 구조를 권장합니다.
