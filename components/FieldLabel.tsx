import type { FieldMeta } from "@/lib/types";

export function FieldLabel({ field }: { field: FieldMeta }) {
  return (
    <span className="labelLine">
      <span>{field.label}</span>
      <span className={`badge ${field.required ? "" : "optional"}`}>{field.required ? "필수" : "선택"}</span>
    </span>
  );
}
