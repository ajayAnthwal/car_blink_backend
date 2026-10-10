export const PRICING_CONFIG = {
  GST_RATE: Number(process.env.GST_RATE ?? 0.18),
  GST_MODE: (process.env.GST_MODE === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE') as 'INCLUSIVE' | 'EXCLUSIVE',
  GATEWAY_FEE_RATE: Number(process.env.GATEWAY_FEE_RATE ?? 0.02), // 2%
  REWARD_RATE: Number(process.env.REWARD_RATE ?? 0.02), // 2%
  DLT_COST_RATE: Number(process.env.DLT_COST_RATE ?? 0.01), // 1%
  COMPANY_MARGIN_RATE: Number(process.env.COMPANY_MARGIN_RATE ?? 0.10), // 10%
};
