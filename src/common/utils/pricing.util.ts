import { PRICING_CONFIG } from '../config/pricing.config';
import { advanceFor } from './money.util';

export interface PricingBreakdown {
  partnerBaseQuote: number;
  gstRate: number;
  gstAmount: number;
  customerGrossQuote: number;
  advanceRequired: number;
  advancePaid: number;
  balanceAmount: number;
  approvedExtrasAmount: number;
  pendingExtrasAmount: number;
  gatewayFeeAmount: number;
  rewardAmount: number;
  dltCostAmount: number;
  companyMarginAmount: number;
}

export function buildPricing(
  quotedAmount: number,
  options?: {
    mode?: 'INCLUSIVE' | 'EXCLUSIVE';
    gstRate?: number;
    gatewayRate?: number;
    rewardRate?: number;
    dltRate?: number;
    marginRate?: number;
    approvedExtrasAmount?: number;
    pendingExtrasAmount?: number;
    advancePaid?: number;
  }
): PricingBreakdown {
  const mode = options?.mode ?? PRICING_CONFIG.GST_MODE;
  const gstRate = options?.gstRate ?? PRICING_CONFIG.GST_RATE;
  const gatewayRate = options?.gatewayRate ?? PRICING_CONFIG.GATEWAY_FEE_RATE;
  const rewardRate = options?.rewardRate ?? PRICING_CONFIG.REWARD_RATE;
  const dltRate = options?.dltRate ?? PRICING_CONFIG.DLT_COST_RATE;
  const marginRate = options?.marginRate ?? PRICING_CONFIG.COMPANY_MARGIN_RATE;

  const rawAmount = Math.max(0, Number(quotedAmount) || 0);
  const inputPaise = Math.round(rawAmount * 100);

  let partnerBaseQuotePaise: number;
  let gstPaise: number;
  let grossPaise: number;

  if (mode === 'EXCLUSIVE') {
    // Quoted amount is partnerBaseQuote. GST is added on top once.
    partnerBaseQuotePaise = inputPaise;
    gstPaise = Math.round(partnerBaseQuotePaise * gstRate);
    grossPaise = partnerBaseQuotePaise + gstPaise;
  } else {
    // INCLUSIVE mode (default): Quoted amount is customerGrossQuote.
    grossPaise = inputPaise;
    partnerBaseQuotePaise = Math.round(grossPaise / (1 + gstRate));
    gstPaise = grossPaise - partnerBaseQuotePaise;
  }

  const customerGrossQuote = Number((grossPaise / 100).toFixed(2));
  const partnerBaseQuote = Number((partnerBaseQuotePaise / 100).toFixed(2));
  const gstAmount = Number((gstPaise / 100).toFixed(2));

  // advanceRequired uses advanceFor() from money.util.ts (P1)
  const advanceCalc = advanceFor(customerGrossQuote);
  const advanceRequired = advanceCalc.advanceAmount;
  const balanceAmount = advanceCalc.balanceAmount;

  // Internal commercial allocations (computed in paise on gross quote)
  const gatewayFeePaise = Math.round(grossPaise * gatewayRate);
  const rewardPaise = Math.round(grossPaise * rewardRate);
  const dltCostPaise = Math.round(grossPaise * dltRate);
  const companyMarginPaise = Math.round(grossPaise * marginRate);

  return {
    partnerBaseQuote,
    gstRate,
    gstAmount,
    customerGrossQuote,
    advanceRequired,
    advancePaid: Number(options?.advancePaid || 0),
    balanceAmount,
    approvedExtrasAmount: Number(options?.approvedExtrasAmount || 0),
    pendingExtrasAmount: Number(options?.pendingExtrasAmount || 0),
    gatewayFeeAmount: Number((gatewayFeePaise / 100).toFixed(2)),
    rewardAmount: Number((rewardPaise / 100).toFixed(2)),
    dltCostAmount: Number((dltCostPaise / 100).toFixed(2)),
    companyMarginAmount: Number((companyMarginPaise / 100).toFixed(2)),
  };
}

/**
 * Strips internal financial fields (gatewayFeeAmount, rewardAmount, dltCostAmount, companyMarginAmount)
 * from customer-facing API responses.
 */
export function sanitizeCustomerPricing(pricing: any) {
  if (!pricing) return undefined;
  const raw = typeof pricing.toObject === 'function' ? pricing.toObject() : { ...pricing };
  if (raw.customerGrossQuote === undefined && raw.partnerBaseQuote === undefined) {
    return undefined;
  }
  const {
    gatewayFeeAmount,
    rewardAmount,
    dltCostAmount,
    companyMarginAmount,
    ...customerVisiblePricing
  } = raw;
  return customerVisiblePricing;
}
