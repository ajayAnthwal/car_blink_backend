import mongoose from 'mongoose';
import { CustomerWalletModel, CustomerWalletTransactionModel, WALLET_TRANSACTION_TYPE } from '../../../customer/sub-modules/wallet/customer-wallet.model';
import { UserModel } from '../../../user/user.model';
import AuditLogModel from '../../../super-admin/sub-modules/audit-logs/audit-log.model';
import { BadRequestError } from '../../../../common/errors/BadRequestError';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { ROLES } from '../../../../common/constants/roles.constant';
import { AdjustCustomerWalletInput } from './executive-wallet.validation';

export class ExecutiveWalletService {
  /**
   * Get confirmed customer profile and their current wallet balance & recent transactions
   */
  async getCustomerWalletDetails(customerId: string) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid customer ID format');
    }

    const customer = await UserModel.findById(customerId).select('fullName phone email role isActive createdAt').lean();
    if (!customer) {
      throw new NotFoundError('Customer user not found');
    }

    if (customer.role !== ROLES.CUSTOMER) {
      throw new BadRequestError(`Target user '${customer.fullName || customerId}' is not a customer`);
    }

    let wallet = await CustomerWalletModel.findOne({ customerId }).lean();
    if (!wallet) {
      wallet = {
        _id: new mongoose.Types.ObjectId(),
        customerId: new mongoose.Types.ObjectId(customerId),
        balance: 0,
        currency: 'INR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }

    const recentTransactions = await CustomerWalletTransactionModel.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      customer: {
        _id: customer._id,
        fullName: customer.fullName || 'Customer',
        phone: customer.phone || '',
        email: customer.email || '',
        createdAt: customer.createdAt,
      },
      wallet: {
        balance: wallet?.balance ?? 0,
        currency: wallet?.currency ?? 'INR',
        isActive: wallet?.isActive ?? true,
      },
      recentTransactions,
    };
  }

  /**
   * Execute atomic Credit or Debit on a customer's promotional wallet
   */
  async adjustCustomerWallet(
    executiveUserId: string,
    executiveRole: string,
    clientIp: string,
    data: AdjustCustomerWalletInput
  ) {
    const { customerId, type, amount, note, idempotencyKey } = data;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw new BadRequestError('Invalid customer ID format');
    }

    // 1. Verify customer exists and holds the CUSTOMER role
    const customer = await UserModel.findById(customerId).select('fullName phone email role').lean();
    if (!customer) {
      throw new BadRequestError(`Customer user not found with ID '${customerId}'`);
    }

    if (customer.role !== ROLES.CUSTOMER) {
      throw new BadRequestError(`Target user '${customer.fullName || customerId}' does not have the CUSTOMER role`);
    }

    // 2. Check Idempotency key if provided
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      const existingTx = await CustomerWalletTransactionModel.findOne({ idempotencyKey: idempotencyKey.trim() }).lean();
      if (existingTx) {
        const existingWallet = await CustomerWalletModel.findOne({ customerId }).lean();
        return {
          success: true,
          message: 'Transaction already processed (idempotent)',
          balance: existingWallet?.balance ?? existingTx.balanceAfter,
          transaction: existingTx,
        };
      }
    }

    const cleanAmount = Math.round(amount * 100) / 100;
    if (cleanAmount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    // 3. Start Multi-Document Atomic Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedWallet: any = null;
    let createdTx: any = null;

    try {
      if (type === WALLET_TRANSACTION_TYPE.CREDIT) {
        updatedWallet = await CustomerWalletModel.findOneAndUpdate(
          { customerId },
          {
            $inc: { balance: cleanAmount },
            $setOnInsert: { currency: 'INR', isActive: true },
          },
          { new: true, upsert: true, session }
        );
      } else if (type === WALLET_TRANSACTION_TYPE.DEBIT) {
        // Atomic conditional update: strictly ensures balance >= cleanAmount
        updatedWallet = await CustomerWalletModel.findOneAndUpdate(
          { customerId, balance: { $gte: cleanAmount } },
          { $inc: { balance: -cleanAmount } },
          { new: true, session }
        );

        if (!updatedWallet) {
          // Check current balance to provide a clear error message
          const currentWallet = await CustomerWalletModel.findOne({ customerId }).session(session).lean();
          const currentBal = currentWallet?.balance ?? 0;
          throw new BadRequestError(
            `Insufficient wallet balance (Current balance: ₹${currentBal}). Debit of ₹${cleanAmount} cannot make the balance negative.`
          );
        }
      } else {
        throw new BadRequestError(`Invalid transaction type '${type}'`);
      }

      // Ensure 2 decimal places precision on the stored balance
      updatedWallet.balance = Math.round(updatedWallet.balance * 100) / 100;
      await updatedWallet.save({ session });

      // Create transaction ledger record
      const [tx] = await CustomerWalletTransactionModel.create(
        [
          {
            walletId: updatedWallet._id,
            customerId: new mongoose.Types.ObjectId(customerId),
            type,
            amount: cleanAmount,
            note: note.trim(),
            createdBy: new mongoose.Types.ObjectId(executiveUserId),
            createdByRole: executiveRole || 'EXECUTIVE',
            balanceAfter: updatedWallet.balance,
            idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
          },
        ],
        { session }
      );
      createdTx = tx;

      // Log in Audit Trail
      await AuditLogModel.create(
        [
          {
            userId: mongoose.Types.ObjectId.isValid(executiveUserId) ? new mongoose.Types.ObjectId(executiveUserId) : undefined,
            userRole: executiveRole || 'EXECUTIVE',
            action: type === WALLET_TRANSACTION_TYPE.CREDIT ? 'EXECUTIVE_WALLET_CREDIT' : 'EXECUTIVE_WALLET_DEBIT',
            endpoint: '/api/executive/wallet/adjust',
            method: 'POST',
            payload: {
              customerId,
              customerName: customer.fullName,
              customerPhone: customer.phone,
              type,
              amount: cleanAmount,
              note: note.trim(),
              balanceAfter: updatedWallet.balance,
              transactionId: createdTx._id,
            },
            ipAddress: clientIp,
            status: 'SUCCESS',
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();
      session.endSession();
    } catch (err: any) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }

    // 4. Dispatch Live Socket & In-App Notification (Safely in try/catch outside transaction)
    try {
      const { emitToUser } = require('../../../../sockets');
      emitToUser(customerId.toString(), 'wallet_updated', {
        balance: updatedWallet.balance,
        transaction: {
          _id: createdTx._id,
          type: createdTx.type,
          amount: createdTx.amount,
          note: createdTx.note,
          source: 'CarBlink Executive',
          balanceAfter: createdTx.balanceAfter,
          createdAt: createdTx.createdAt,
        },
      });
    } catch (socketErr) {
      console.warn('Socket emission failed for wallet update:', socketErr);
    }

    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
      await notificationService.sendNotification(
        customerId.toString(),
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.GENERAL,
        type === WALLET_TRANSACTION_TYPE.CREDIT ? `Wallet Credited — ₹${cleanAmount}` : `Wallet Debited — ₹${cleanAmount}`,
        type === WALLET_TRANSACTION_TYPE.CREDIT
          ? `₹${cleanAmount} has been credited to your CarBlink wallet. Note: ${note.trim()}`
          : `₹${cleanAmount} has been deducted from your CarBlink wallet. Reason: ${note.trim()}`,
        { balance: updatedWallet.balance, transactionId: createdTx._id }
      );
    } catch (notifErr) {
      console.warn('Notification dispatch failed for wallet update:', notifErr);
    }

    return {
      success: true,
      balance: updatedWallet.balance,
      transaction: createdTx,
    };
  }
}

export const executiveWalletService = new ExecutiveWalletService();
