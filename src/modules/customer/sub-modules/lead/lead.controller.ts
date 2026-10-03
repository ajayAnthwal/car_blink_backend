import { Request, Response } from 'express';
import { LeadService } from './lead.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class LeadController {

  public static sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    const result = await LeadService.sendLeadOtp(phone);
    return successResponse(res, result, result.message);
  });
  public static createLead = asyncHandler(async (req: IRequest, res: Response) => {
    const data = {
      ...req.body,
      customerId: req.user?.userId || undefined, // Attach logged-in user if available
    };
    const result: any = await LeadService.createLead(data);

    if (result.tokens) {
      const isProd = process.env.NODE_ENV === 'production';
      const domain = isProd ? '.carblink.in' : undefined;
      const cookieOpts = {
        secure: isProd,
        sameSite: (isProd ? 'none' : 'lax') as any,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        ...(domain ? { domain } : {})
      };
      res.cookie('accessToken', result.tokens.accessToken, { ...cookieOpts, httpOnly: true });
      res.cookie('car_blink_access_token', result.tokens.accessToken, { ...cookieOpts, httpOnly: false });
      res.cookie('refreshToken', result.tokens.refreshToken, { ...cookieOpts, httpOnly: true });
      res.cookie('role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
      res.cookie('user_role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
    }

    return successResponse(res, result, 'Lead created successfully', 201);
  });

  public static getLeads = asyncHandler(async (req: Request, res: Response) => {
    const result = await LeadService.getLeads(req.query);
    return successResponse(res, result, 'Leads retrieved successfully');
  });

  public static updateLeadStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await LeadService.updateLeadStatus(id, status);
    return successResponse(res, result, 'Lead status updated successfully');
  });
}
