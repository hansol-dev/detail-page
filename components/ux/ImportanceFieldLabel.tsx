import type { FieldMeta } from "@/lib/types";

const labelByImportance = {
  required: "필수",
  recommended: "권장",
  optional: "선택",
  confirmation: "최종 확인 필요"
} as const;

const classByImportance = {
  required: "",
  recommended: "recommended",
  optional: "optional",
  confirmation: "warning"
} as const;

export function ImportanceFieldLabel({ field }: { field: FieldMeta }) {
  const importance = field.importance ?? (field.required ? "required" : "optional");
  const badgeClass = classByImportance[importance];

  return (
    <span className="labelLine">
      <span>{field.label}</span>
      <span className={`badge ${badgeClass}`.trim()}>{labelByImportance[importance]}</span>
    </span>
  );
}
