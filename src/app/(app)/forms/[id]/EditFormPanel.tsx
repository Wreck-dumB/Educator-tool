"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass, primaryButtonClass, secondaryButtonClass, errorBannerClass } from "@/lib/ui";
import { updateFormTemplate } from "../actions";

interface Props {
  id: string;
  category: string;
  title: string;
  purpose: string | null;
  bodyText: string | null;
  fieldsToComplete: string[];
  requiresSignature: boolean;
}

export default function EditFormPanel({
  id,
  category,
  title,
  purpose,
  bodyText,
  fieldsToComplete,
  requiresSignature,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-coral-light px-4 py-1.5 text-sm font-medium text-coral-dark hover:bg-coral-light"
      >
        Edit form
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateFormTemplate(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-coral-light bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">Edit form</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink/40 hover:text-ink/70"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={id} />

        <div>
          <label htmlFor="ef_category" className="block text-sm font-medium text-ink/70">
            Category
          </label>
          <input
            id="ef_category"
            name="category"
            type="text"
            required
            defaultValue={category}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="ef_title" className="block text-sm font-medium text-ink/70">
            Title
          </label>
          <input
            id="ef_title"
            name="title"
            type="text"
            required
            defaultValue={title}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="ef_purpose" className="block text-sm font-medium text-ink/70">
            Purpose
          </label>
          <textarea
            id="ef_purpose"
            name="purpose"
            rows={2}
            defaultValue={purpose ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="ef_body_text" className="block text-sm font-medium text-ink/70">
            Body text
          </label>
          <textarea
            id="ef_body_text"
            name="body_text"
            rows={6}
            defaultValue={bodyText ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="ef_fields" className="block text-sm font-medium text-ink/70">
            Fields to complete
            <span className="ml-1 text-xs font-normal text-ink/40">(one per line)</span>
          </label>
          <textarea
            id="ef_fields"
            name="fields_to_complete"
            rows={4}
            defaultValue={fieldsToComplete.join("\n")}
            className={inputClass}
          />
        </div>

        <div>
          <p className="block text-sm font-medium text-ink/70">Signature block</p>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="radio"
                name="requires_signature"
                value="true"
                defaultChecked={requiresSignature}
              />
              Include
            </label>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="radio"
                name="requires_signature"
                value="false"
                defaultChecked={!requiresSignature}
              />
              Exclude
            </label>
          </div>
        </div>

        {error && <p className={errorBannerClass}>{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClass}>
            Cancel
          </button>
        </div>
        <p className="text-xs text-ink/40">Saving will revert this form to Draft status.</p>
      </form>
    </div>
  );
}
