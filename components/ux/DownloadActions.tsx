"use client";

import type { DownloadableCut } from "@/lib/ux/downloads";

function triggerDownload(cut: DownloadableCut) {
  const link = document.createElement("a");
  link.href = cut.href;
  link.download = cut.fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function DownloadActions({ cuts }: { cuts: DownloadableCut[] }) {
  function downloadAll() {
    cuts.forEach((cut, index) => {
      window.setTimeout(() => triggerDownload(cut), index * 250);
    });
  }

  return (
    <div className="downloadActions">
      <button className="primary" type="button" onClick={downloadAll} disabled={!cuts.length}>
        전체 다운로드
      </button>
      <p>브라우저가 여러 파일 다운로드를 차단하면 컷별 다운로드를 사용하세요.</p>
    </div>
  );
}
