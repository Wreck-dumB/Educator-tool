"use server";

import { savePolicy } from "@/app/(app)/policies/actions";
import { saveQipItems } from "@/app/(app)/qip/actions";
import { getOrCreateQip } from "@/lib/supabase/qip";
import type { PolicySuggestion } from "@/lib/types/domain";

export interface QipSuggestionInput {
  qualityAreaNumber: number;
  standardCode: string | null;
  description: string;
}

export async function saveReviewedPolicy(
  category: string,
  amendmentNotes: string,
  suggestion: PolicySuggestion,
  qipItem: QipSuggestionInput | null,
): Promise<{ policyId: string; qipLogged: boolean } | { error: string }> {
  const policyResult = await savePolicy(
    category,
    amendmentNotes || "Regenerated from an uploaded document via AI document review.",
    suggestion,
  );
  if ("error" in policyResult) return { error: policyResult.error };

  let qipLogged = false;
  if (qipItem) {
    const qip = await getOrCreateQip();
    if (qip) {
      const result = await saveQipItems(qip.id, [
        {
          qualityAreaNumber: qipItem.qualityAreaNumber,
          standardCode: qipItem.standardCode,
          itemType: "improvement",
          description: qipItem.description,
          priority: "medium",
          successMeasure: null,
          steps: [],
          timeframe: null,
        },
      ]);
      qipLogged = !("error" in result);
    }
  }

  return { policyId: policyResult.id, qipLogged };
}
