import { Request, Response } from 'express';
import { VendorService } from './vendor.service';
export class VendorController {
  static async onboard(req: Request, res: Response) {
    try { const v = await VendorService.onboard(req.body); res.status(201).json({ success: true, data: v }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}