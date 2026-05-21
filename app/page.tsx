import Link from "next/link";
import { OnboardingChecklist } from "@/components/ux/OnboardingChecklist";
import { getCurrentUserId, readDb } from "@/lib/store";
import { listBrands } from "@/lib/services/brands";
import { listProductDrafts } from "@/lib/services/product-drafts";
import { buildOnboardingSteps, currentOnboardingStep } from "@/lib/ux/onboarding";
import { draftStatusLabel } from "@/lib/ux/copy";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  const brands = await listBrands(userId);
  const drafts = await listProductDrafts(userId);
  const jobs = db.imageGenerationJobs.filter((job) => drafts.some((draft) => draft.id === job.productDraftId));
  const cuts = db.generatedCuts.filter((cut) => jobs.some((job) => job.id === cut.imageGenerationJobId));
  const steps = buildOnboardingSteps({ brandCount: brands.length, drafts, jobs, cuts });
  const currentStep = currentOnboardingStep(steps);

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>상세페이지 작업대</h1>
          <p>{user?.displayName ?? "사용자"} 계정의 브랜드, 상품 초안, 이미지 생성 상태를 관리합니다.</p>
        </div>
        <Link className="button primary" href={currentStep.href}>
          {currentStep.actionLabel}
        </Link>
      </header>

      <OnboardingChecklist steps={steps} />

      <section className="grid three">
        <div className="panel">
          <h2>{brands.length} / 5</h2>
          <p>등록 브랜드</p>
        </div>
        <div className="panel">
          <h2>{drafts.length}</h2>
          <p>상품 초안</p>
        </div>
        <div className="panel">
          <h2>{jobs.length}</h2>
          <p>이미지 생성 작업</p>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panelHeader">
          <h2>최근 상품 초안</h2>
          <Link className="button" href="/detail-pages">
            전체 결과
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>상품명</th>
              <th>상태</th>
              <th>컷 수</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.id}>
                <td>{draft.productName}</td>
                <td>{draftStatusLabel(draft.status)}</td>
                <td>{draft.cutCount}</td>
                <td>
                  <Link className="button" href={`/detail-pages/${draft.id}/approval`}>
                    초안 확인
                  </Link>
                </td>
              </tr>
            ))}
            {!drafts.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  아직 상품 초안이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
