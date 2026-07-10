import type { Material } from "@/lib/types/domain";

export interface MaterialStatus {
  name: string;
  match: Material | null;
  status: "in_stock" | "low_stock" | "not_in_inventory";
}

export function matchMaterial(name: string, inventory: Material[]): Material | null {
  const q = name.toLowerCase().trim();
  const exact = inventory.find((m) => m.name.toLowerCase() === q);
  if (exact) return exact;
  return (
    inventory.find(
      (m) => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase()),
    ) ?? null
  );
}

export function getMaterialStatuses(names: string[], inventory: Material[]): MaterialStatus[] {
  return names.map((name) => {
    const match = matchMaterial(name, inventory);
    let status: MaterialStatus["status"] = "not_in_inventory";
    if (match) {
      const isLow =
        match.quantity !== null &&
        match.low_stock_threshold !== null &&
        match.quantity <= match.low_stock_threshold;
      status = isLow ? "low_stock" : "in_stock";
    }
    return { name, match, status };
  });
}

// Returns only items that need action before the activity runs.
export function itemsToSource(statuses: MaterialStatus[]): MaterialStatus[] {
  return statuses.filter((s) => s.status !== "in_stock");
}
