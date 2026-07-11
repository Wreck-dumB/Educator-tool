"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadServiceLogo, removeServiceLogo, updateServiceName, updateObservationPreferences, acceptAiDataNotice, updateGovernanceDetails, updateMaterialAlertLeadDays, updateJurisdiction } from "./actions";
import { errorBannerClass, successBannerClass } from "@/lib/ui";

const ALL_OBS_TYPES: { key: string; label: string; short: string }[] = [
  { key: "anecdotal", label: "Anecdotal record", short: "Anecdotal" },
  { key: "learning_story", label: "Learning story", short: "Learning story" },
  { key: "running_record", label: "Running record", short: "Running record" },
  { key: "jotting", label: "Jotting", short: "Jotting" },
  { key: "work_sample", label: "Work sample", short: "Work sample" },
  { key: "photo_caption", label: "Photo with caption", short: "Photo caption" },
  { key: "developmental_note", label: "Developmental note", short: "Dev note" },
];

interface Props {
  isDirector: boolean;
  currentLogoUrl: string | null;
  currentDisplayName: string | null;
  serviceName: string;
  preferredObservationTypes: string[];
  aiDataNoticeAcceptedAt: string | null;
  approvedProviderNumber: string | null;
  serviceApprovalNumber: string | null;
  nominatedSupervisorName: string | null;
  nominatedSupervisorPhone: string | null;
  nominatedSupervisorEmail: string | null;
  materialAlertLeadDays: number;
  jurisdiction: string;
}

