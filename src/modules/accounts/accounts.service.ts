import mongoose from 'mongoose';
import { UserModel } from '../user/user.model';
import { PaymentModel } from '../payment/payment.model';
import { RefundModel } from './sub-modules/refunds/refund.model';
import { SettlementModel } from './sub-modules/settlements/settlement.model';
import { InvoiceModel } from '../partner/sub-modules/jobs/invoice.model';
import { ApiError } from '../../common/errors/ApiError';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';

export class AccountsService {
  /**
   * Verifies the security PIN of the accounts user.
   */
  static async verifySecurityPin(userId: string, pin: string): Promise<void> {
    const user = await UserModel.findById(userId).select('+securityPin');
    if (!user) {
      throw new ApiError(401, 'User not found', ERROR_CODES.UNAUTHORIZED);
    }
    
    if (!user.securityPin) {
      if (pin !== '1234') {
        throw new ApiError(401, 'Invalid Security PIN. (Default is 1234)', ERROR_CODES.UNAUTHORIZED);
      }
      return;
    }

    const isValid = await user.compareSecurityPin(pin);
    if (!isValid) {
      throw new ApiError(401, 'Invalid Security PIN', ERROR_CODES.UNAUTHORIZED);
    }
  }

  /**
   * Set or update Security PIN for Accounts user
   */
  static async updateSecurityPin(userId: string, newPin: string): Promise<void> {
    if (!newPin || newPin.length < 4) {
      throw new ApiError(400, 'Security PIN must be at least 4 digits', ERROR_CODES.VALIDATION_ERROR);
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found', ERROR_CODES.NOT_FOUND);
    }

    user.securityPin = newPin;
    await user.save();
  }

