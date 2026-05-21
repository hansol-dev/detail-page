import type { Asset, BrandProfile } from "@/lib/types";
import { categoryLabelForNotice } from "@/lib/notice-categories";

function shortValue(value: string | null | undefined, fallback = "기본값 없음") {
  return value?.trim() || fallback;
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

export function BrandPreviewCard({ brand, logoAsset }: { brand: BrandProfile; logoAsset?: Asset | null }) {
  return (
    <article className="brandPreviewCard">
      <div className="brandPreviewTop">
        {logoAsset ? (
          <img src={`/api/assets/${logoAsset.id}`} alt={`${brand.brandName} 로고`} />
        ) : (
          <span className="brandPreviewMark">{brand.brandName.slice(0, 1)}</span>
        )}
        <div>
          <strong>{brand.brandName}</strong>
          <p>{shortValue(brand.defaultTone, "톤 정보 없음")}</p>
        </div>
      </div>
      <div className="swatchRow">
        <span style={{ background: brand.pointColor }} />
        {brand.subColor ? <span style={{ background: brand.subColor }} /> : null}
        <code>{brand.pointColor}</code>
      </div>
      <p>판매 채널: {shortValue(brand.defaultSalesChannel, "채널 무관")}</p>
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
    </article>
  );
}

export function BrandDefaultsPreview({
  brands,
  assets,
  title = "브랜드 기본값 미리보기"
}: {
  brands: BrandProfile[];
  assets: Asset[];
  title?: string;
}) {
  return (
    <section className="panel brandPreview">
      <h2>{title}</h2>
      <p>상품별 입력을 비워 두면 아래 브랜드 기본값이 초안에 자동 반영됩니다.</p>
      <div className="brandPreviewList">
        {brands.map((brand) => (
          <BrandPreviewCard
            brand={brand}
            logoAsset={brand.logoAssetId ? assets.find((asset) => asset.id === brand.logoAssetId) : null}
            key={brand.id}
          />
        ))}
        {!brands.length ? <p className="muted">등록한 브랜드가 없습니다.</p> : null}
      </div>
    </section>
  );
}
