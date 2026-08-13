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
