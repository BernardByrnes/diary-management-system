/** Gross amount for one delivery line (liters × cost per liter). */
export function grossFromDeliveryLiters(
  liters: number,
  costPerLiter: number
): number {
  return liters * costPerLiter;
}

/** Sum gross across multiple deliveries at possibly different rates. */
export function sumDeliveriesGross(
  deliveries: { liters: number; costPerLiter: number }[]
): number {
  return deliveries.reduce(
    (sum, d) => sum + grossFromDeliveryLiters(d.liters, d.costPerLiter),
    0
  );
}

/** Net supplier payout after advances; never negative. */
export function computeSupplierNetAmount(
  grossAmount: number,
  advanceDeductions: number
): number {
  return Math.max(0, grossAmount - advanceDeductions);
}
