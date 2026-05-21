"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEFAULT_ALERT = "요청을 처리합니다.";

type PendingSubmission = {
  form: HTMLFormElement;
  submitter: HTMLElement | null;
  alertMessage: string;
  confirmMessage: string | null;
  busyMessage: string | null;
};

function elementMessage(element: HTMLElement | null, name: string) {
  return element?.getAttribute(name)?.trim() || null;
}

function isMutationFetch(...args: Parameters<typeof window.fetch>) {
  const [input, init] = args;
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  return method.toUpperCase() !== "GET";
}

export function ActionFeedback() {
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSubmission | null>(null);
  const shouldClearAfterFetchRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    setBusyMessage(null);
    setPending(null);
    shouldClearAfterFetchRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const trackedFetch: typeof window.fetch = async (...args) => {
      const shouldClearAfterFetch = shouldClearAfterFetchRef.current && isMutationFetch(...args);

      try {
        return await originalFetch(...args);
      } finally {
        if (shouldClearAfterFetch) {
          shouldClearAfterFetchRef.current = false;
          setBusyMessage(null);
        }
      }
    };
    window.fetch = trackedFetch;

    function onSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || form.dataset.actionFeedback === "off") return;
      if (form.dataset.feedbackSubmitting === "true") {
        form.dataset.feedbackSubmitting = "false";
        return;
      }

      const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
      const alertMessage = elementMessage(submitter, "data-alert") || form.dataset.alert?.trim() || DEFAULT_ALERT;
      const confirmMessage = elementMessage(submitter, "data-confirm") || form.dataset.confirm?.trim() || null;
      const nextBusyMessage = elementMessage(submitter, "data-busy") || form.dataset.busy?.trim() || null;

      event.preventDefault();
      setPending({
        form,
        submitter,
        alertMessage,
        confirmMessage,
        busyMessage: nextBusyMessage
      });
    }

    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      if (window.fetch === trackedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  function submitPending() {
    if (!pending) return;
    const { form, submitter, busyMessage: nextBusyMessage } = pending;
    setPending(null);
    form.dataset.feedbackSubmitting = "true";

    if (nextBusyMessage) {
      shouldClearAfterFetchRef.current = true;
      setBusyMessage(nextBusyMessage);
    }

    window.requestAnimationFrame(() => {
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        form.requestSubmit(submitter);
      } else {
        form.requestSubmit();
      }
    });
  }

  return (
    <>
      {pending ? (
        <div className="feedbackOverlay" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div className="feedbackDialog">
            <div className="feedbackIcon" aria-hidden="true">
              {pending.confirmMessage ? "?" : "i"}
            </div>
            <div>
              <h2 id="feedback-title">{pending.confirmMessage ? "확인 필요" : "처리 안내"}</h2>
              <p>{pending.confirmMessage ?? pending.alertMessage}</p>
              {pending.confirmMessage ? <small>{pending.alertMessage}</small> : null}
            </div>
            <div className="feedbackActions">
              {pending.confirmMessage ? (
                <button type="button" onClick={() => setPending(null)}>
                  취소
                </button>
              ) : null}
              <button className="primary" type="button" onClick={submitPending}>
                {pending.confirmMessage ? "진행" : "확인"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {busyMessage ? (
        <div className="busyOverlay" role="alert" aria-live="assertive" aria-busy="true">
          <div className="busyPanel">
            <div className="busySpinner" aria-hidden="true" />
            <strong>{busyMessage}</strong>
            <p>완료될 때까지 화면을 닫지 말고 잠시만 기다려주세요.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
