export interface AdvanceCalculation {
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  advancePaise: number;
  balancePaise: number;
  totalPaise: number;
}

/**
 * Calculates advance amount (15%) and remaining balance in exact integer paise.
 * Formula: Math.round(totalPaise * 15 / 100)
 * Balance: totalPaise - advancePaise
 *
 * Rules:
 * - Computes in integer paise
 * - Cap: advance cannot exceed total
 * - Returns rupee values with 2 decimals
 */
export function advanceFor(totalRupees: number): AdvanceCalculation {
  const safeTotal = Math.max(0, Number(totalRupees) || 0);
  const totalPaise = Math.round(safeTotal * 100);

  if (totalPaise === 0) {
    return {
      totalAmount: 0,
      advanceAmount: 0,
      balanceAmount: 0,
      advancePaise: 0,
      balancePaise: 0,
      totalPaise: 0,
    };
  }

  let advancePaise = Math.round((totalPaise * 15) / 100);

  // Cap rule: advance cannot exceed total
  if (advancePaise > totalPaise) {
    advancePaise = totalPaise;
  }

  const balancePaise = totalPaise - advancePaise;

  return {
    totalAmount: Number((totalPaise / 100).toFixed(2)),
    advanceAmount: Number((advancePaise / 100).toFixed(2)),
    balanceAmount: Number((balancePaise / 100).toFixed(2)),
    advancePaise,
    balancePaise,
    totalPaise,
  };
}
