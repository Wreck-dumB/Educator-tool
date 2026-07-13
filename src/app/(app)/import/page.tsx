import type { Metadata } from "next";
import Link from "next/link";
import { cardClass } from "@/lib/ui";
import DocumentReviewForm from "@/components/DocumentReviewForm";

export const metadata: Metadata = { title: "Document Import & Review · DR. SparkPlay" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">
        Document Import &amp; Review
      </h1>
      <p className="mt-1 text-sm text-ink/60">
        Upload an existing policy, form, or procedure and get AI-powered feedback on how to improve
        it or bring it up to NQS/EYLF standards before importing it into DR. SparkPlay.
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="text-ink/40">Jump to:</span>
        <Link href="/policies" className="text-coral-dark hover:underline">Policies</Link>
        <span className="text-ink/20">·</span>
        <Link href="/forms" className="text-coral-dark hover:underline">Document Templates</Link>
        <span className="text-ink/20">·</span>
        <Link href="/safe-work-procedures" className="text-coral-dark hover:underline">Safe Work Procedures</Link>
      </div>

      <div className={`mt-6 p-5 ${cardClass}`}>
        <DocumentReviewForm />
      </div>

      <div className={`mt-4 p-4 ${cardClass}`}>
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-ink/40">
          How it works
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-ink/70">
          <li className="flex gap-3">
            <span className="font-bold text-coral-dark">1.</span>
            <span>Upload a PDF or Word document from your existing files.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-coral-dark">2.</span>
            <span>DR. SparkPlay reads the document and checks it against NQS standards, EYLF requirements, and best practice for Australian childcare services.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-coral-dark">3.</span>
            <span>You get a quality score, a list of gaps, and specific suggestions for improvement.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-coral-dark">4.</span>
            <span>Once you&apos;re happy with the document, add it to DR. SparkPlay manually via Policies, Document Templates, or Safe Work Procedures.</span>
          </li>
        </ol>
        <p className="mt-3 text-xs text-ink/40">
          Your document is not stored — it is read in memory and discarded after the review is complete.
        </p>
      </div>
    </div>
  );
}
