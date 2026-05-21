"use client";

export function CloseDetailsButton({ children = "닫기" }: { children?: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        if (details) details.open = false;
      }}
    >
      {children}
    </button>
  );
}
