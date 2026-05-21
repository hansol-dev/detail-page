import Link from "next/link";
import { createProductDraftAction } from "@/app/actions";
import { BrandDefaultsPreview } from "@/components/ux/BrandDefaultsPreview";
import { DynamicNoticeFields } from "@/components/ux/DynamicNoticeFields";
import { ImportanceFieldLabel } from "@/components/ux/ImportanceFieldLabel";
import { ProductFormSection } from "@/components/ux/ProductFormSection";
import { ProductPhotoUploadInput } from "@/components/ux/ProductPhotoUploadInput";
import { productFieldMeta } from "@/lib/field-metadata";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { getCurrentUserId, readDb } from "@/lib/store";
import { listBrands } from "@/lib/services/brands";
import { userFacingTerms } from "@/lib/ux/copy";

export const dynamic = "force-dynamic";

function meta(name: string) {
  const field = productFieldMeta.find((item) => item.name === name);
  if (!field) throw new Error(`Missing field meta: ${name}`);
  return field;
}

export default async function NewDetailPage() {
  const userId = await getCurrentUserId();
  const db = await readDb();
  const brands = await listBrands(userId);
  const disabled = !brands.length;

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>상세페이지 생성</h1>
          <p>필수값부터 입력하고, 선택값은 브랜드 기본값이나 확인 필요 항목으로 처리합니다.</p>
        </div>
        <Link className="button" href="/brands">
          브랜드 관리
        </Link>
      </header>

      <section className="grid two">
        <form
          className="panel formGrid"
          action={createProductDraftAction}
          data-alert="상품 정보를 저장하고 상세페이지 초안을 만듭니다."
          data-busy="상세페이지 초안 생성 중입니다."
        >
          <h2 className="full">상품 입력</h2>
          {disabled ? <p className="full danger">먼저 브랜드를 1개 이상 등록해야 합니다.</p> : null}

          <ProductFormSection title="기본 정보" description="초안 생성에 꼭 필요한 값입니다.">
            <label className="full">
              <ImportanceFieldLabel field={meta("brandProfileId")} />
              <select name="brandProfileId" required disabled={disabled}>
                <option value="">브랜드 선택</option>
                {brands.map((brand) => (
                  <option value={brand.id} key={brand.id}>
                    {brand.brandName} ({brand.pointColor})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <ImportanceFieldLabel field={meta("productName")} />
              <input name="productName" required disabled={disabled} />
            </label>
            <label>
              <ImportanceFieldLabel field={meta("category")} />
              <select name="category" required disabled={disabled}>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <ImportanceFieldLabel field={meta("cutCount")} />
              <select name="cutCount" defaultValue="6" disabled={disabled}>
                <option value="3">3컷 초간단형</option>
                <option value="6">6컷 간단형</option>
                <option value="12">12컷 기본형</option>
                <option value="15">15컷 설명형</option>
              </select>
            </label>
            <label>
              <ImportanceFieldLabel field={meta("salesChannel")} />
              <select name="salesChannel" disabled={disabled}>
                <option value="">브랜드 기본값 사용</option>
                <option>채널 무관 모바일 상세페이지</option>
                <option>네이버 스마트스토어</option>
                <option>쿠팡</option>
                <option>자사몰</option>
              </select>
            </label>
          </ProductFormSection>

          <ProductFormSection title="사진" description="상품 사진이 있으면 결과 품질이 좋아집니다.">
            <div className="full formField">
              <ImportanceFieldLabel field={meta("photos")} />
              <ProductPhotoUploadInput disabled={disabled} />
            </div>
            <label className="full checkField">
              <input name="thumbnailRequested" type="checkbox" disabled={disabled} />
              <span>
                <strong>상품 썸네일도 생성</strong>
                <small>상세페이지 이미지 생성 단계에서 대표 썸네일 1장을 함께 만듭니다.</small>
              </span>
            </label>
          </ProductFormSection>

          <ProductFormSection title="판매 포인트" description="비워두면 초안에서 확인 필요 항목으로 표시합니다.">
            <label className="full">
              <ImportanceFieldLabel field={meta("sellingPoints")} />
              <textarea name="sellingPoints" disabled={disabled} />
            </label>
            <label className="full">
              <ImportanceFieldLabel field={meta("facts")} />
              <textarea name="facts" disabled={disabled} />
            </label>
            <label className="full">
              <ImportanceFieldLabel field={meta("targetCustomer")} />
              <input name="targetCustomer" disabled={disabled} />
            </label>
          </ProductFormSection>

          <ProductFormSection title="안내사항" description="상품별 입력이 있으면 브랜드 기본값보다 우선 적용합니다.">
            <label className="full">
              <ImportanceFieldLabel field={meta("shippingNotice")} />
              <textarea name="shippingNotice" disabled={disabled} />
            </label>
            <label className="full">
              <ImportanceFieldLabel field={meta("returnExchangeNotice")} />
              <textarea name="returnExchangeNotice" disabled={disabled} />
            </label>
            <div className="full">
              <DynamicNoticeFields disabled={disabled} />
            </div>
          </ProductFormSection>

          <ProductFormSection title="고급 설정" description="꼭 넣거나 피해야 하는 문구가 있을 때만 사용하세요.">
            <label className="full">
              <span className="labelLine">
                <span>상품별 브랜드 카피</span>
                <span className="badge optional">선택</span>
              </span>
              <textarea name="requiredPhrases" disabled={disabled} />
            </label>
            <label className="full">
              <span className="labelLine">
                <span>상품별 금지 문구</span>
                <span className="badge optional">선택</span>
              </span>
              <textarea name="forbiddenPhrases" disabled={disabled} />
            </label>
          </ProductFormSection>

          <div className="full">
            <button className="primary" type="submit" disabled={disabled}>
              {userFacingTerms.approvalMarkdown} 만들기
            </button>
          </div>
        </form>

        <div className="grid">
          <BrandDefaultsPreview brands={brands} assets={db.assets} />
        </div>
      </section>
    </>
  );
}