  /**
   * Get Unified Financial Transactions Ledger
   */
  static async getTransactions(query: any): Promise<{ transactions: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { providerPaymentId: regex },
        { providerOrderId: regex },
        { couponCode: regex }
      ];
    }

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(filter)
    ]);

    const transactions = payments.map((p: any) => ({
      _id: p._id,
      transactionId: p.providerPaymentId || p.providerOrderId || String(p._id).slice(-8),
      bookingId: p.bookingId,
      customer: p.customerId,
      amount: p.amount,
      paymentType: p.paymentType,
      method: p.provider || 'RAZORPAY',
      status: p.status,
      createdAt: p.createdAt
    }));

    return { transactions, total, page, limit };
  }

  /**
   * Get Master Invoices List with GST Breakdown
   */
  static async getMasterInvoices(query: any): Promise<{ invoices: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    const [invoices, total] = await Promise.all([
      InvoiceModel.find(filter)
        .populate('bookingId')
        .populate('partnerId', 'businessName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvoiceModel.countDocuments(filter)
    ]);

    const formatted = invoices.map((inv: any) => {
      const subtotal = inv.subtotal || inv.grandTotal || 0;
      const gstAmount = Math.round(subtotal * 0.18);
      const grandTotal = inv.grandTotal || (subtotal + gstAmount);

      return {
        ...inv,
        invoiceNumber: inv.invoiceNumber || `INV-${String(inv._id).slice(-6).toUpperCase()}`,
        subtotal,
        cgst: Math.round(gstAmount / 2),
        sgst: Math.round(gstAmount / 2),
        gstAmount,
        grandTotal
      };
    });

    return { invoices: formatted, total, page, limit };
  }

  /**
   * Get Executive Payouts & Commission Summary
   */
  static async getExecutivePayouts(query: any): Promise<{ payouts: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    // Fetch executives
    const executives = await UserModel.find({ role: 'EXECUTIVE', isActive: true })
      .select('fullName email phone createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await UserModel.countDocuments({ role: 'EXECUTIVE', isActive: true });

    // Calculate payouts for each executive based on completed bookings
    const BookingModel = mongoose.model('Booking');
    const payouts = await Promise.all(
      executives.map(async (exec: any) => {
        const completedCount = await BookingModel.countDocuments({
          assignedExecutiveId: exec._id,
          status: 'COMPLETED'
        });
        const commissionPerLead = 150; // Standard ₹150 commission per converted lead
        const totalEarnings = completedCount * commissionPerLead;

        return {
          _id: exec._id,
          executive: exec,
          leadsConverted: completedCount,
          commissionPerLead,
          totalEarnings,
          status: 'PROCESSED',
          lastPayoutDate: exec.createdAt
        };
      })
    );

    return { payouts, total, page, limit };
  }

  /**
   * Get Partner Withdrawal Requests for Accounts
   */
  static async getWithdrawalRequests(query: any): Promise<{ withdrawals: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    const WithdrawalRequestModel = mongoose.model('WithdrawalRequest');
    const [withdrawals, total] = await Promise.all([
      WithdrawalRequestModel.find(filter)
        .populate({
          path: 'partnerId',
          select: 'businessName userId bankDetails phone email'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WithdrawalRequestModel.countDocuments(filter)
    ]);

    return { withdrawals, total, page, limit };
  }

  /**
   * Process & Approve Partner Withdrawal Request
   */
  static async processWithdrawalRequest(userId: string, id: string, pin: string, referenceId?: string): Promise<any> {
    await this.verifySecurityPin(userId, pin);
    const WithdrawalRequestModel = mongoose.model('WithdrawalRequest');
    const withdrawal: any = await WithdrawalRequestModel.findById(id);
    if (!withdrawal) {
      throw new ApiError(404, 'Withdrawal request not found', ERROR_CODES.NOT_FOUND);
    }

    withdrawal.status = 'COMPLETED';
    withdrawal.processedAt = new Date();
    if (referenceId) withdrawal.referenceId = referenceId;
    await withdrawal.save();

    // Notify Partner
    try {
      const { notificationService } = require('../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../notification/notification.model');
      await notificationService.sendNotification(
        withdrawal.partnerId.toString(),
        NOTIFICATION_TYPE.SMS,
        NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        `Withdrawal Paid — ₹${withdrawal.amount}`,
        `Your withdrawal request of ₹${withdrawal.amount} has been processed and paid out. Ref: ${referenceId || withdrawal._id}`,
        { withdrawalId: withdrawal._id.toString() }
      );
    } catch (err) {
      console.warn("Failed to send partner withdrawal notification:", err);
    }

    return withdrawal;
  }

  /**
   * Reject Partner Withdrawal Request & Refund Wallet
   */
  static async rejectWithdrawalRequest(userId: string, id: string, pin: string, reason?: string): Promise<any> {
    await this.verifySecurityPin(userId, pin);
    const WithdrawalRequestModel = mongoose.model('WithdrawalRequest');
    const withdrawal: any = await WithdrawalRequestModel.findById(id);
    if (!withdrawal) {
      throw new ApiError(404, 'Withdrawal request not found', ERROR_CODES.NOT_FOUND);
    }

    if (withdrawal.status === 'COMPLETED') {
      throw new ApiError(400, 'Cannot reject an already completed withdrawal', ERROR_CODES.VALIDATION_ERROR);
    }

    withdrawal.status = 'FAILED';
    withdrawal.failureReason = reason || 'Rejected by Accounts';
    await withdrawal.save();

    // Refund back to Partner Wallet
    const { WalletModel } = require('../wallet/wallet.model');
    const { LedgerTransactionModel, TRANSACTION_TYPE } = require('../wallet/ledger.model');
    const wallet = await WalletModel.findOne({ partnerId: withdrawal.partnerId });
    if (wallet) {
      wallet.balance += withdrawal.amount;
      await wallet.save();

      await LedgerTransactionModel.create({
        walletId: wallet._id,
        amount: withdrawal.amount,
        type: TRANSACTION_TYPE.CREDIT,
        description: `Withdrawal Refunded - Ref: ${withdrawal._id}`,
        balanceAfter: wallet.balance,
      });
    }

    return withdrawal;
  }
}
