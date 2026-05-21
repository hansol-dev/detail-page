export const userFacingTerms = {
  approvalMarkdown: "상세페이지 초안",
  rawMarkdown: "고급 편집",
  approveDraft: "초안 승인",
  approveDraftHelp: "이 초안으로 이미지 생성 준비",
  regenerateDraft: "초안 다시 만들기",
  saveAdvancedEdit: "고급 편집 저장",
  generateImage: "이미지 생성",
  testImage: "테스트 이미지",
  aiImage: "AI 생성 이미지",
  generationMethod: "생성 방식",
  reviewDraft: "초안 확인"
} as const;

export function draftStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "초안 작성",
    md_ready: "초안 확인",
    approved: "초안 승인",
    generating: "이미지 생성 중",
    generated: "이미지 생성 완료",
    revision_requested: "수정 요청"
  };
  return labels[status] ?? status;
}

export function jobStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    queued: "대기",
    running: "생성 중",
    succeeded: "완료",
    failed: "실패",
    canceled: "취소"
  };
  return status ? labels[status] ?? status : "작업 없음";
}

export function cutStatusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: "대기",
    running: "생성 중",
    produced: "생성됨",
    failed: "실패",
    needs_revision: "수정 요청",
    approved: "승인됨"
  };
  return labels[status] ?? status;
}
