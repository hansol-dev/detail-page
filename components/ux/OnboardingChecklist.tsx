import Link from "next/link";
import type { OnboardingStep } from "@/lib/ux/onboarding";

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const current = steps.find((step) => step.status === "current") ?? steps[steps.length - 1];

  return (
    <section className="onboardingBand" aria-labelledby="onboarding-title">
      <div className="onboardingHeader">
        <div>
          <h2 id="onboarding-title">상세페이지 만들기</h2>
          <p>브랜드 준비부터 결과 다운로드까지 순서대로 진행하세요.</p>
        </div>
        {current ? (
          <Link className="button primary" href={current.href}>
            {current.actionLabel}
          </Link>
        ) : null}
      </div>
      <ol className="checklist">
        {steps.map((step, index) => (
          <li className={`checklistItem ${step.status}`} key={step.id}>
            <span className="checklistIndex">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
              {step.status === "current" ? (
                <Link href={step.href}>{step.actionLabel}</Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
