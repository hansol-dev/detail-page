import {
  approveAndStartImageGenerationAction,
  regenerateApprovalMarkdownAction,
  saveApprovalMarkdownAction
} from "@/app/actions";
import Link from "next/link";
import { AdvancedMarkdownEditor } from "@/components/ux/AdvancedMarkdownEditor";
import { DraftReviewCards } from "@/components/ux/DraftReviewCards";
import { ReadinessBadge } from "@/components/ux/ReadinessBadge";
import { getCurrentUserId, readDb } from "@/lib/store";
import { getLatestApprovalMarkdown } from "@/lib/services/approval-md";
import { getProductDraft } from "@/lib/services/product-drafts";
import { buildDraftReviewSummary } from "@/lib/ux/draft-review";
import { buildGenerationReadiness } from "@/lib/ux/generation-readiness";
import { userFacingTerms } from "@/lib/ux/copy";

export const dynamic = "force-dynamic";

function mdStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "검토 중",
    approved: "승인됨",
    superseded: "이전 버전"
  };
  return labels[status] ?? status;
}

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const draft = await getProductDraft(userId, id);
  const md = draft ? await getLatestApprovalMarkdown(userId, draft.id) : null;
  const hasImageApiKey = Boolean(process.env.OPENAI_API_KEY);
  const db = await readDb();
  const brand = draft ? db.brands.find((item) => item.id === draft.brandProfileId) : null;
  const logoAsset = brand?.logoAssetId ? db.assets.find((asset) => asset.id === brand.logoAssetId) : null;
  const photoAssets = draft
    ? draft.photoAssetIds
        .map((assetId) => db.assets.find((asset) => asset.id === assetId))
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
    : [];
  const regeneratedCutNumber =
    typeof md?.generatedFrom?.regeneratedCutNumber === "number" ? md.generatedFrom.regeneratedCutNumber : null;
  const hasExistingGeneratedCut = regeneratedCutNumber
    ? db.imageGenerationJobs
        .filter((job) => job.productDraftId === id)
        .some((job) =>
          db.generatedCuts.some((cut) => cut.imageGenerationJobId === job.id && cut.cutNumber === regeneratedCutNumber)
        )
    : false;

  if (!draft) {
    return (
      <section className="panel">
        <h1>상품 초안을 찾을 수 없습니다.</h1>
      </section>
    );
  }

  if (!brand) {
    return (
      <section className="panel">
        <h1>브랜드를 찾을 수 없습니다.</h1>
      </section>
    );
  }

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>{userFacingTerms.approvalMarkdown}</h1>
          <p>{draft.productName} 이미지는 승인한 최신 초안만 기준으로 생성합니다.</p>
        </div>
        <div className="actions pageHeaderActions">
          <form
            action={regenerateApprovalMarkdownAction}
            data-alert="상세페이지 초안을 다시 만듭니다."
            data-busy="상세페이지 초안 생성 중입니다."
          >
            <input type="hidden" name="productDraftId" value={draft.id} />
            <button type="submit">{userFacingTerms.regenerateDraft}</button>
          </form>
          <Link className="button" href={`/detail-pages/${draft.id}/edit`}>
            상품정보 수정
          </Link>
        </div>
      </header>

      {!hasImageApiKey ? (
        <section className="panel warningPanel">
          <strong>현재는 테스트 이미지로 생성합니다.</strong>
          <p>OPENAI_API_KEY를 설정하기 전까지는 판매용 최종 이미지가 아니라 흐름 확인용 이미지로 생성합니다.</p>
        </section>
      ) : null}

      {!md ? (
        <section className="panel">
          <p>아직 상세페이지 초안이 없습니다.</p>
        </section>
      ) : (
        <>
          <section className="grid two approvalGrid">
            <DraftReviewCards
              regeneratedCutNumber={regeneratedCutNumber}
              canRegenerateCutImage={hasExistingGeneratedCut}
              summary={buildDraftReviewSummary({
                draft,
                brand,
                markdown: md,
                readiness: buildGenerationReadiness({ hasImageApiKey, draft, brand, assets: db.assets })
              })}
            />

            <aside className="panel stickyPanel">
              <h2>다음 작업</h2>
              <p>초안 내용을 확인한 뒤 승인하면 컷 수만큼 상세페이지 이미지를 생성할 수 있습니다.</p>
              <ReadinessBadge readiness={buildGenerationReadiness({ hasImageApiKey, draft, brand, assets: db.assets })} />
              <div className="statusStack">
                <div>
                  <span className="muted">상품명</span>
                  <strong>{draft.productName}</strong>
                </div>
                <div>
                  <span className="muted">브랜드 로고</span>
                  <strong>{logoAsset ? "업로드됨" : "없음"}</strong>
                </div>
                <div>
                  <span className="muted">상품 이미지</span>
                  <strong>{photoAssets.length ? `${photoAssets.length}개 업로드됨` : "없음"}</strong>
                </div>
                <div>
                  <span className="muted">컷 수</span>
                  <strong>{draft.cutCount}</strong>
                </div>
                <div>
                  <span className="muted">이미지 방식</span>
                  <strong>{hasImageApiKey ? userFacingTerms.aiImage : userFacingTerms.testImage}</strong>
                </div>
              </div>
              {logoAsset || photoAssets.length ? (
                <div className="referencePreview">
                  {logoAsset ? <img src={`/api/assets/${logoAsset.id}`} alt="브랜드 로고" /> : null}
                  {photoAssets.slice(0, 3).map((asset) => (
                    <img key={asset.id} src={`/api/assets/${asset.id}`} alt="상품 이미지" />
                  ))}
                </div>
              ) : (
                <p className="muted">로고와 상품 이미지를 추가하면 생성 결과가 더 정확해집니다.</p>
              )}
              <div className="actions actionColumn">
                <form
                  action={approveAndStartImageGenerationAction}
                  data-alert="초안을 승인하고 바로 이미지 생성을 시작합니다."
                  data-busy="초안 승인 및 이미지 생성 준비 중입니다."
                >
                  <input type="hidden" name="markdownId" value={md.id} />
                  <input type="hidden" name="productDraftId" value={draft.id} />
                  <button className="primary" type="submit">
                    초안승인 및 이미지생성
                  </button>
                </form>
              </div>
              <p className="muted">버튼을 누르면 현재 초안을 승인한 뒤 상세페이지 이미지 생성을 바로 시작합니다.</p>
            </aside>
          </section>
          <AdvancedMarkdownEditor>
            <form className="panel mdEditorPanel" action={saveApprovalMarkdownAction} data-alert="고급 편집 내용을 저장합니다.">
              <div className="panelHeader">
                <h2>원문 v{md.version}</h2>
                <span className={`badge ${md.status === "approved" ? "" : "optional"}`}>
                  {mdStatusLabel(md.status)}
                </span>
              </div>
              <input type="hidden" name="markdownId" value={md.id} />
              <input type="hidden" name="productDraftId" value={draft.id} />
              <textarea className="editor" name="content" defaultValue={md.content} readOnly={md.status === "approved"} />
              <div className="actions" style={{ marginTop: 12 }}>
                <button className="primary" type="submit" disabled={md.status === "approved"}>
                  {userFacingTerms.saveAdvancedEdit}
                </button>
              </div>
            </form>
          </AdvancedMarkdownEditor>
        </>
      )}
    </>
  );
}
