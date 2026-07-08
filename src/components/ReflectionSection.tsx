"use client";

import { useRouter } from "next/navigation";
import ReflectionForm from "@/components/ReflectionForm";

export default function ReflectionSection({ ownerUserId }: { ownerUserId: string }) {
  const router = useRouter();
  return (
    <ReflectionForm
      ownerUserId={ownerUserId}
      onSaved={() => router.refresh()}
    />
  );
}
