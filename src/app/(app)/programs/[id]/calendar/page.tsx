import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgram } from "@/lib/supabase/programs";
import { getRooms } from "@/lib/supabase/rooms";
import { DEFAULT_PROGRAM_BLOCKS } from "@/lib/programBlocks";
import { isWeekday, eachDateInRange } from "@/lib/programDates";
import PrintButton from "@/components/PrintButton";

function formatDayHeading(dateStr: string): { weekday: string; date: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("en-AU", { weekday: "long" }),
    date: d.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
  };
}

const ROW_TINTS = ["bg-cream", "bg-sage-light/40"];

export default async function ProgramCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [program, rooms] = await Promise.all([getProgram(id), getRooms()]);
  if (!program) notFound();

  const room = program.room_id ? rooms.find((r) => r.id === program.room_id) : null;
  const blocks = program.blocks.length > 0 ? program.blocks : DEFAULT_PROGRAM_BLOCKS;
  const weekdayDates = eachDateInRange(program.start_date, program.end_date).filter(isWeekday).slice(0, 5);

  function entriesFor(dayDate: string, blockKey: string) {
    return program!.entries
      .filter((e) => e.day_date === dayDate && e.block_key === blockKey)
      .sort((a, b) => a.order_index - b.order_index);
  }

  // Entries with no block assigned (or an unrecognized one — e.g. a block was
  // renamed/removed after they were sorted into it) never matched any of the
  // fixed block rows above and were silently dropped from the printed
  // calendar entirely — a published week with real content could print as
  // completely blank if an educator hadn't done the (non-blocking) manual
  // block-sorting step yet. Mirrors the "Other activities today" fallback
  // already used on the /today room-guide view for the same underlying data.
  const knownBlockKeys = new Set(blocks.map((b) => b.key));
  function unsortedEntriesFor(dayDate: string) {
    return program!.entries
      .filter((e) => e.day_date === dayDate && (!e.block_key || !knownBlockKeys.has(e.block_key)))
      .sort((a, b) => a.order_index - b.order_index);
  }
  const hasAnyUnsorted = weekdayDates.some((date) => unsortedEntriesFor(date).length > 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 print:px-0 print:py-0">
      <style>{"@page { size: A3 landscape; margin: 10mm; }"}</style>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/programs/${program.id}`} className="text-sm text-coral-dark hover:underline">
          ← Back to editor
        </Link>
        <PrintButton />
      </div>

      {program.status === "draft" && (
        <div className="mt-4 rounded-xl border-2 border-dashed border-coral bg-coral-light/50 px-4 py-2 text-center text-sm font-semibold text-coral-dark">
          DRAFT — not yet published. Publish from the editor before displaying this in the room.
        </div>
      )}

      <div className="mt-4 rounded-3xl border-4 border-sage bg-cream p-6 print:mt-2 print:rounded-2xl print:border-2 print:border-black print:bg-white">
        <div className="flex items-center justify-between gap-4 border-b-2 border-sage/40 pb-4 print:border-black">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark print:text-black">
              🌱 DR. SparkPlay — Weekly Program
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-coral-dark print:text-black">{program.title}</h1>
            <p className="mt-1 text-sm text-ink/70 print:text-black">
              {new Date(program.start_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
              {" – "}
              {new Date(program.end_date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
              {room && <> &nbsp;·&nbsp; {room.name}</>}
            </p>
          </div>
          <div className="hidden text-4xl print:text-3xl sm:block">🎨🧸🖍️</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className="w-40 border-2 border-sage/50 bg-sage-light px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-sage-dark print:border-black print:bg-white print:text-black">
                  Block of the day
                </th>
                {weekdayDates.map((date) => {
                  const { weekday, date: dateLabel } = formatDayHeading(date);
                  return (
                    <th
                      key={date}
                      className="border-2 border-sage/50 bg-coral px-3 py-2 text-left text-white print:border-black print:bg-white print:text-black"
                    >
                      <span className="block font-display text-base font-semibold">{weekday}</span>
                      <span className="block text-xs opacity-90 print:opacity-100">{dateLabel}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {blocks.map((block, i) => (
                <tr key={block.key} className={`${ROW_TINTS[i % 2]} break-inside-avoid print:bg-white`}>
                  <td className="border-2 border-sage/30 px-3 py-2 align-top text-xs font-semibold text-ink/80 print:border-black print:text-black">
                    {block.label}
                  </td>
                  {weekdayDates.map((date) => {
                    const dayEntries = entriesFor(date, block.key);
                    return (
                      <td key={date} className="border-2 border-sage/30 px-3 py-2 align-top print:border-black">
                        {dayEntries.length === 0 ? (
                          <span className="text-xs text-ink/20 print:text-black/20">—</span>
                        ) : (
                          <ul className="space-y-1.5">
                            {dayEntries.map((e) => (
                              <li key={e.id}>
                                <p className="text-sm font-medium text-ink print:text-black">{e.title}</p>
                                {e.notes && <p className="text-xs text-ink/60 print:text-black/80">{e.notes}</p>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {hasAnyUnsorted && (
                <tr className="bg-amber-light/60 break-inside-avoid print:bg-white">
                  <td className="border-2 border-sage/30 px-3 py-2 align-top text-xs font-semibold text-ink/80 print:border-black print:text-black">
                    Other activities
                  </td>
                  {weekdayDates.map((date) => {
                    const dayEntries = unsortedEntriesFor(date);
                    return (
                      <td key={date} className="border-2 border-sage/30 px-3 py-2 align-top print:border-black">
                        {dayEntries.length === 0 ? (
                          <span className="text-xs text-ink/20 print:text-black/20">—</span>
                        ) : (
                          <ul className="space-y-1.5">
                            {dayEntries.map((e) => (
                              <li key={e.id}>
                                <p className="text-sm font-medium text-ink print:text-black">{e.title}</p>
                                {e.notes && <p className="text-xs text-ink/60 print:text-black/80">{e.notes}</p>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {program.cultural_days.length > 0 && (
          <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-light px-4 py-2 print:border-black print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-dark print:text-black">
              Cultural &amp; national days this week
            </p>
            <p className="mt-1 text-sm text-amber-dark/90 print:text-black">
              {program.cultural_days.map((d) => `${d.name} (${d.date})`).join("  •  ")}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink/40 print:text-black">
          Displayed for families — questions? Ask your child&rsquo;s educator.
        </p>
      </div>
    </div>
  );
}
