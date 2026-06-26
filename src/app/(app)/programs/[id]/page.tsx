import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram } from "@/lib/supabase/programs";
import PrintButton from "@/components/PrintButton";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();

  const entriesByDay = program.entries.reduce<Record<string, typeof program.entries>>((acc, e) => {
    (acc[e.day_date] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/programs" className="text-sm text-coral-dark hover:underline">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <h1 className="font-display text-2xl font-semibold text-coral-dark print:text-black">{program.title}</h1>
        <p className="mt-1 text-sm text-ink/60 print:text-black">
          {new Date(program.start_date).toLocaleDateString()} – {new Date(program.end_date).toLocaleDateString()}
        </p>

        {program.cultural_days.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-light p-3 print:rounded-none print:border print:border-black print:bg-white print:text-black">
            <p className="text-sm font-medium text-amber-dark print:text-black">Cultural &amp; national days</p>
            <ul className="mt-1 space-y-1 text-sm text-amber-dark/90 print:text-black">
              {program.cultural_days.map((d, idx) => (
                <li key={idx}>
                  <span className="font-medium">{d.date}:</span> {d.name} ({d.origin})
                  {d.confidence === "approximate" && <span className="ml-1 text-xs italic">— verify exact date</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {Object.entries(entriesByDay).map(([day, entries]) => (
            <div key={day} className="break-inside-avoid">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50 print:text-black">
                {new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              {entries.map((e) => (
                <div key={e.id} className="mt-1 border-b border-ink/10 pb-2">
                  <p className="text-sm font-medium text-ink print:text-black">
                    {e.title}
                    {e.activity_id && (
                      <Link
                        href={`/activities/${e.activity_id}`}
                        className="ml-2 text-xs font-medium text-coral-dark hover:underline print:hidden"
                      >
                        view saved activity →
                      </Link>
                    )}
                  </p>
                  {e.notes && <p className="mt-0.5 text-sm text-ink/70 print:text-black">{e.notes}</p>}
                  {e.eylf_codes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.eylf_codes.map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-sage-light px-2 py-0.5 text-xs font-medium text-sage-dark print:border print:border-black print:bg-white print:text-black"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-ink/20 pt-4 text-sm text-ink/60 print:text-black">
          <p>Displayed for families on: ______________________</p>
        </div>
      </div>
    </div>
  );
}
