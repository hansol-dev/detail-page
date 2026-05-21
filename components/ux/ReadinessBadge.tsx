import type { GenerationReadiness } from "@/lib/ux/generation-readiness";

export function ReadinessBadge({ readiness }: { readiness: GenerationReadiness }) {
  return (
    <div className={`readinessBox ${readiness.productionReady ? "ready" : "test"}`}>
      <div className="panelHeader">
        <strong>{readiness.label}</strong>
        <span className={`badge ${readiness.productionReady ? "" : "warning"}`}>
          {readiness.productionReady ? "판매용 검토 가능" : "테스트"}
        </span>
      </div>
      <p>
        로고 {readiness.referenceStatus.logo === "uploaded" ? "업로드됨" : "없음"} · 상품 사진{" "}
        {readiness.referenceStatus.productPhotoCount}개
      </p>
      {readiness.warnings.length ? (
        <ul>
          {readiness.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
