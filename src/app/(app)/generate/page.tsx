import Link from "next/link";
import { getEylfOutcomes } from "@/lib/supabase/eylf";
import { getMaterials } from "@/lib/supabase/materials";
import { getChildren } from "@/lib/supabase/children";
import GenerateForm from "./GenerateForm";

export default async function GeneratePage() {
  const [outcomes, materials, children] = await Promise.all([
    getEylfOutcomes(),
    getMaterials(),
    getChildren(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Generate an activity</h1>
      <p className="mt-2 text-ink/70">
        Tell SparkPlay what you have on hand &mdash; materials, time, group size, energy
        level, or a learning outcome &mdash; and get a few EYLF-linked activity ideas.
      </p>

      {materials.length === 0 && children.length === 0 && (
        <p className="mt-4 rounded-xl bg-amber-light px-3 py-2 text-sm text-amber-dark">
          Tip: save your{" "}
          <Link href="/materials" className="font-medium underline">
            commonly-used materials
          </Link>{" "}
          and add{" "}
          <Link href="/children" className="font-medium underline">
            child profiles
          </Link>{" "}
          so generation can be tailored &mdash; or just hit &ldquo;Surprise me&rdquo; below
          right now.
        </p>
      )}

      <div className="mt-6">
        <GenerateForm outcomes={outcomes} materials={materials} childProfiles={children} />
      </div>
    </div>
  );
}
