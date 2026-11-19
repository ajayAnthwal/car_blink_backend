import { z } from 'zod';
import { WALLET_TRANSACTION_TYPE } from '../../../customer/sub-modules/wallet/customer-wallet.model';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const adjustCustomerWalletSchema = z.object({
  customerId: z
    .string({ required_error: 'Customer ID is required' })
    .trim()
    .regex(objectIdRegex, 'Customer ID must be a valid 24-character hexadecimal ObjectId'),
  type: z.nativeEnum(WALLET_TRANSACTION_TYPE, {
    errorMap: () => ({ message: "Transaction type must be 'CREDIT' or 'DEBIT'" }),
  }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .max(50000, 'Amount cannot exceed ₹50,000 per transaction')
    .refine(
      (val) => {
        const rounded = Math.round(val * 100) / 100;
        return Math.abs(val - rounded) < 0.0001;
      },
      { message: 'Amount can have at most 2 decimal places' }
    ),
  note: z
    .string({ required_error: 'Note / Reason is required' })
    .trim()
    .min(3, 'Note must be at least 3 characters long')
    .max(250, 'Note cannot exceed 250 characters'),
  idempotencyKey: z.string().trim().optional(),
});

export const customerIdParamSchema = z.object({
  customerId: z
    .string()
    .trim()
    .regex(objectIdRegex, 'Customer ID must be a valid 24-character hexadecimal ObjectId'),
});

export type AdjustCustomerWalletInput = z.infer<typeof adjustCustomerWalletSchema>;
