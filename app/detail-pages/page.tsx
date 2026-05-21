import Link from "next/link";
import { getCurrentUserId, readDb } from "@/lib/store";
import { listBrands } from "@/lib/services/brands";
import { listProductDrafts } from "@/lib/services/product-drafts";
import { draftStatusLabel, jobStatusLabel } from "@/lib/ux/copy";
import { matchesResultFilter, normalizeResultFilter, resultFilters } from "@/lib/ux/result-filters";

export const dynamic = "force-dynamic";

export default async function DetailPagesIndexPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = normalizeResultFilter(status);
  const userId = await getCurrentUserId();
  const db = await readDb();
  const drafts = await listProductDrafts(userId);
  const brands = await listBrands(userId);

  const rows = drafts
    .map((draft) => {
      const brand = brands.find((item) => item.id === draft.brandProfileId);
      const jobs = db.imageGenerationJobs
        .filter((job) => job.productDraftId === draft.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latestJob = jobs[0];
      const cuts = latestJob ? db.generatedCuts.filter((cut) => cut.imageGenerationJobId === latestJob.id) : [];
      const firstCut = cuts
        .sort((a, b) => a.cutNumber - b.cutNumber)
        .map((cut) => db.assets.find((asset) => asset.id === cut.imageAssetId))
        .find(Boolean);

      return { draft, brand, latestJob, completedCuts: cuts.length, firstCut };
    })
    .filter(({ draft, latestJob }) => {
      const cuts = latestJob ? db.generatedCuts.filter((cut) => cut.imageGenerationJobId === latestJob.id) : [];
      return matchesResultFilter({ filter: activeFilter, draft, latestJob, cuts });
    })
    .sort((a, b) => new Date(b.draft.createdAt).getTime() - new Date(a.draft.createdAt).getTime());

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>상세페이지 결과</h1>
          <p>이전에 만든 상품 초안, 상세페이지 초안, 이미지 생성 결과를 한 곳에서 확인합니다.</p>
        </div>
        <Link className="button primary" href="/detail-pages/new">
          새 상세페이지
        </Link>
      </header>

      <nav className="filterBar" aria-label="상세페이지 상태 필터">
        {resultFilters.map((filter) => (
          <Link
            className={`button ${activeFilter === filter.id ? "primary" : ""}`}
            href={filter.id === "all" ? "/detail-pages" : `/detail-pages?status=${filter.id}`}
            key={filter.id}
            aria-current={activeFilter === filter.id ? "page" : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <section className="resultGrid">
        {rows.map(({ draft, brand, latestJob, completedCuts, firstCut }) => (
          <article className="panel resultCard" key={draft.id}>
            <div className="resultThumb">
              {firstCut ? (
                <img src={`/api/assets/${firstCut.id}`} alt={`${draft.productName} 대표 컷`} />
              ) : (
                <div>
                  <strong>{draft.productName.slice(0, 1)}</strong>
                  <span>이미지 없음</span>
                </div>
              )}
            </div>
            <div className="resultBody">
              <div className="panelHeader">
                <div>
                  <h2>{draft.productName}</h2>
                  <p>{brand?.brandName ?? "브랜드 없음"}</p>
                </div>
                <span className="badge optional">{draftStatusLabel(draft.status)}</span>
              </div>
              <div className="resultMeta">
                <span>카테고리: {draft.category}</span>
                <span>컷 수: {draft.cutCount}</span>
                <span>이미지 생성: {jobStatusLabel(latestJob?.status)}</span>
                <span>
                  결과 컷: {completedCuts} / {latestJob?.expectedCutCount ?? draft.cutCount}
                </span>
              </div>
              <div className="actions resultActions">
                <Link className="button" href={`/detail-pages/${draft.id}/approval`}>
                  초안 확인
                </Link>
                {latestJob ? (
                  <Link className="button primary" href={`/detail-pages/${draft.id}/review?jobId=${latestJob.id}`}>
                    결과 보기
                  </Link>
                ) : (
                  <Link className="button" href={`/detail-pages/${draft.id}/approval`}>
                    이미지 생성
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}

        {!rows.length ? (
          <section className="panel">
            <h2>아직 만든 상세페이지가 없습니다.</h2>
            <p>브랜드를 등록한 뒤 첫 상세페이지를 생성하세요.</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="button primary" href="/detail-pages/new">
                상세페이지 만들기
              </Link>
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}
