import { Request, Response } from 'express';
import { LogisticsService } from './logistics.service';
export class LogisticsController {
  static async assign(req: Request, res: Response) {
    try { const log = await LogisticsService.assignDriver(req.body); res.status(201).json({ success: true, data: log }); }
    catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }

  static async updateLocation(req: Request, res: Response) {
    try {
      const { lat, lng } = req.body;
      const log = await LogisticsService.updateLocation(req.params.id, lat, lng);
      res.status(200).json({ success: true, data: log });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}