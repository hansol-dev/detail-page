import type { ReactNode } from "react";

export function ProductFormSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <details className="formSection collapsibleSection full" open>
      <summary>
        <span>
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
      </summary>
      <div className="formSectionGrid">{children}</div>
    </details>
  );
}
