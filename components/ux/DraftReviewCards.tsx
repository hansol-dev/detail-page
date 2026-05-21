import {
  approveAndRegenerateDraftCutImageAction,
  approveMarkdownAction,
  regenerateApprovalCutMarkdownAction,
  saveDraftCutSectionAction
} from "@/app/actions";
import type { DraftReviewSummary } from "@/lib/ux/draft-review";
import { ReadinessBadge } from "./ReadinessBadge";

function splitNotice(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function ReadableNotice({ value }: { value: string }) {
  const lines = splitNotice(value);
  if (lines.length <= 1) return <p>{value}</p>;

  return (
    <ul className="compactNoticeList">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
    </ul>
  );
}

export function DraftReviewCards({
  summary,
  regeneratedCutNumber,
  canRegenerateCutImage
}: {
  summary: DraftReviewSummary;
  regeneratedCutNumber?: number | null;
  canRegenerateCutImage?: boolean;
}) {
  const editable = summary.markdown.status !== "approved";

  return (
    <div className="draftReviewStack">
      <section className="panel draftReviewHero">
        <div>
          <span className="muted">상세페이지 초안</span>
          <h2>{summary.product.name}</h2>
          <p>
            {summary.product.brandName} · {summary.product.category} · {summary.product.cutCount}컷
          </p>
        </div>
        <span className="badge optional">{summary.product.salesChannel}</span>
      </section>

      <section className="draftReviewGrid">
        <article className="panel">
          <h3>브랜드 적용</h3>
          <div className="brandAppliedVisuals">
            <div>
              <span>로고</span>
              {summary.brandApplied.logoAssetId ? (
                <img src={`/api/assets/${summary.brandApplied.logoAssetId}`} alt={`${summary.product.brandName} 로고`} />
              ) : (
                <strong>없음</strong>
              )}
            </div>
            <div>
              <span>포인트 컬러</span>
              <p>
                <i style={{ background: summary.brandApplied.pointColor }} />
                <code>{summary.brandApplied.pointColor}</code>
              </p>
            </div>
          </div>
          <dl className="previewList">
            <div>
              <dt>필수 문구</dt>
              <dd>{summary.brandApplied.requiredPhrases.join(", ") || "없음"}</dd>
            </div>
            <div>
              <dt>금지 문구</dt>
              <dd>{summary.brandApplied.forbiddenPhrases.join(", ") || "없음"}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h3>최종 확인 필요</h3>
          <ul className="plainList">
            {summary.confirmationNeeded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel">
        <h3>안내사항</h3>
        <div className="noticeGrid">
          {summary.brandApplied.notices.map((notice) => (
            <div key={`${notice.title}-${notice.sourceLabel}`}>
              <div className="noticeCardTitle">
                <strong>{notice.title}</strong>
                <span className="badge optional">{notice.sourceLabel}</span>
              </div>
              <ReadableNotice value={notice.content} />
            </div>
          ))}
        </div>
      </section>

      <ReadinessBadge readiness={summary.readiness} />

      <section className="draftCutList">
        {summary.cuts.map((cut) => {
          const isRegeneratedCut = regeneratedCutNumber === cut.cutNumber;

          return (
            <article className="panel draftCutCard" key={cut.cutNumber}>
              <div className="panelHeader">
                <h3>
                  Cut {String(cut.cutNumber).padStart(2, "0")} · {cut.title}
                </h3>
                <div className="actions">
                  <span className="badge optional">초안</span>
                  <form
                    action={regenerateApprovalCutMarkdownAction}
                    data-alert={`Cut ${String(cut.cutNumber).padStart(2, "0")} 초안만 다시 만듭니다.`}
                    data-busy={`Cut ${String(cut.cutNumber).padStart(2, "0")} 초안 생성 중입니다.`}
                  >
                    <input type="hidden" name="markdownId" value={summary.markdown.id} />
                    <input type="hidden" name="productDraftId" value={summary.markdown.productDraftId} />
                    <input type="hidden" name="cutNumber" value={cut.cutNumber} />
                    <button type="submit">이 컷 초안 다시 만들기</button>
                  </form>
                </div>
              </div>

              <dl className="previewList">
                <div>
                  <dt>목적</dt>
                  <dd>{cut.purpose}</dd>
                </div>
                <div>
                  <dt>헤드라인</dt>
                  <dd>{cut.headline}</dd>
                </div>
                <div>
                  <dt>서브카피</dt>
                  <dd>{cut.subcopy}</dd>
                </div>
                <div>
                  <dt>이미지 삽입 문구</dt>
                  <dd>{cut.imageText}</dd>
                </div>
                <div>
                  <dt>이미지 방향</dt>
                  <dd>{cut.visualDirection}</dd>
                </div>
              </dl>

              <ul className="plainList compact">
                {cut.confirmationNeeded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {isRegeneratedCut ? (
                <div className="cutDraftApprovalBox">
                  <div>
                    <strong>이 컷 초안이 다시 생성됐습니다.</strong>
                    <span>이 컷만 확인한 뒤 승인하거나, 승인 후 해당 컷 이미지만 다시 생성할 수 있습니다.</span>
                  </div>
                  <div className="actions">
                    <form action={approveMarkdownAction} data-alert={`Cut ${String(cut.cutNumber).padStart(2, "0")} 변경 초안을 승인합니다.`}>
                      <input type="hidden" name="markdownId" value={summary.markdown.id} />
                      <input type="hidden" name="productDraftId" value={summary.markdown.productDraftId} />
                      <button className="primary" type="submit" disabled={summary.markdown.status === "approved"}>
                        초안 승인
                      </button>
                    </form>
                    <form
                      action={approveAndRegenerateDraftCutImageAction}
                      data-alert={`현재 초안을 승인하고 Cut ${String(cut.cutNumber).padStart(2, "0")} 이미지만 다시 생성합니다.`}
                      data-busy={`Cut ${String(cut.cutNumber).padStart(2, "0")} 이미지 다시 생성 중입니다.`}
                    >
                      <input type="hidden" name="markdownId" value={summary.markdown.id} />
                      <input type="hidden" name="productDraftId" value={summary.markdown.productDraftId} />
                      <input type="hidden" name="cutNumber" value={cut.cutNumber} />
                      <button type="submit" disabled={!canRegenerateCutImage}>
                        이미지 재생성
                      </button>
                    </form>
                  </div>
                  {!canRegenerateCutImage ? (
                    <p className="muted">기존 생성 이미지가 있어야 이 컷만 교체할 수 있습니다.</p>
                  ) : null}
                </div>
              ) : null}

              <details className="cutDraftEditor" open={false}>
                <summary>이 컷 초안 수정</summary>
                <form action={saveDraftCutSectionAction} data-alert={`Cut ${String(cut.cutNumber).padStart(2, "0")} 초안을 저장합니다.`}>
                  <input type="hidden" name="markdownId" value={summary.markdown.id} />
                  <input type="hidden" name="productDraftId" value={summary.markdown.productDraftId} />
                  <input type="hidden" name="cutNumber" value={cut.cutNumber} />
                  <textarea
                    className="cutDraftTextarea"
                    name="cutSection"
                    defaultValue={cut.rawSection}
                    readOnly={!editable}
                  />
                  <button className="primary" type="submit" disabled={!editable}>
                    컷 초안 저장
                  </button>
                </form>
              </details>
            </article>
          );
        })}
      </section>
    </div>
  );
}
