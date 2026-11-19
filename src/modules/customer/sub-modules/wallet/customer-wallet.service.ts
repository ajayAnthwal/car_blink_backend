import mongoose from 'mongoose';
import { CustomerWalletModel, CustomerWalletTransactionModel } from './customer-wallet.model';

export class CustomerWalletService {
  /**
   * Lazily get or create a CustomerWallet record
   */
  async getOrCreateWallet(customerId: string) {
    let wallet = await CustomerWalletModel.findOne({ customerId });
    if (!wallet) {
      try {
        wallet = await CustomerWalletModel.create({
          customerId: new mongoose.Types.ObjectId(customerId),
          balance: 0,
          currency: 'INR',
          isActive: true,
        });
      } catch (err: any) {
        // Handle duplicate race condition gracefully
        if (err.code === 11000) {
          wallet = await CustomerWalletModel.findOne({ customerId });
        } else {
          throw err;
        }
      }
    }
    return wallet;
  }

  /**
   * Get customer's wallet balance and paginated transactions
   */
  async getMyWalletWithTransactions(customerId: string, query: { page?: string; limit?: string }) {
    const wallet = await this.getOrCreateWallet(customerId);

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [rawTransactions, total] = await Promise.all([
      CustomerWalletTransactionModel.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CustomerWalletTransactionModel.countDocuments({ customerId }),
    ]);

    // Format transactions for customer consumption (mask internal staff details)
    const transactions = rawTransactions.map((tx) => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      note: tx.note,
      source: 'CarBlink Executive',
      balanceAfter: tx.balanceAfter,
      createdAt: tx.createdAt,
    }));

    return {
      wallet: {
        _id: wallet?._id,
        balance: wallet?.balance ?? 0,
        currency: wallet?.currency ?? 'INR',
        isActive: wallet?.isActive ?? true,
      },
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const customerWalletService = new CustomerWalletService();
