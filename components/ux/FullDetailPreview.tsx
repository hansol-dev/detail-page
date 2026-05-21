import type { DownloadableCut } from "@/lib/ux/downloads";

export function FullDetailPreview({
  cuts,
  productName,
  actions
}: {
  cuts: DownloadableCut[];
  productName: string;
  actions?: React.ReactNode;
}) {
  if (!cuts.length) return null;

  return (
    <section className="panel fullPreview">
      <div className="panelHeader">
        <div>
          <h2>전체 상세페이지 미리보기</h2>
          <p>생성된 컷을 모바일 상세페이지 순서대로 이어서 확인합니다.</p>
        </div>
        {actions ? <div className="fullPreviewActions">{actions}</div> : null}
      </div>
      <div className="fullPreviewCanvas">
        {cuts.map((cut) => (
          <img
            key={cut.cutId}
            src={cut.href}
            alt={`${productName} Cut ${String(cut.cutNumber).padStart(2, "0")} ${cut.title}`}
          />
        ))}
      </div>
    </section>
  );
}
