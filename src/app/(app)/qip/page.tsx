import { getOrCreateQip, getQipItems, getNqsStandards } from "@/lib/supabase/qip";
import { getMyStaffRole } from "@/lib/supabase/staff";
import { cardClass } from "@/lib/ui";
import PrintButton from "@/components/PrintButton";
import QipGeneratorForm from "./QipGeneratorForm";
import StatusSelect from "./StatusSelect";
import { deleteQipItem, updateQipContextNotes } from "./actions";
import type { QipItem } from "@/lib/types/domain";

const QUALITY_AREA_TITLES: Record<number, string> = {
  1: "Educational program and practice",
  2: "Children's health and safety",
  3: "Physical environment",
  4: "Staffing arrangements",
  5: "Relationships with children",
  6: "Collaborative partnerships with families and communities",
  7: "Governance and leadership",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  achieved: "Achieved",
};

export default async function QipPage() {
  const [qip, myRole] = await Promise.all([getOrCreateQip(), getMyStaffRole()]);
  if (!qip) return null;
  const canManage = myRole === "director" || myRole === "2ic";
  const isDirector = myRole === "director";

  const [items, standards] = await Promise.all([getQipItems(qip.id), getNqsStandards()]);
  const standardTitleByCode = new Map(standards.map((s) => [s.code, s.standard_title]));

  const itemsByArea = items.reduce<Record<number, QipItem[]>>((acc, item) => {
    (acc[item.quality_area_number] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-semibold text-coral-dark">Quality Improvement Plan</h1>
          <p className="mt-1 text-sm text-ink/60">
            Generate strength and improvement entries against the National Quality Standard&apos;s 7
            quality areas, then track progress over time. This is a working draft for your service to
            review and own — not a finished, certified self-assessment.
          </p>
        </div>
        <PrintButton />
      </div>

      {canManage && (
        <div className={`mt-6 p-4 print:hidden ${cardClass}`}>
          <form action={updateQipContextNotes}>
            <input type="hidden" name="qip_id" value={qip.id} />
            <label htmlFor="context_notes" className="block text-sm font-medium text-ink/70">
              About our service (shown at the top of the printed plan)
            </label>
            <textarea
              id="context_notes"
              name="context_notes"
              rows={2}
              defaultValue={qip.context_notes ?? ""}
              placeholder="e.g. service type, age groups, approval number, philosophy summary"
              className="mt-1 block w-full rounded-xl border border-coral-light bg-white px-3 py-2 text-sm shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
            />
            <button type="submit" className="mt-2 text-xs font-medium text-coral-dark hover:underline">
              Save
            </button>
          </form>
        </div>
      )}

      {qip.context_notes && <p className="mt-4 hidden text-sm text-ink/70 print:block">{qip.context_notes}</p>}

      {canManage && (
        <div className="mt-6 print:hidden">
          <QipGeneratorForm qipId={qip.id} />
        </div>
      )}

      <div className="mt-6 space-y-5">
        {([1, 2, 3, 4, 5, 6, 7] as const).map((qa) => {
          const areaItems = itemsByArea[qa] ?? [];
          return (
            <div key={qa} className={`p-4 print:border print:border-black print:bg-white ${cardClass}`}>
              <h2 className="font-display text-lg font-semibold text-ink print:text-black">
                Quality Area {qa} — {QUALITY_AREA_TITLES[qa]}
              </h2>

              {areaItems.length === 0 ? (
                <p className="mt-2 text-sm text-ink/40 print:hidden">No items yet for this quality area.</p>
              ) : (
                <ul className="mt-3 divide-y divide-coral-light">
                  {areaItems.map((item) => (
                    <li key={item.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-ink/40 print:text-black">
                            {item.item_type === "strength" ? "Strength" : "Improvement"}
                            {item.standard_code && ` · ${item.standard_code} ${standardTitleByCode.get(item.standard_code) ?? ""}`}
                            {item.priority && ` · ${item.priority} priority`}
                          </p>
                          <p className="mt-0.5 text-sm text-ink/80 print:text-black">{item.description}</p>
                          {item.item_type === "improvement" && (
                            <div className="mt-1 space-y-0.5 text-xs text-ink/60 print:text-black">
                              {item.success_measure && <p>How we&apos;ll know: {item.success_measure}</p>}
                              {item.timeframe && <p>Timeframe: {item.timeframe}</p>}
                              {item.steps.length > 0 && (
                                <ul className="list-disc pl-4">
                                  {item.steps.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 print:hidden">
                          {item.item_type === "improvement" ? (
                            canManage ? (
                              <StatusSelect itemId={item.id} status={item.status} />
                            ) : (
                              <span className="rounded-full bg-coral-light px-2 py-0.5 text-xs font-medium text-coral-dark">
                                {STATUS_LABELS[item.status]}
                              </span>
                            )
                          ) : (
                            <span className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark">
                              Strength
                            </span>
                          )}
                          {isDirector && (
                            <form action={deleteQipItem}>
                              <input type="hidden" name="item_id" value={item.id} />
                              <button type="submit" className="text-xs text-coral-dark hover:underline">
                                Remove
                              </button>
                            </form>
                          )}
                        </div>
                        <p className="hidden shrink-0 text-xs font-medium print:block print:text-black">
                          {item.item_type === "improvement" ? STATUS_LABELS[item.status] : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
