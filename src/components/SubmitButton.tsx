"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Disables itself while its parent form action is pending - a plain
 * <button type="submit"> has no way to know a submission is in flight, so a
 * fast double-click fires the server action twice before the first redirect
 * lands (confirmed live: double-clicking "Add child" created 2 records).
 */
export default function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
