"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadServiceLogo, removeServiceLogo, updateServiceName } from "./actions";
import { errorBannerClass, successBannerClass } from "@/lib/ui";

interface Props {
  isDirector: boolean;
  currentLogoUrl: string | null;
  currentDisplayName: string | null;
  serviceName: string;
}

export default function SettingsClient({
  isDirector,
  currentLogoUrl,
  currentDisplayName,
  serviceName,
}: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState(false);
  const [removePending, startRemoveTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();
  const [namePending, startNameTransition] = useTransition();
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoSuccess(false);
    // Local preview
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    setLogoError(null);
    setLogoSuccess(false);
    startUploadTransition(async () => {
      const result = await uploadServiceLogo(fd);
      if ("error" in result) {
        setLogoError(result.error);
      } else {
        // Construct public URL for immediate preview
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const url = `${supabaseUrl}/storage/v1/object/public/service-logos/${result.logoPath}?t=${Date.now()}`;
        setLogoUrl(url);
        setPreview(null);
        setLogoSuccess(true);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeServiceLogo();
      if (result.error) {
        setLogoError(result.error);
      } else {
        setLogoUrl(null);
        setPreview(null);
        setLogoSuccess(false);
      }
    });
  }

  function handleNameSave(formData: FormData) {
    setNameError(null);
    setNameSuccess(false);
    startNameTransition(async () => {
      const result = await updateServiceName(formData);
      if (result.error) {
        setNameError(result.error);
      } else {
        setNameSuccess(true);
      }
    });
  }

  const displayImg = preview ?? logoUrl;

  return (
    <div className="flex flex-col gap-6 max-w-xl">

      {/* Centre name */}
      <section className="rounded-2xl border border-coral-light bg-white p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-1">Centre name</h2>
        <p className="text-sm text-ink/50 mb-4">
          Shown on the kiosk screen and throughout the app.
        </p>
        <form action={handleNameSave} className="flex flex-col gap-3">
          <input
            name="name"
            type="text"
            defaultValue={currentDisplayName ?? serviceName}
            maxLength={200}
            required
            disabled={!isDirector || namePending}
            placeholder="e.g. Sunshine Kids Childcare"
            className="rounded-xl border border-coral-light px-3 py-2.5 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none disabled:bg-ink/5 disabled:text-ink/40"
          />
          {!isDirector && (
            <p className="text-xs text-ink/40">Only the Director can change the centre name.</p>
          )}
          {nameError && <p className={errorBannerClass}>{nameError}</p>}
          {nameSuccess && <p className={successBannerClass}>Centre name updated — visible on the kiosk immediately.</p>}
          {isDirector && (
            <button
              type="submit"
              disabled={namePending}
              className="self-start rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
            >
              {namePending ? "Saving…" : "Save name"}
            </button>
          )}
        </form>
      </section>

      {/* Centre logo */}
      <section className="rounded-2xl border border-coral-light bg-white p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-1">Centre logo</h2>
        <p className="text-sm text-ink/50 mb-4">
          Displayed on the kiosk sign-in screen. PNG with a transparent background works best. Max 2 MB.
        </p>

        {/* Current / preview */}
        {displayImg ? (
          <div className="mb-4 flex items-start gap-4">
            <div className="relative h-20 w-48 rounded-xl border border-coral-light bg-ink/5 overflow-hidden">
              <Image
                src={displayImg}
                alt="Centre logo"
                fill
                className="object-contain p-2"
                unoptimized
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-ink/40">
                {preview ? "Preview — not saved yet" : "Current logo"}
              </span>
              {!preview && isDirector && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removePending}
                  className="rounded-full border border-coral-light px-3 py-1.5 text-xs font-medium text-coral-dark hover:bg-coral-light/50 disabled:opacity-50 transition-colors"
                >
                  {removePending ? "Removing…" : "Remove logo"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex h-20 w-48 items-center justify-center rounded-xl border-2 border-dashed border-coral-light text-sm text-ink/30">
            No logo yet
          </div>
        )}

        {isDirector ? (
          <div className="flex flex-col gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-ink/60 file:mr-3 file:rounded-full file:border-0 file:bg-coral-light file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-coral-dark hover:file:bg-coral-light/70"
            />
            {logoError && <p className={errorBannerClass}>{logoError}</p>}
            {logoSuccess && !preview && (
              <p className={successBannerClass}>Logo uploaded — visible on the kiosk immediately.</p>
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadPending || !preview}
              className="self-start rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
            >
              {uploadPending ? "Uploading…" : "Upload logo"}
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink/40">Only the Director can upload a logo.</p>
        )}
      </section>

      {/* Kiosk preview hint */}
      <div className="rounded-2xl border border-sage-light bg-sage-light/30 p-4 text-sm text-sage-dark">
        <p className="font-semibold mb-1">How it appears on the kiosk</p>
        <p className="text-ink/60">
          The kiosk header shows your logo and centre name instead of the SparkPlay branding.
          Changes appear immediately — no restart needed.
        </p>
      </div>
    </div>
  );
}