export default function SettingsClient({
  isDirector,
  currentLogoUrl,
  currentDisplayName,
  serviceName,
  preferredObservationTypes,
  aiDataNoticeAcceptedAt,
  approvedProviderNumber,
  serviceApprovalNumber,
  nominatedSupervisorName,
  nominatedSupervisorPhone,
  nominatedSupervisorEmail,
  materialAlertLeadDays,
  jurisdiction,
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
  const [selectedObs, setSelectedObs] = useState<Set<string>>(() => new Set(preferredObservationTypes));
  const [obsPending, startObsTransition] = useTransition();
  const [obsError, setObsError] = useState<string | null>(null);
  const [obsSuccess, setObsSuccess] = useState(false);
  const [aiNoticePending, startAiTransition] = useTransition();
  const [aiNoticeAccepted, setAiNoticeAccepted] = useState<string | null>(aiDataNoticeAcceptedAt);
  const [aiNoticeError, setAiNoticeError] = useState<string | null>(null);
  const [govPending, startGovTransition] = useTransition();
  const [govError, setGovError] = useState<string | null>(null);
  const [govSuccess, setGovSuccess] = useState(false);
  const [leadDays, setLeadDays] = useState(materialAlertLeadDays);
  const [leadDaysPending, startLeadDaysTransition] = useTransition();
  const [leadDaysError, setLeadDaysError] = useState<string | null>(null);
  const [leadDaysSuccess, setLeadDaysSuccess] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(jurisdiction);
  const [jurisdictionPending, startJurisdictionTransition] = useTransition();
  const [jurisdictionError, setJurisdictionError] = useState<string | null>(null);
  const [jurisdictionSuccess, setJurisdictionSuccess] = useState(false);

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

  function handleObsSave() {
    setObsError(null);
    setObsSuccess(false);
    const fd = new FormData();
    selectedObs.forEach((t) => fd.set(t, "1"));
    startObsTransition(async () => {
      const result = await updateObservationPreferences(fd);
      if (result.error) {
        setObsError(result.error);
      } else {
        setObsSuccess(true);
      }
    });
  }

  function handleGovSave(formData: FormData) {
    setGovError(null);
    setGovSuccess(false);
    startGovTransition(async () => {
      const result = await updateGovernanceDetails(formData);
      if (result.error) {
        setGovError(result.error);
      } else {
        setGovSuccess(true);
      }
    });
  }

  function handleAiNoticeAccept() {
    setAiNoticeError(null);
    startAiTransition(async () => {
      const result = await acceptAiDataNotice();
      if (result.error) {
        setAiNoticeError(result.error);
      } else {
        setAiNoticeAccepted(new Date().toISOString());
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

      {/* Service governance (Reg 168) */}
      <section className="rounded-2xl border border-coral-light bg-white p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-1">Service governance</h2>
        <p className="text-sm text-ink/50 mb-4">
          Your ACECQA approval numbers and nominated supervisor details (Reg 168 of the Education
          and Care Services National Regulations 2011). Required for regulatory correspondence,
          incident notifications, and assessment and rating visits.
        </p>
        <form action={handleGovSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Approved Provider Number
              </label>
              <input
                name="approved_provider_number"
                type="text"
                placeholder="AP0000000"
                defaultValue={approvedProviderNumber ?? ""}
                disabled={!isDirector || govPending}
                className="w-full rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Service Approval Number
              </label>
              <input
                name="service_approval_number"
                type="text"
                placeholder="SE-00000000"
                defaultValue={serviceApprovalNumber ?? ""}
                disabled={!isDirector || govPending}
                className="w-full rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
          <p className="text-xs font-semibold text-ink/50 pt-1">Nominated supervisor</p>
          <input
            name="nominated_supervisor_name"
            type="text"
            placeholder="Full name"
            defaultValue={nominatedSupervisorName ?? ""}
            disabled={!isDirector || govPending}
            className="w-full rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none disabled:opacity-50"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="nominated_supervisor_phone"
              type="text"
              placeholder="Phone"
              defaultValue={nominatedSupervisorPhone ?? ""}
              disabled={!isDirector || govPending}
              className="rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none disabled:opacity-50"
            />
            <input
              name="nominated_supervisor_email"
              type="email"
              placeholder="Email"
              defaultValue={nominatedSupervisorEmail ?? ""}
              disabled={!isDirector || govPending}
              className="rounded-xl border border-coral-light px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-coral focus:outline-none disabled:opacity-50"
            />
          </div>
          {govError && <p className={errorBannerClass}>{govError}</p>}
          {govSuccess && <p className={successBannerClass}>Governance details saved.</p>}
          {!isDirector && (
            <p className="text-xs text-ink/40">Only the Director can update governance details.</p>
          )}
          {isDirector && (
            <button
              type="submit"
              disabled={govPending}
              className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
            >
              {govPending ? "Saving…" : "Save governance details"}
            </button>
          )}
        </form>
      </section>

      {/* Observation type preferences */}
      <section className="rounded-2xl border border-coral-light bg-white p-5">
        <h2 className="font-display text-base font-semibold text-ink mb-1">Observation formats</h2>
        <p className="text-sm text-ink/50 mb-4">
          Choose which observation formats educators can use at your centre. Selected formats appear
          in the observation form. Under NQS QA1, using a variety of methods is expected.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_OBS_TYPES.map((t) => {
            const checked = selectedObs.has(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setSelectedObs((prev) => {
                    const next = new Set(prev);
                    if (next.has(t.key)) next.delete(t.key);
                    else next.add(t.key);
                    return next;
                  });
                  setObsSuccess(false);
                }}
                disabled={!isDirector || obsPending}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  checked
                    ? "border-coral bg-coral text-white"
                    : "border-coral-light text-ink/60 hover:border-coral"
                } disabled:opacity-50`}
              >
                {t.short}
              </button>
            );
          })}
        </div>
        {obsError && <p className={`mt-2 ${errorBannerClass}`}>{obsError}</p>}
        {obsSuccess && <p className={`mt-2 ${successBannerClass}`}>Observation preferences saved.</p>}
        {!isDirector && (
          <p className="mt-2 text-xs text-ink/40">Only the Director can change observation preferences.</p>
        )}
        {isDirector && (
          <button
            type="button"
            onClick={handleObsSave}
            disabled={obsPending}
            className="mt-4 rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
          >
            {obsPending ? "Saving…" : "Save preferences"}
          </button>
        )}
      </section>

      {/* AI data processing notice (Australian Privacy Act APP 3 disclosure) */}
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="font-display text-base font-semibold text-amber-900 mb-1">AI data processing notice</h2>
        <p className="text-sm text-amber-800 mb-3">
          SparkPlay uses the Anthropic Claude API to generate activity ideas and routines. When you use
          these AI features, de-identified information (activity parameters, materials, age ranges — never
          child names, dates of birth, or any other personal identifiers) is sent to Anthropic&apos;s
          servers for processing.
        </p>
        <p className="text-sm text-amber-800 mb-3">
          Under the Australian Privacy Act 1988 (APP 3), you must inform individuals about how their
          information may be used and disclosed before or at the time of collection. This notice satisfies
          that obligation for your staff. You should also include a reference to AI-assisted tools in your
          service&apos;s privacy policy.
        </p>
        {aiNoticeAccepted ? (
          <p className={successBannerClass}>
            Acknowledged on {new Date(aiNoticeAccepted).toLocaleDateString("en-AU")} — this notice is
            on record.
          </p>
        ) : (
          <>
            {aiNoticeError && <p className={errorBannerClass}>{aiNoticeError}</p>}
            {isDirector ? (
              <button
                type="button"
                onClick={handleAiNoticeAccept}
                disabled={aiNoticePending}
                className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {aiNoticePending ? "Saving…" : "I acknowledge this notice"}
              </button>
            ) : (
              <p className="text-xs text-amber-700">The Director must acknowledge this notice.</p>
            )}
          </>
        )}
      </section>

      {/* Material order alert lead time */}
      <section className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Material order alert lead time</h2>
          <p className="mt-1 text-sm text-ink/60">
            How many days before an activity is scheduled should SparkPlay alert you that materials are
            missing or low in stock? The default is 14 days, giving you time to order and receive supplies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={3}
            max={90}
            value={leadDays}
            onChange={(e) => setLeadDays(Number(e.target.value))}
            disabled={!isDirector}
            className="w-24 rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 disabled:bg-ink/5 disabled:text-ink/40"
          />
          <span className="text-sm text-ink/60">days</span>
        </div>
        {leadDaysError && <p className={errorBannerClass}>{leadDaysError}</p>}
        {leadDaysSuccess && <p className={successBannerClass}>Alert lead time saved.</p>}
        {!isDirector && (
          <p className="text-xs text-ink/40">Only the Director can change this setting.</p>
        )}
        {isDirector && (
          <button
            type="button"
            onClick={() => {
              setLeadDaysError(null);
              setLeadDaysSuccess(false);
              startLeadDaysTransition(async () => {
                const clamped = Math.max(3, Math.min(90, Math.round(leadDays)));
                setLeadDays(clamped);
                const result = await updateMaterialAlertLeadDays(clamped);
                if (result?.error) setLeadDaysError(result.error);
                else setLeadDaysSuccess(true);
              });
            }}
            disabled={leadDaysPending}
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
          >
            {leadDaysPending ? "Saving…" : "Save lead time"}
          </button>
        )}
      </section>

      {/* State / territory ratio config */}
      <section className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">State / territory jurisdiction</h2>
          <p className="mt-1 text-sm text-ink/60">
            Sets the ratio tier used on the On Site Board. NSW and WA use 1:10 for 3–6 year olds instead of the national 1:11.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value)}
            disabled={!isDirector}
            className="rounded-xl border border-ink/20 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/40 disabled:bg-ink/5 disabled:text-ink/40"
          >
            <option value="national">National (default)</option>
            <option value="nsw">New South Wales</option>
            <option value="vic">Victoria</option>
            <option value="qld">Queensland</option>
            <option value="wa">Western Australia</option>
            <option value="sa">South Australia</option>
            <option value="tas">Tasmania</option>
            <option value="act">ACT</option>
            <option value="nt">Northern Territory</option>
          </select>
        </div>
        {jurisdictionError && <p className={errorBannerClass}>{jurisdictionError}</p>}
        {jurisdictionSuccess && <p className={successBannerClass}>Jurisdiction saved.</p>}
        {!isDirector && (
          <p className="text-xs text-ink/40">Only the Director can change this setting.</p>
        )}
        {isDirector && (
          <button
            type="button"
            onClick={() => {
              setJurisdictionError(null);
              setJurisdictionSuccess(false);
              startJurisdictionTransition(async () => {
                const result = await updateJurisdiction(selectedJurisdiction);
                if (result?.error) setJurisdictionError(result.error);
                else setJurisdictionSuccess(true);
              });
            }}
            disabled={jurisdictionPending}
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-dark disabled:opacity-50 transition-colors"
          >
            {jurisdictionPending ? "Saving…" : "Save jurisdiction"}
          </button>
        )}
      </section>
    </div>
  );
}
