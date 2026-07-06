import Link from "next/link";
import { notFound } from "next/navigation";
import { getPoster, getPosterImageUrl } from "@/lib/supabase/posters";
import PrintButton from "@/components/PrintButton";
import PosterView from "../PosterView";

export default async function PosterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poster = await getPoster(id);
  if (!poster) notFound();

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
