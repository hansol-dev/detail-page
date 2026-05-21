import type { ReactNode } from "react";

export function AdvancedMarkdownEditor({ children }: { children: ReactNode }) {
  return (
    <details className="advancedEditor">
      <summary>고급 편집</summary>
      <p>초안 원문을 직접 수정해야 할 때만 사용하세요. 저장 후 카드 검토 내용도 함께 갱신됩니다.</p>
      <div className="advancedEditorBody">{children}</div>
    </details>
  );
}
