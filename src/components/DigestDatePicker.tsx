"use client";

import { useRouter } from "next/navigation";

export default function DigestDatePicker({ date }: { date: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={date}
      onChange={(e) => {
        if (e.target.value) router.push(`/digest?date=${e.target.value}`);
      }}
      className="rounded-xl border border-coral-light bg-white px-3 py-1.5 text-sm text-ink shadow-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
    />
  );
}
