/**
 * Australian National Quality Framework — educator-to-child ratio rules.
 *
 * Source: Education and Care Services National Regulations 2011, Reg 123.
 * State/territory overrides are applied on top of the national baseline.
 *
 * To add a new jurisdiction or update a rule: edit JURISDICTION_OVERRIDES only.
 * No other file needs changing — every ratio calculation imports from here.
 */

export interface RatioTier {
  /** Upper bound in months (exclusive). Use Infinity for the oldest group. */
  maxMonths: number;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Maximum children per educator (e.g. 4 means 1:4). */
  ratio: number;
}

/** National baseline — applies everywhere unless overridden below. */
const NATIONAL_RATIO_TIERS: RatioTier[] = [
  { maxMonths: 24,       label: "Under 2",    ratio: 4  },
  { maxMonths: 36,       label: "2–3 years",  ratio: 5  },
  { maxMonths: 72,       label: "3–6 years",  ratio: 11 },
  { maxMonths: Infinity, label: "School age", ratio: 15 },
];

/**
 * State/territory overrides keyed by jurisdiction code.
 * Each entry is a partial list — only tiers that differ from national.
 * Tiers are matched by maxMonths; unmatched tiers fall back to national.
 *
 * Reference:
 *  NSW: 1:10 for 3–6yo (Children (Education and Care Services) Act 2018)
 *  WA:  1:10 for 3–6yo (Children and Community Services Act 2004 regs)
 */
const JURISDICTION_OVERRIDES: Record<string, Partial<RatioTier>[]> = {
  nsw: [{ maxMonths: 72, ratio: 10 }],
  wa:  [{ maxMonths: 72, ratio: 10 }],
  // Add other states here as their rules diverge from national.
  // e.g. if QLD introduced 1:8 for under-2: qld: [{ maxMonths: 24, ratio: 8 }]
};

/**
 * Returns the ratio tiers that apply to the given jurisdiction.
 * Falls back to national tiers for any tier not overridden.
 *
 * @param jurisdiction - value from services.jurisdiction column
 *   ('national' | 'nsw' | 'vic' | 'qld' | 'wa' | 'sa' | 'tas' | 'act' | 'nt')
 */
export function getRatioTiers(jurisdiction: string): RatioTier[] {
  const overrides = JURISDICTION_OVERRIDES[jurisdiction.toLowerCase()] ?? [];
  if (overrides.length === 0) return NATIONAL_RATIO_TIERS;

  return NATIONAL_RATIO_TIERS.map((tier) => {
    const override = overrides.find((o) => o.maxMonths === tier.maxMonths);
    return override ? { ...tier, ...override } : tier;
  });
}

/** Age in months from a date-of-birth string (YYYY-MM-DD). Returns null if no DOB. */
export function ageInMonths(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
}

/** Finds the applicable ratio tier for a child's age. Unknown ages default to the strictest tier. */
export function childRatioTier(dob: string | null, tiers: RatioTier[]): RatioTier {
  const months = ageInMonths(dob);
  if (months === null) return tiers[0]; // unknown age → strictest (safest)
  return tiers.find((t) => months < t.maxMonths) ?? tiers[tiers.length - 1];
}

/**
 * Calculates the minimum number of educators required for a group of children.
 * Uses the fractional-sum method (sum 1/ratio per child, round up).
 */
export function requiredEducators(
  children: { date_of_birth: string | null }[],
  tiers: RatioTier[],
): number {
  if (children.length === 0) return 0;
  const sum = children.reduce((acc, c) => {
    const tier = childRatioTier(c.date_of_birth, tiers);
    return acc + 1 / tier.ratio;
  }, 0);
  return Math.ceil(sum);
}

/**
 * Mandatory reporting legislation citation by jurisdiction.
 * Shown on the incident reports page.
 */
export const MANDATORY_REPORTING_TEXT: Record<string, { act: string; section: string; body: string }> = {
  nsw: {
    act: "Children and Young Persons (Care and Protection) Act 1998 (NSW)",
    section: "s23",
    body: "All educators are mandatory reporters. If you suspect a child is at risk of significant harm, you must report to the Child Protection Helpline (132 111) as soon as practicable.",
  },
  vic: {
    act: "Child Wellbeing and Safety Act 2005 (Vic)",
    section: "s26",
    body: "All educators are mandatory reporters. If you form a belief on reasonable grounds that a child is in need of protection, report to Child Protection or SOCIT (1300 664 977).",
  },
  qld: {
    act: "Child Protection Act 1999 (Qld)",
    section: "s13A",
    body: "Educators are mandatory reporters. If you reasonably suspect a child has been or is being harmed, report to Child Safety Services (1800 177 135).",
  },
  wa: {
    act: "Children and Community Services Act 2004 (WA)",
    section: "s124B",
    body: "Educators are mandatory reporters. If you believe a child has been or is likely to be sexually abused or exploited, report to the Department of Communities Child Protection (1800 273 889).",
  },
  sa: {
    act: "Children and Young People (Safety) Act 2017 (SA)",
    section: "s30",
    body: "Educators are mandatory reporters. If you suspect on reasonable grounds that a child has been or is at risk of harm, report to the Child Abuse Report Line (13 14 78).",
  },
  tas: {
    act: "Children, Young Persons and Their Families Act 1997 (Tas)",
    section: "s14",
    body: "Educators are mandatory reporters. If you believe a child is in need of protection, report to Child Safety Services (1800 000 123).",
  },
  act: {
    act: "Children and Young People Act 2008 (ACT)",
    section: "s356",
    body: "Educators are mandatory reporters. If you have reasonable grounds to believe a child has experienced or is at risk of experiencing harm or exploitation, report to Child and Youth Protection Services (1300 556 729).",
  },
  nt: {
    act: "Care and Protection of Children Act 2007 (NT)",
    section: "s26",
    body: "Educators are mandatory reporters. If you suspect on reasonable grounds that a child has suffered or is likely to suffer harm or exploitation, report to Territory Families (1800 700 250).",
  },
  national: {
    act: "Relevant state/territory legislation",
    section: "",
    body: "All educators are mandatory reporters under their state or territory legislation. Contact your state child protection authority if you suspect a child is at risk of harm.",
  },
};
