import Link from "next/link";
import { updateProductDraftAction } from "@/app/actions";
import { BrandDefaultsPreview } from "@/components/ux/BrandDefaultsPreview";
import { DynamicNoticeFields } from "@/components/ux/DynamicNoticeFields";
import { ExistingProductPhotos } from "@/components/ux/ExistingProductPhotos";
import { ImportanceFieldLabel } from "@/components/ux/ImportanceFieldLabel";
import { ProductFormSection } from "@/components/ux/ProductFormSection";
import { ProductPhotoUploadInput } from "@/components/ux/ProductPhotoUploadInput";
import { productFieldMeta } from "@/lib/field-metadata";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { getCurrentUserId, readDb } from "@/lib/store";
import { listBrands } from "@/lib/services/brands";
import { getProductDraft } from "@/lib/services/product-drafts";
import { userFacingTerms } from "@/lib/ux/copy";

export const dynamic = "force-dynamic";

const salesChannelOptions = ["채널 무관 모바일 상세페이지", "네이버 스마트스토어", "쿠팡", "자사몰"];

function meta(name: string) {
  const field = productFieldMeta.find((item) => item.name === name);
  if (!field) throw new Error(`Missing field meta: ${name}`);
  return field;
}

export default async function EditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const db = await readDb();
  const brands = await listBrands(userId);
  const draft = await getProductDraft(userId, id);

  if (!draft) {
    return (
      <section className="panel">
        <h1>상품 초안을 찾을 수 없습니다.</h1>
      </section>
    );
  }

  const disabled = !brands.length;
  const currentPhotos = draft.photoAssetIds
    .map((assetId) => db.assets.find((asset) => asset.id === assetId && asset.userId === userId))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  const hasCustomSalesChannel = draft.salesChannel && !salesChannelOptions.includes(draft.salesChannel);

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>상품정보 수정</h1>
          <p>저장하면 수정한 상품정보와 메모리 기준으로 상세페이지 초안을 다시 만듭니다.</p>
        </div>
        <Link className="button" href={`/detail-pages/${draft.id}/approval`}>
          초안으로 돌아가기
        </Link>
      </header>

      <section className="grid two">
        <form
          className="panel formGrid"
          action={updateProductDraftAction}
          data-alert="상품정보를 저장하고 상세페이지 초안을 다시 만듭니다."
          data-busy="상품정보 저장 및 초안 생성 중입니다."
        >
          <input type="hidden" name="productDraftId" value={draft.id} />
          <h2 className="full">상품 입력</h2>
          {disabled ? <p className="full danger">먼저 브랜드를 1개 이상 등록해야 합니다.</p> : null}

          <ProductFormSection title="기본 정보" description="초안 생성에 꼭 필요한 값입니다.">
            <label className="full">
              <ImportanceFieldLabel field={meta("brandProfileId")} />
              <select name="brandProfileId" required disabled={disabled} defaultValue={draft.brandProfileId}>
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
              <input name="productName" required disabled={disabled} defaultValue={draft.productName} />
            </label>
            <label>
              <ImportanceFieldLabel field={meta("category")} />
              <select name="category" required disabled={disabled} defaultValue={draft.category}>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <ImportanceFieldLabel field={meta("cutCount")} />
              <select name="cutCount" defaultValue={String(draft.cutCount || 6)} disabled={disabled}>
                <option value="3">3컷 초간단형</option>
                <option value="6">6컷 간단형</option>
                <option value="12">12컷 기본형</option>
                <option value="15">15컷 설명형</option>
              </select>
            </label>
            <label>
              <ImportanceFieldLabel field={meta("salesChannel")} />
              <select name="salesChannel" disabled={disabled} defaultValue={draft.salesChannel ?? ""}>
                <option value="">브랜드 기본값 사용</option>
                {hasCustomSalesChannel ? <option value={draft.salesChannel ?? ""}>{draft.salesChannel}</option> : null}
                {salesChannelOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </ProductFormSection>

          <ProductFormSection title="사진" description="삭제할 사진은 X를 누르고, 새 사진은 아래에서 추가하세요.">
            <div className="full">
              <span className="labelLine">
                <span>저장된 상품 사진</span>
                <span className="badge optional">선택</span>
              </span>
              <ExistingProductPhotos assets={currentPhotos} disabled={disabled} />
            </div>
            <div className="full formField">
              <ImportanceFieldLabel field={meta("photos")} />
              <ProductPhotoUploadInput disabled={disabled} />
            </div>
            <label className="full checkField">
              <input name="thumbnailRequested" type="checkbox" defaultChecked={draft.thumbnailRequested} disabled={disabled} />
              <span>
                <strong>상품 썸네일도 생성</strong>
                <small>상세페이지 이미지 생성 단계에서 대표 썸네일 1장을 함께 만듭니다.</small>
              </span>
            </label>
          </ProductFormSection>

          <ProductFormSection title="판매 포인트" description="비워두면 초안에서 확인 필요 항목으로 표시합니다.">
            <label className="full">
              <ImportanceFieldLabel field={meta("sellingPoints")} />
              <textarea name="sellingPoints" disabled={disabled} defaultValue={draft.sellingPoints ?? ""} />
            </label>
            <label className="full">
              <ImportanceFieldLabel field={meta("facts")} />
              <textarea name="facts" disabled={disabled} defaultValue={draft.facts ?? ""} />
            </label>
            <label className="full">
              <ImportanceFieldLabel field={meta("targetCustomer")} />
              <input name="targetCustomer" disabled={disabled} defaultValue={draft.targetCustomer ?? ""} />
            </label>
          </ProductFormSection>

          <ProductFormSection title="안내사항" description="상품별 입력이 있으면 브랜드 기본값보다 우선 적용합니다.">
            <label className="full">
              <ImportanceFieldLabel field={meta("shippingNotice")} />
              <textarea name="shippingNotice" disabled={disabled} defaultValue={draft.shippingNotice ?? ""} />
            </label>
            <label className="full">
              <ImportanceFieldLabel field={meta("returnExchangeNotice")} />
              <textarea name="returnExchangeNotice" disabled={disabled} defaultValue={draft.returnExchangeNotice ?? ""} />
            </label>
            <div className="full">
              <DynamicNoticeFields disabled={disabled} initialNotices={draft.customNotices} />
            </div>
          </ProductFormSection>

          <ProductFormSection title="고급 설정" description="꼭 넣거나 피해야 하는 문구가 있을 때만 사용하세요.">
            <label className="full">
              <span className="labelLine">
                <span>상품별 브랜드 카피</span>
                <span className="badge optional">선택</span>
              </span>
              <textarea name="requiredPhrases" disabled={disabled} defaultValue={draft.requiredPhrases ?? ""} />
            </label>
            <label className="full">
              <span className="labelLine">
                <span>상품별 금지 문구</span>
                <span className="badge optional">선택</span>
              </span>
              <textarea name="forbiddenPhrases" disabled={disabled} defaultValue={draft.forbiddenPhrases ?? ""} />
            </label>
          </ProductFormSection>

          <div className="full actions">
            <button className="primary" type="submit" disabled={disabled}>
              수정 저장 후 {userFacingTerms.approvalMarkdown} 다시 만들기
            </button>
            <Link className="button" href={`/detail-pages/${draft.id}/approval`}>
              취소
            </Link>
          </div>
        </form>

        <div className="grid">
          <BrandDefaultsPreview brands={brands} assets={db.assets} />
        </div>
      </section>
    </>
  );
}
