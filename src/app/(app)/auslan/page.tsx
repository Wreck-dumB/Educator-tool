import AuslanDictionary from "./AuslanDictionary";

export default function AuslanPage() {
  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="print:hidden">
        <h1 className="font-display text-3xl font-semibold text-coral-dark">Auslan Dictionary</h1>
        <p className="mt-1 text-sm text-ink/60">
          Search everyday early-childhood words, watch the real Auslan sign demonstrated on video, and
          print picture cards as visual aids for your room. Every printed card includes a QR code —
          point a phone at the card on the wall and the sign&apos;s video demonstration opens.
        </p>
        <p className="mt-2 rounded-xl bg-sage-light px-3 py-2 text-xs text-sage-dark">
          Video demonstrations open on <span className="font-semibold">Auslan Signbank</span> (auslan.org.au), the
          authoritative Australian Sign Language dictionary. Auslan has Northern and Southern dialects — Signbank
          shows regional variants, so check which sign is used in your community. Always learn the sign from the
          video, not from a picture alone.
        </p>
      </div>

      <AuslanDictionary />
    </div>
  );
}
