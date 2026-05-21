import { createBrandAction, deleteBrandAction, updateBrandAction } from "@/app/actions";
import { FieldLabel } from "@/components/FieldLabel";
import { DynamicNoticeFields } from "@/components/ux/DynamicNoticeFields";
import { brandFieldMeta } from "@/lib/field-metadata";
import { categoryLabelForNotice } from "@/lib/notice-categories";
import { getCurrentUserId } from "@/lib/store";
import { listBrands } from "@/lib/services/brands";
import type { BrandProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function meta(name: string) {
  const field = brandFieldMeta.find((item) => item.name === name);
  if (!field) throw new Error(`Missing field meta: ${name}`);
  return field;
}

function toneOptions() {
  const options = ["브랜드 스토리형", "문제 해결형", "프리미엄 감성형"];
  return (
    <>
      <option value="">톤 정보 없음</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </>
  );
}

function channelOptions() {
  const options = ["채널 무관 모바일 상세페이지", "네이버 스마트스토어", "쿠팡", "자사몰"];
  return (
    <>
      <option value="">채널 무관</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </>
  );
}

function splitNotice(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function ReadableNotice({ value }: { value: string | null | undefined }) {
  const lines = splitNotice(value);
  if (!lines.length) return <p>기본값 없음</p>;
  if (lines.length === 1) return <p>{lines[0]}</p>;

  return (
    <ul className="compactNoticeList">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
    </ul>
  );
}

function BrandEditForm({ brand }: { brand: BrandProfile }) {
  return (
    <form className="formGrid" action={updateBrandAction} data-alert="브랜드 기본값을 수정합니다.">
      <input type="hidden" name="brandId" value={brand.id} />
      <label>
        <FieldLabel field={meta("brandName")} />
        <input name="brandName" defaultValue={brand.brandName} required />
      </label>
      <label>
        <FieldLabel field={meta("pointColor")} />
        <input name="pointColor" type="color" defaultValue={brand.pointColor} required />
      </label>
      <label>
        <FieldLabel field={meta("subColor")} />
        <input name="subColor" type="color" defaultValue={brand.subColor ?? "#faeb00"} />
      </label>
      <label>
        <FieldLabel field={meta("logo")} />
        <input name="logo" type="file" accept="image/*" />
      </label>
      <label>
        <FieldLabel field={meta("defaultTone")} />
        <select name="defaultTone" defaultValue={brand.defaultTone ?? ""}>
          {toneOptions()}
        </select>
      </label>
      <label>
        <FieldLabel field={meta("defaultSalesChannel")} />
        <select name="defaultSalesChannel" defaultValue={brand.defaultSalesChannel ?? ""}>
          {channelOptions()}
        </select>
      </label>
      <label className="full">
        <span className="labelLine">
          <span>브랜드 카피</span>
          <span className="badge optional">선택</span>
        </span>
        <textarea name="requiredPhrases" defaultValue={brand.requiredPhrases ?? ""} />
      </label>
      <label className="full">
        <span className="labelLine">
          <span>금지 문구</span>
          <span className="badge optional">선택</span>
        </span>
        <textarea name="forbiddenPhrases" defaultValue={brand.forbiddenPhrases ?? ""} />
      </label>
      <label className="full">
        <FieldLabel field={meta("shippingNotice")} />
        <textarea name="shippingNotice" defaultValue={brand.shippingNotice ?? ""} />
      </label>
      <label className="full">
        <FieldLabel field={meta("returnExchangeNotice")} />
        <textarea name="returnExchangeNotice" defaultValue={brand.returnExchangeNotice ?? ""} />
      </label>
      <div className="full">
        <DynamicNoticeFields initialNotices={brand.customNotices} includeCategories />
      </div>
      <div className="full actions">
        <button className="primary" type="submit">
          수정 저장
        </button>
      </div>
    </form>
  );
}

export default async function BrandsPage() {
  const userId = await getCurrentUserId();
  const brands = await listBrands(userId);
  const disabled = brands.length >= 5;

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>브랜드 기본값</h1>
          <p>사용자당 최대 5개 브랜드를 등록하고 상세페이지 기본값으로 사용합니다.</p>
        </div>
        <div className="panel" style={{ padding: "10px 14px" }}>
          브랜드 {brands.length} / 5
        </div>
      </header>

      <section className="grid two">
        <form className="panel formGrid" action={createBrandAction} data-alert="브랜드 기본값을 저장합니다.">
          <h2 className="full">브랜드 추가</h2>
          {disabled ? <p className="full danger">브랜드는 최대 5개까지 등록할 수 있습니다.</p> : null}
          <label>
            <FieldLabel field={meta("brandName")} />
            <input name="brandName" required disabled={disabled} />
          </label>
          <label>
            <FieldLabel field={meta("pointColor")} />
            <input name="pointColor" type="color" defaultValue="#171717" required disabled={disabled} />
          </label>
          <label>
            <FieldLabel field={meta("subColor")} />
            <input name="subColor" type="color" defaultValue="#faeb00" disabled={disabled} />
          </label>
          <label>
            <FieldLabel field={meta("logo")} />
            <input name="logo" type="file" accept="image/*" disabled={disabled} />
          </label>
          <label>
            <FieldLabel field={meta("defaultTone")} />
            <select name="defaultTone" disabled={disabled}>
              {toneOptions()}
            </select>
          </label>
          <label>
            <FieldLabel field={meta("defaultSalesChannel")} />
            <select name="defaultSalesChannel" disabled={disabled}>
              {channelOptions()}
            </select>
          </label>
          <label className="full">
            <span className="labelLine">
              <span>브랜드 카피</span>
              <span className="badge optional">선택</span>
            </span>
            <textarea name="requiredPhrases" disabled={disabled} />
          </label>
          <label className="full">
            <span className="labelLine">
              <span>금지 문구</span>
              <span className="badge optional">선택</span>
            </span>
            <textarea name="forbiddenPhrases" disabled={disabled} />
          </label>
          <label className="full">
            <FieldLabel field={meta("shippingNotice")} />
            <textarea name="shippingNotice" disabled={disabled} />
          </label>
          <label className="full">
            <FieldLabel field={meta("returnExchangeNotice")} />
            <textarea name="returnExchangeNotice" disabled={disabled} />
          </label>
          <div className="full">
            <DynamicNoticeFields disabled={disabled} includeCategories />
          </div>
          <div className="full">
            <button className="primary" type="submit" disabled={disabled}>
              브랜드 저장
            </button>
          </div>
        </form>

        <section className="panel">
          <h2>등록 브랜드</h2>
          <div className="cardList" style={{ marginTop: 12 }}>
            {brands.map((brand) => (
              <article className="card" key={brand.id}>
                <div className="panelHeader">
                  <div className="brandPreviewTop">
                    {brand.logoAssetId ? (
                      <img src={`/api/assets/${brand.logoAssetId}`} alt={`${brand.brandName} 로고`} />
                    ) : (
                      <span className="brandPreviewMark">{brand.brandName.slice(0, 1)}</span>
                    )}
                    <h3>{brand.brandName}</h3>
                  </div>
                  <span className="badge">브랜드</span>
                </div>
                <div className="swatchRow">
                  <span style={{ background: brand.pointColor }} />
                  {brand.subColor ? <span style={{ background: brand.subColor }} /> : null}
                  <code>{brand.pointColor}</code>
                </div>
                <p>톤: {brand.defaultTone || "톤 정보 없음"}</p>
                <p>판매 채널: {brand.defaultSalesChannel || "채널 무관"}</p>
                <div className="readableNoticeBlock">
                  <strong>배송 안내</strong>
                  <ReadableNotice value={brand.shippingNotice} />
                </div>
                <div className="readableNoticeBlock">
                  <strong>반품/교환</strong>
                  <ReadableNotice value={brand.returnExchangeNotice} />
                </div>
                {brand.customNotices.length ? (
                  <div className="noticeGrid compact">
                    {brand.customNotices.map((notice) => (
                      <div key={`${brand.id}-${notice.title}-${categoryLabelForNotice(notice)}`}>
                        <div className="noticeCardTitle">
                          <strong>{notice.title || "안내사항"}</strong>
                          <span className="badge optional">{categoryLabelForNotice(notice)}</span>
                        </div>
                        <p>{notice.content || "내용 없음"}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <details className="editBox">
                  <summary>브랜드 수정</summary>
                  <BrandEditForm brand={brand} />
                </details>

                <form
                  action={deleteBrandAction}
                  className="actions deleteForm"
                  data-confirm="이 브랜드를 삭제할까요? 삭제한 브랜드는 새 상세페이지 생성에서 선택할 수 없습니다."
                  data-alert="브랜드를 삭제합니다."
                >
                  <input type="hidden" name="brandId" value={brand.id} />
                  <button type="submit">삭제</button>
                </form>
              </article>
            ))}
            {!brands.length ? <p className="muted">등록한 브랜드가 없습니다.</p> : null}
          </div>
        </section>
      </section>
    </>
  );
}
