import type { DraftStatus, GeneratedCut, ImageGenerationJob, ProductDraft } from "@/lib/types";

export type ResultFilter = "all" | "draft" | "review" | "generated" | "revision";

export const resultFilters: Array<{ id: ResultFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "draft", label: "초안 작성" },
  { id: "review", label: "초안 확인" },
  { id: "generated", label: "이미지 생성 완료" },
  { id: "revision", label: "수정 요청" }
];

export function normalizeResultFilter(value: string | undefined): ResultFilter {
  return resultFilters.some((item) => item.id === value) ? (value as ResultFilter) : "all";
}

export function matchesResultFilter(input: {
  filter: ResultFilter;
  draft: ProductDraft;
  latestJob?: ImageGenerationJob;
  cuts: GeneratedCut[];
}) {
  const status = input.draft.status as DraftStatus;
  if (input.filter === "all") return true;
  if (input.filter === "draft") return status === "draft";
  if (input.filter === "review") return ["md_ready", "approved"].includes(status);
  if (input.filter === "generated") return status === "generated" || input.latestJob?.status === "succeeded";
  if (input.filter === "revision") {
    return status === "revision_requested" || input.cuts.some((cut) => cut.status === "needs_revision");
  }
  return true;
}
