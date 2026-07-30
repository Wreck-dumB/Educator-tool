import type { PolicyStep } from "@/lib/types/domain";

// Shared "Procedure" renderer for a policy's structured steps - used by the
// saved policy view, the fresh-generation preview, and the document
// review/regenerate preview, so a heading looks like a heading and a bullet
// stays a bullet everywhere a policy is shown, matching the Word export
// (see policyDocx.ts).
export default function PolicySteps({ steps }: { steps: PolicyStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-1 space-y-1.5">
      {steps.map((step, idx) => {
        if (step.type === "heading") {
          return (
            <p
              key={idx}
              className={`text-sm font-semibold text-ink print:text-black ${step.level > 0 ? "mt-2 pl-4" : "mt-3"}`}
            >
              {step.text}
            </p>
          );
        }
        if (step.type === "list_item") {
          return (
            <div
              key={idx}
              className={`flex gap-2 text-sm text-ink/80 print:text-black ${step.level > 0 ? "pl-9" : "pl-4"}`}
            >
              <span className="shrink-0">•</span>
              <span>{step.text}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="text-sm text-ink/80 print:text-black">
            {step.text}
          </p>
        );
      })}
    </div>
  );
}
