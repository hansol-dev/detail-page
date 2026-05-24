"use client";

import { useEffect, useRef } from "react";

export function AutoImageGenerationStep({ formId }: { formId: string }) {
  const submittedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const form = document.getElementById(formId);
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [formId]);

  return (
    <button className="primary" type="submit">
      다음 이미지 생성
    </button>
  );
}
