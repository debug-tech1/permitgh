// Fee tiers let a service's fee depend on a size the applicant picks (e.g.
// storeys for a Building Permit) instead of one flat amount. Services
// without tiers just use ServiceType.feeGhs as before — this only adds a
// branch, it doesn't change behavior for flat-fee services.

export type FeeTier = { label: string; feeGhs: number };

export function parseFeeTiers(value: unknown): FeeTier[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (t): t is FeeTier =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as Record<string, unknown>).label === "string" &&
      typeof (t as Record<string, unknown>).feeGhs === "number",
  );
}

export function findFeeTier(tiers: FeeTier[], label: string | undefined | null): FeeTier | undefined {
  return tiers.find((t) => t.label === label);
}

// Building Permit's cost isn't a tier pick — it's rate x area, and the rate
// itself is an officer's judgment call within a band set by property type.
export const BUILDING_PERMIT_RATES = {
  residential: { label: "Residential", min: 10, max: 15 },
  commercial: { label: "Commercial", min: 20, max: 30 },
} as const;

export type BuildingPropertyType = keyof typeof BUILDING_PERMIT_RATES;

export function isBuildingPropertyType(value: unknown): value is BuildingPropertyType {
  return value === "residential" || value === "commercial";
}

// Whether a service's cost is an officer's call at all — tiered (BOP,
// Property Rate) or formula-based (Building Permit's rate x area). Only a
// flat-fee service (Market Stall Permit) applies its fee automatically at
// submission; everything else starts unbilled.
export function isOfficerBilled(serviceType: { slug: string; feeTiers: unknown }): boolean {
  return serviceType.slug === "building-permit" || parseFeeTiers(serviceType.feeTiers).length > 0;
}
