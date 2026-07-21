# DR. SparkPlay — Pricing & Credits Spec (draft)

**Status:** Parked idea, not built. No billing/subscription system exists in the app yet.
**Captured:** 2026-07-21

---

## Core principle

**Creating a new document is a billable event (costs a credit). Living with and maintaining what you've already created is included in the subscription.**

This line is a natural one — the app is already split into "generate a new thing" endpoints and "run/maintain what you have" endpoints. Pricing follows the architecture instead of fighting it.

---

## The two buckets (already reflected in the codebase)

### Creation — consumes a credit
High-value "make me a whole new X" generation. These are the premium moments.

`qip` · `policy` · `form-template` · `risk-assessment` · `safe-work-procedure` ·
`behaviour-support` (plan) · `generate` (activities) · `program` ·
`recipe` / `meal-plan` · `poster-copy` / `generate-image` ·
`transition-statement` · `generate-routine`

### Maintenance — included, unlimited
Running, reviewing, and iterating on what already exists.

`document-review` (improving existing policies) · `qip` **check-ins** (`/qip/checkin`) ·
`reflections` / `reflection-questions` / `save-reflection` · `room-daily-report` ·
`follow-up-activity` · `personalise` · `milestone-observation` · `group-activity` ·
`material-alerts` · `staff-attendance-export` · `translate-broadcast` ·
`brain-break` · `cultural-days` · all everyday logging (medication, nappy, attendance, observations)

> The QIP is the proof point: the app already has a QIP **generator** (`/api/qip`, billable) and separate QIP **check-ins** (`/qip/checkin`, included).

---

## The model

- **Subscription tier includes:** unlimited maintenance/review/logging **+ a monthly allowance of creation credits.**
- **Creating a new document consumes 1 credit.**
- **Out of credits?** Buy a top-up pack, or upgrade tier.
- Start simple: **1 credit = 1 creation.** (Later you can price a full QIP higher than a single poster, but don't start there.)

Why tiers-with-credits and not pure pay-per-use: childcare centres run tight, predictable budgets and dislike surprise usage bills. A monthly allowance + optional top-ups feels fair and predictable.

---

## Three rules to get right when building

1. **"Create" = the generation API call. Everything after it is free** — editing, re-reviewing, QIP check-ins, refining. Never make a centre feel punished for maintaining.
2. **Show the cost before the click** — "This will use 1 credit" on generate buttons. Surprise credit burns are the #1 complaint with this model.
3. **Decide what a re-generate costs.** Simplest rule: first creation of a document = 1 credit; regenerating/refining that same one is free or cheaper. Otherwise people hesitate to iterate.

---

## Pricing basis (important)

Each generation costs *us* only cents of AI compute (a full 200k-char document review is ~15–25c). **Credits are value-gating, not cost recovery.** Price on the value delivered — a generated QIP or policy saves a director hours — not on the AI bill. Margins are healthy at any reasonable credit price.

---

## What building it actually requires (future milestone)

Depends on the subscription/billing layer existing first. In rough order:

1. **Payments provider** (Stripe) — none installed today.
2. **Entitlement/credits record per centre** in Supabase (plan, monthly credit allowance, remaining balance, reset date), with RLS scoped to the owner like all other data.
3. **Enforcement** — credit check + decrement in the ~12 generation routes; leave every maintenance/review route untouched. The generation routes are already server-side and rate-limited per user, so the hook pattern already exists.
4. **Billing UI** — plan selection, credit balance, top-up purchase, usage history.

Nothing here blocks current work. Revisit when monetization becomes the priority.
