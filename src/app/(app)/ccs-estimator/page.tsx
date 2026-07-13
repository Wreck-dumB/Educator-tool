import type { Metadata } from "next";
import CcsCalculator from "./CcsCalculator";

export const metadata: Metadata = { title: "CCS / Gap Fee Estimator · DR. SparkPlay" };

export default function CcsEstimatorPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">CCS / Gap Fee Estimator</h1>
      <p className="mt-1 text-sm text-ink/60">
        Estimate the out-of-pocket gap fee a family will pay after Child Care Subsidy is applied.
        This is a guide only — actual CCS is determined by Services Australia based on each family&apos;s
        assessed percentage, activity test, and the relevant Hourly Rate Cap.
      </p>
      <CcsCalculator />
    </div>
  );
}
