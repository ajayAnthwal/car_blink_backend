import { Request, Response } from 'express';
import { WalletService } from './wallet.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class WalletController {
  public static getMyWallet = async (req: IRequest, res: Response) => {
    const partnerId = req.user?.userId;
    if (!partnerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const statement = await WalletService.getWalletStatement(partnerId);
    return successResponse(res, statement, 'Wallet statement retrieved successfully');
  };

  public static createDuesOrder = async (req: IRequest, res: Response) => {
    const partnerId = req.user?.userId;
    const { amount } = req.body;
    if (!partnerId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing amount' });
    }

    const order = await WalletService.createDuesOrder(partnerId, amount);
    return successResponse(res, order, 'Order created successfully');
  };

  public static verifyDuesPayment = async (req: IRequest, res: Response) => {
    const partnerId = req.user?.userId;
    const { orderId, paymentId, signature, amount } = req.body;
    if (!partnerId || !orderId || !paymentId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const wallet = await WalletService.verifyDuesPayment(partnerId, orderId, paymentId, signature, amount);
    return successResponse(res, wallet, 'Payment verified successfully');
  };

  public static requestWithdrawal = async (req: IRequest, res: Response) => {
    const partnerId = req.user?.userId;
    const { amount } = req.body;
    if (!partnerId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing amount' });
    }

    const withdrawal = await WalletService.requestWithdrawal(partnerId, amount);
    return successResponse(res, withdrawal, 'Withdrawal requested successfully');
  };
}

export default WalletController;
