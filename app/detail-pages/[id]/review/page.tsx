import {
  processImageGenerationStepAction,
  regenerateApprovalCutMarkdownAction,
  saveCutRevisionAction,
  saveThumbnailRevisionAction,
  startImageGenerationAction
} from "@/app/actions";
import { AutoImageGenerationStep } from "@/components/ux/AutoImageGenerationStep";
import { CloseDetailsButton } from "@/components/ux/CloseDetailsButton";
import { DownloadActions } from "@/components/ux/DownloadActions";
import { FullDetailPreview } from "@/components/ux/FullDetailPreview";
import { ReadinessBadge } from "@/components/ux/ReadinessBadge";
import { getCurrentUserId, readDb } from "@/lib/store";
import { getJobWithCuts, listJobsForDraft } from "@/lib/services/image-generation";
import { buildDownloadableCuts, buildDownloadableThumbnail } from "@/lib/ux/downloads";
import { cutStatusLabel, jobStatusLabel } from "@/lib/ux/copy";
import { buildGenerationReadiness } from "@/lib/ux/generation-readiness";
import type { Asset } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { id } = await params;
  const { jobId } = await searchParams;
  const userId = await getCurrentUserId();
  const jobs = await listJobsForDraft(userId, id);
  const selectedJobId = jobId ?? jobs[jobs.length - 1]?.id;
  const result = selectedJobId ? await getJobWithCuts(userId, selectedJobId) : null;
  const db = await readDb();
  const brand = result ? db.brands.find((item) => item.id === result.draft.brandProfileId) : null;
  const downloadableCuts = result
    ? buildDownloadableCuts({ productName: result.draft.productName, cuts: result.cuts, assets: db.assets })
    : [];
  const thumbnailAsset =
    result && result.draft.thumbnailAssetId
      ? db.assets.find((item) => item.id === result.draft.thumbnailAssetId)
      : null;
  const productPhotoAssets = result
    ? result.draft.photoAssetIds
        .map((assetId) =>
          db.assets.find((item) => item.id === assetId && item.userId === userId && item.kind === "product_photo")
        )
        .filter((asset): asset is Asset => Boolean(asset))
    : [];
  const downloadableThumbnail = result
    ? buildDownloadableThumbnail({ productName: result.draft.productName, asset: thumbnailAsset })
    : null;
  const approvedMarkdown = result
    ? db.approvalMarkdownVersions.find((item) => item.id === result.job.approvalMarkdownVersionId)
    : null;
  const approvedCutNumbers =
    approvedMarkdown?.content.match(/^### Cut\s+(\d+)\./gm)?.map((heading) => {
      const match = heading.match(/^### Cut\s+(\d+)\./);
      return match ? Number(match[1]) : null;
    }).filter((cutNumber): cutNumber is number => Boolean(cutNumber)) ?? [];
  const readiness =
    result && brand
      ? buildGenerationReadiness({
          hasImageApiKey: Boolean(process.env.OPENAI_API_KEY),
          job: result.job,
          draft: result.draft,
          brand,
          assets: db.assets
        })
      : null;
  const completedCutNumbers = new Set(
    result?.cuts
      .filter((cut) => cut.imageAssetId && cut.status === "produced")
      .map((cut) => cut.cutNumber) ?? []
  );
  const pendingCutNumbers = result
    ? (approvedCutNumbers.length
        ? approvedCutNumbers
        : Array.from({ length: result.job.expectedCutCount }, (_, index) => index + 1)
      ).filter((cutNumber) => !completedCutNumbers.has(cutNumber))
    : [];
  const thumbnailPending = result ? result.draft.thumbnailRequested && !result.draft.thumbnailAssetId : false;

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>상세페이지 이미지</h1>
          <p>생성된 컷을 개별 이미지와 전체 상세페이지 미리보기로 확인합니다.</p>
        </div>
      </header>

      {!result ? (
        <section className="panel">
          <p>아직 이미지 생성 작업이 없습니다.</p>
        </section>
      ) : (
        <>
          {result.job.status === "running" ? (
            <div className="busyOverlay" role="alert" aria-live="assertive" aria-busy="true">
              <div className="busyPanel">
                <div className="busySpinner" aria-hidden="true" />
                <strong>이미지 생성 중입니다.</strong>
                <p>완료될 때까지 화면을 닫지 말고 잠시만 기다려주세요.</p>
              </div>
            </div>
          ) : null}

          <section className="panel jobSummary">
            <div className="jobTitleBlock">
              <div className="jobTitleRow">
                {downloadableThumbnail ? (
                  <details className="thumbnailReviewDetails">
                    <summary aria-label="상품 썸네일 크게 보기">
                      <img className="jobThumbnail" src={downloadableThumbnail.href} alt={`${result.draft.productName} 썸네일`} />
                    </summary>
                    <div className="thumbnailReviewPanel">
                      <div className="panelHeader">
                        <div>
                          <h3>상품 썸네일</h3>
                          <p>썸네일을 크게 확인하고 필요한 부분만 수정 요청해서 다시 생성합니다.</p>
                        </div>
                        <div className="thumbnailPanelActions">
                          <a
                            className="button thumbnailDownloadButton"
                            href={downloadableThumbnail.href}
                            download={downloadableThumbnail.fileName}
                          >
                            썸네일 다운로드
                          </a>
                          <CloseDetailsButton />
                        </div>
                      </div>
                      <img className="thumbnailLargeImage" src={downloadableThumbnail.href} alt={`${result.draft.productName} 썸네일 크게 보기`} />
                      <form
                        action={saveThumbnailRevisionAction}
                        data-alert="썸네일 수정 요청을 반영해서 다시 생성합니다."
                        data-busy="썸네일 다시 생성 중입니다."
                      >
                        <input type="hidden" name="productDraftId" value={result.draft.id} />
                        <input type="hidden" name="jobId" value={result.job.id} />
                        <div className="revisionReplaceGrid">
                          <label>
                            <span className="labelLine">
                              <span>바꾸고 싶은 문구</span>
                              <span className="badge optional">선택</span>
                            </span>
                            <textarea className="compactTextarea" name="thumbnailRevisionSourceText" placeholder="기존 문구" />
                          </label>
                          <label>
                            <span className="labelLine">
                              <span>변경할 문구</span>
                              <span className="badge optional">선택</span>
                            </span>
                            <textarea className="compactTextarea" name="thumbnailRevisionReplacementText" placeholder="새 문구" />
                          </label>
                        </div>
                        <label>
                          <span className="labelLine">
                            <span>수정 요청</span>
                            <span className="badge optional">선택</span>
                          </span>
                          <textarea name="thumbnailRevisionRequest" placeholder="상품을 더 크게, 배경은 더 밝게 등" />
                        </label>
                        <button type="submit" style={{ marginTop: 8 }}>
                          요청 반영해서 썸네일 다시 생성
                        </button>
                      </form>
                    </div>
                  </details>
                ) : null}
                <div>
                  <h2>{result.draft.productName}</h2>
                  {downloadableThumbnail ? (
                    <a className="textLink" href={downloadableThumbnail.href} download={downloadableThumbnail.fileName}>
                      썸네일 다운로드
                    </a>
                  ) : null}
                </div>
              </div>
              <p>
                작업 상태: {jobStatusLabel(result.job.status)} · {result.job.completedCutCount} / {result.job.expectedCutCount}
              </p>
            </div>
            {readiness ? <ReadinessBadge readiness={readiness} /> : null}
            {result.job.status === "running" ? (
              <form
                id={`image-step-${result.job.id}`}
                action={processImageGenerationStepAction}
                data-action-feedback="off"
              >
                <input type="hidden" name="productDraftId" value={result.draft.id} />
                <input type="hidden" name="jobId" value={result.job.id} />
                <AutoImageGenerationStep
                  formId={`image-step-${result.job.id}`}
                  jobId={result.job.id}
                  pendingCutNumbers={pendingCutNumbers}
                  thumbnailPending={thumbnailPending}
                />
              </form>
            ) : null}
            {result.job.status === "failed" ? (
              <form action={startImageGenerationAction} data-alert="이미지 생성을 다시 시작합니다." data-busy="이미지 생성 중입니다.">
                <input type="hidden" name="productDraftId" value={result.draft.id} />
                <button className="primary" type="submit">
                  다시 생성
                </button>
              </form>
            ) : null}
            {result.job.errorMessage ? <p className="danger">오류: {result.job.errorMessage}</p> : null}
          </section>

          {result.cuts.length ? (
            <div className="reviewContent">
              <section className="cutGrid">
                {!downloadableThumbnail && result.draft.thumbnailRequested ? (
                  <article className="panel cutCard thumbnailCard">
                    <div className="panelHeader">
                      <h2>상품 썸네일</h2>
                      <span className="badge warning">생성 대기</span>
                    </div>
                    <p className="muted">썸네일 생성 요청은 켜져 있지만 아직 생성된 이미지가 없습니다.</p>
                  </article>
                ) : null}

                {result.cuts.map((cut) => {
                  const asset = db.assets.find((item) => item.id === cut.imageAssetId);
                  const downloadable = downloadableCuts.find((item) => item.cutId === cut.id);
                  const visibleQaNotes = cut.qa.notes.filter((note) => {
                    return note !== "revision_applied" && !note.includes("수정 요청") && !note.includes("理쒓렐");
                  });

                  return (
                    <article className="panel cutCard" key={cut.id}>
                      <div className="panelHeader">
                        <h2>
                          Cut {String(cut.cutNumber).padStart(2, "0")} · {cut.title}
                        </h2>
                        <span className="badge optional">{cutStatusLabel(cut.status)}</span>
                      </div>
                      {asset ? <img className="cutImage" src={`/api/assets/${asset.id}`} alt={cut.title} /> : <p className="danger">이미지 asset이 없습니다.</p>}
                      <p>
                        QA: 텍스트 {cut.qa.textReadable ? "OK" : "확인 필요"} · 상품 사진{" "}
                        {cut.qa.productMatchesReference ? "참조됨" : "없음"}
                      </p>
                      {visibleQaNotes.length ? <p className="muted">{visibleQaNotes.join(" / ")}</p> : null}

                      <div className="cutActionBar">
                        {downloadable ? (
                          <a className="button cutDownloadButton" href={downloadable.href} download={downloadable.fileName}>
                            개별 다운로드
                          </a>
                        ) : null}
                        {asset ? (
                          <form
                            action={regenerateApprovalCutMarkdownAction}
                            data-alert={`Cut ${String(cut.cutNumber).padStart(2, "0")} 초안만 다시 생성합니다.`}
                            data-busy={`Cut ${String(cut.cutNumber).padStart(2, "0")} 초안 생성 중입니다.`}
                          >
                            <input type="hidden" name="markdownId" value={result.job.approvalMarkdownVersionId} />
                            <input type="hidden" name="productDraftId" value={id} />
                            <input type="hidden" name="cutNumber" value={cut.cutNumber} />
                            <button className="cutRegenerateButton" type="submit">
                              초안 다시 생성
                            </button>
                          </form>
                        ) : null}
                      </div>

                      <div className="cutRevisionSeparator" aria-hidden="true" />
                      <div className="cutRevisionTitle">
                        <strong>수정 요청 반영</strong>
                        <span>원하는 문구만 바꾸거나 필요한 수정사항을 적어 해당 컷을 다시 생성합니다.</span>
                      </div>
                      <form
                        action={saveCutRevisionAction}
                        data-alert="수정 요청을 반영해 해당 컷을 다시 생성합니다."
                        data-busy="이미지 다시 생성 중입니다."
                      >
                        <input type="hidden" name="cutId" value={cut.id} />
                        <input type="hidden" name="productDraftId" value={id} />
                        <input type="hidden" name="jobId" value={result.job.id} />
                        {productPhotoAssets.length ? (
                          <details className="revisionPhotoSelector">
                            <summary>상품 사진 교체</summary>
                            <label className="checkField">
                              <input type="checkbox" name="replaceProductPhoto" />
                              <span>
                                <strong>선택한 상품 사진으로 메인 상품 이미지 교체</strong>
                                <small>문구와 레이아웃은 최대한 유지하고, 상품 이미지 기준만 선택한 사진으로 바꿉니다.</small>
                              </span>
                            </label>
                            <div className="revisionPhotoChoices">
                              {productPhotoAssets.map((photo, index) => (
                                <label key={photo.id}>
                                  <input
                                    type="radio"
                                    name="productPhotoAssetId"
                                    value={photo.id}
                                    defaultChecked={index === 0}
                                  />
                                  <img src={`/api/assets/${photo.id}`} alt={`상품 사진 ${index + 1}`} />
                                  <span>사진 {index + 1}</span>
                                </label>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        <div className="revisionReplaceGrid">
                          <label>
                            <span className="labelLine">
                              <span>바꾸고 싶은 문구</span>
                              <span className="badge optional">선택</span>
                            </span>
                            <textarea className="compactTextarea" name="revisionSourceText" placeholder="기존 문구를 그대로 입력" />
                          </label>
                          <label>
                            <span className="labelLine">
                              <span>변경할 문구</span>
                              <span className="badge optional">선택</span>
                            </span>
                            <textarea className="compactTextarea" name="revisionReplacementText" placeholder="새 문구" />
                          </label>
                        </div>
                        <label>
                          <span className="labelLine">
                            <span>수정 요청</span>
                            <span className="badge optional">선택</span>
                          </span>
                          <textarea name="revisionRequest" defaultValue={cut.revisionRequest ?? ""} placeholder="배경을 더 밝게, 문구를 더 크게 등" />
                        </label>
                        <button type="submit" style={{ marginTop: 8 }}>
                          요청 반영해서 다시 생성
                        </button>
                      </form>
                    </article>
                  );
                })}
              </section>
              <FullDetailPreview cuts={downloadableCuts} productName={result.draft.productName} actions={<DownloadActions cuts={downloadableCuts} />} />
            </div>
          ) : (
            <section className="panel">
              <p className={result.job.status === "failed" ? "danger" : "muted"}>
                생성된 컷이 없습니다. 작업 상태와 오류 메시지를 확인하세요.
              </p>
            </section>
          )}
        </>
      )}
    </>
  );
}
