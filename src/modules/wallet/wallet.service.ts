import mongoose from 'mongoose';
import WalletModel from './wallet.model';
import LedgerTransactionModel, { TRANSACTION_TYPE } from './ledger.model';
import WithdrawalRequestModel, { WITHDRAWAL_STATUS } from './withdrawal.model';
import { ApiError } from '../../common/errors/ApiError';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Helper to get razorpay instance safely
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn("Razorpay keys not found in environment, falling back to mock");
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export class WalletService {
  /**
   * Initializes a wallet for a partner if it doesn't exist
   */
  public static async getOrCreateWallet(userId: string) {
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = await WalletModel.create({ userId, balance: 0 });
    }
    return wallet;
  }

  /**
   * Handles commission logic for a completed booking
   * @param partnerId ID of the partner
   * @param bookingId ID of the completed booking
   * @param totalAmount Total amount of the booking
   * @param paymentMode 'CASH' or 'ONLINE'
   */
  public static async processBookingCommission(
    partnerId: string,
    bookingId: string,
    totalAmount: number,
    paymentMode: 'CASH' | 'ONLINE'
  ) {
    const COMMISSION_RATE = 0.10; // 10% fixed commission
    const commissionAmount = totalAmount * COMMISSION_RATE;
    const partnerShare = totalAmount - commissionAmount;

    const wallet = await this.getOrCreateWallet(partnerId);

    // If ONLINE: Customer paid platform. Platform keeps commission, gives partner their share.
    if (paymentMode === 'ONLINE') {
      wallet.balance += partnerShare;
      await wallet.save();

      await LedgerTransactionModel.create({
        walletId: wallet._id,
        bookingId: new mongoose.Types.ObjectId(bookingId),
        amount: partnerShare,
        type: TRANSACTION_TYPE.CREDIT,
        description: `Booking #${bookingId.toString().slice(-6)} - Online Payment Credit (Share: ${totalAmount} - 10%)`,
        balanceAfter: wallet.balance,
      });
    } 
    // If CASH: Customer paid partner. Partner keeps everything, but owes platform commission.
    else if (paymentMode === 'CASH') {
      wallet.balance -= commissionAmount;
      await wallet.save();

      await LedgerTransactionModel.create({
        walletId: wallet._id,
        bookingId: new mongoose.Types.ObjectId(bookingId),
        amount: commissionAmount,
        type: TRANSACTION_TYPE.DEBIT,
        description: `Booking #${bookingId.toString().slice(-6)} - Cash Booking Commission (10% of ${totalAmount})`,
        balanceAfter: wallet.balance,
      });
    }

    return wallet;
  }

  /**
   * Get wallet balance and transaction history
   */
  public static async getWalletStatement(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await LedgerTransactionModel.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(50);
      
    return {
      balance: wallet.balance,
      currency: wallet.currency,
      transactions,
    };
  }

  /**
   * Create Razorpay Order for clearing dues
   */
  public static async createDuesOrder(partnerId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(partnerId);
    if (wallet.balance >= 0) {
      throw new ApiError(400, 'You do not have any outstanding dues');
    }
    
    const rzp = getRazorpayInstance();
    
    if (rzp) {
      // Real Razorpay Order creation
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency: 'INR',
        receipt: `receipt_${partnerId}_${Date.now()}`
      };
      const order = await rzp.orders.create(options);
      return {
        orderId: order.id,
        amount,
        currency: 'INR',
      };
    } else {
      // Fallback Mock logic
      const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;
      return {
        orderId,
        amount,
        currency: 'INR',
      };
    }
  }

  /**
   * Verify Razorpay Payment for Dues
   */
  public static async verifyDuesPayment(partnerId: string, orderId: string, paymentId: string, signature: string, amount: number) {
    const wallet = await this.getOrCreateWallet(partnerId);
    
    const rzp = getRazorpayInstance();

    if (rzp) {
      // Real Razorpay signature verification
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new ApiError(400, 'Invalid payment signature');
      }
    } else {
      // In mock mode, we just accept it
    }

    wallet.balance += amount;
    await wallet.save();

    await LedgerTransactionModel.create({
      walletId: wallet._id,
      amount: amount,
      type: TRANSACTION_TYPE.CREDIT,
      description: `Dues Cleared - Payment ID: ${paymentId}`,
      balanceAfter: wallet.balance,
    });

    return wallet;
  }

  /**
   * Request Withdrawal
   */
  public static async requestWithdrawal(partnerId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(partnerId);
    
    if (wallet.balance < amount) {
      throw new ApiError(400, 'Insufficient wallet balance');
    }
    if (amount < 100) {
      throw new ApiError(400, 'Minimum withdrawal amount is ₹100');
    }

    const PartnerModel = mongoose.model('Partner');
    const partner = await PartnerModel.findOne({ userId: partnerId });

    if (!partner || !partner.bankDetails || !partner.bankDetails.accountNumber) {
      throw new ApiError(400, 'Please add bank details in your profile first');
    }

    // Deduct amount immediately to lock funds
    wallet.balance -= amount;
    await wallet.save();

    const withdrawal = await WithdrawalRequestModel.create({
      partnerId,
      amount,
      bankDetails: partner.bankDetails,
      status: WITHDRAWAL_STATUS.PENDING,
    });

    await LedgerTransactionModel.create({
      walletId: wallet._id,
      amount: amount,
      type: TRANSACTION_TYPE.DEBIT,
      description: `Withdrawal Requested - Ref: ${withdrawal._id}`,
      balanceAfter: wallet.balance,
    });

    const rzp = getRazorpayInstance();

    if (rzp) {
      // RazorpayX Real Payout Flow
      try {
        // 1. Create Contact
        const contact = await (rzp as any).contacts.create({
          name: partner.bankDetails.accountHolderName,
          reference_id: partnerId,
          type: "vendor"
        });

        // 2. Create Fund Account
        const fundAccount = await (rzp as any).fundAccount.create({
          contact_id: contact.id,
          account_type: "bank_account",
          bank_account: {
            name: partner.bankDetails.accountHolderName,
            ifsc: partner.bankDetails.ifscCode,
            account_number: partner.bankDetails.accountNumber
          }
        });

        // 3. Request Payout
        const payout = await (rzp as any).payouts.create({
          account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER || process.env.RAZORPAY_KEY_ID, // Merchant Account ID for RazorpayX
          fund_account_id: fundAccount.id,
          amount: Math.round(amount * 100),
          currency: "INR",
          mode: "IMPS",
          purpose: "payout",
          reference_id: withdrawal._id.toString()
        });

        withdrawal.status = WITHDRAWAL_STATUS.PROCESSING;
        withdrawal.referenceId = payout.id;
        await withdrawal.save();
        
        // Payout status should ideally be updated via Webhooks
      } catch (err: any) {
        console.error("RazorpayX Payout Error:", err);
        // If it fails, refund the wallet
        wallet.balance += amount;
        await wallet.save();
        withdrawal.status = WITHDRAWAL_STATUS.FAILED;
        withdrawal.failureReason = err.description || err.message;
        await withdrawal.save();
        
        await LedgerTransactionModel.create({
          walletId: wallet._id,
          amount: amount,
          type: TRANSACTION_TYPE.CREDIT,
          description: `Withdrawal Failed - Refunded`,
          balanceAfter: wallet.balance,
        });
        
        throw new ApiError(500, `Payout failed: ${withdrawal.failureReason}`);
      }
    } else {
      // Simulate instant payout processing (Mock Mode)
      setTimeout(async () => {
        try {
          const req = await WithdrawalRequestModel.findById(withdrawal._id);
          if (req) {
            req.status = WITHDRAWAL_STATUS.COMPLETED;
            req.referenceId = `payout_${crypto.randomBytes(8).toString('hex')}`;
            req.processedAt = new Date();
            await req.save();
          }
        } catch (err) {
          console.error(err);
        }
      }, 5000);
    }

    return withdrawal;
  }
}

export default WalletService;
