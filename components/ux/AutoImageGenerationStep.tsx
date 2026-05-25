"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoImageGenerationStep({
  formId,
  jobId,
  pendingCutNumbers = [],
  thumbnailPending = false,
  concurrency = 3
}: {
  formId: string;
  jobId?: string;
  pendingCutNumbers?: number[];
  thumbnailPending?: boolean;
  concurrency?: number;
}) {
  const router = useRouter();
  const submittedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const pendingKey = useMemo(() => pendingCutNumbers.join(","), [pendingCutNumbers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;

      if (jobId && !thumbnailPending && pendingCutNumbers.length) {
        let cursor = 0;
        const workerCount = Math.max(1, Math.min(concurrency, pendingCutNumbers.length));
        Promise.all(
          Array.from({ length: workerCount }, async () => {
            while (cursor < pendingCutNumbers.length) {
              const cutNumber = pendingCutNumbers[cursor];
              cursor += 1;
              const response = await fetch(`/api/image-jobs/${jobId}/cuts/${cutNumber}`, { method: "POST" });
              if (!response.ok) {
                const body = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(body?.error || `Cut ${cutNumber} generation failed`);
              }
            }
          })
        )
          .catch((error) => {
            setErrorMessage(error instanceof Error ? error.message : "이미지 병렬 생성 중 오류가 발생했습니다.");
          })
          .finally(() => router.refresh());
        return;
      }

      const form = document.getElementById(formId);
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [concurrency, formId, jobId, pendingCutNumbers, pendingKey, router, thumbnailPending]);

  return (
    <>
      <button className="primary" type="submit">
        {jobId && !thumbnailPending && pendingCutNumbers.length ? "남은 컷 병렬 생성" : "다음 이미지 생성"}
      </button>
      {errorMessage ? <p className="danger">{errorMessage}</p> : null}
    </>
  );
}
