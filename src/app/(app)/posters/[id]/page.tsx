import Link from "next/link";
import { notFound } from "next/navigation";
import { getPoster, getPosterImageUrl } from "@/lib/supabase/posters";
import PrintButton from "@/components/PrintButton";
import PosterView from "../PosterView";
import PosterMaker from "../PosterMaker";

export default async function PosterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poster = await getPoster(id);
  if (!poster) notFound();

  // Canvas-based poster — re-open in the full editor so they can keep editing, then download
  if (poster.canvas_json) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center gap-4 print:hidden">
          <Link href="/posters" className="text-sm text-coral-dark hover:underline">
            ← Back to posters
          </Link>
          <h1 className="font-display text-xl font-semibold text-ink">{poster.title}</h1>
        </div>
        <PosterMaker initialJson={poster.canvas_json} posterId={id} />
      </div>
    );
  }

  // Legacy HTML poster (pre-canvas) — static print view
  const imageUrl =
    poster.image_source === "upload" && poster.image_path
      ? await getPosterImageUrl(poster.image_path)
      : poster.image_url;

  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/posters" className="text-sm text-coral-dark hover:underline">
          ← Back to posters
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 print:mt-0">
        <PosterView
          large
          poster={{
            title: poster.title,
            subtitle: poster.subtitle,
            bodyText: poster.body_text,
            footerText: poster.footer_text,
            theme: poster.theme,
            imageUrl,
            imageCredit: poster.image_credit,
          }}
        />
      </div>
    </div>
  );
}
