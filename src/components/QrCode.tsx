"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a QR code for a URL as an inline image. Used on printable Auslan
 * cards so a phone camera pointed at the printed card opens the sign's video
 * demonstration — the legal way to put "how to sign it" on the wall, since
 * Signbank's own imagery can't be reproduced.
 */
export default function QrCode({ value, sizePx, className }: { value: string; sizePx: number; className?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 0, width: sizePx * 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        // A missing QR just means the card falls back to the printed URL text.
      });
    return () => {
      cancelled = true;
    };
  }, [value, sizePx]);

  if (!dataUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt={`QR code for ${value}`} width={sizePx} height={sizePx} className={className} />
  );
}
