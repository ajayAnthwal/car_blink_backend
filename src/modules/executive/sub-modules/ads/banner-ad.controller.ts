import { Response } from 'express';
import { bannerAdService } from './banner-ad.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class BannerAdController {
  public static createAd = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const ad = await bannerAdService.createAd(req.body, userId);
    return successResponse(res, ad, 'Banner ad created successfully', 201);
  });

  public static getAllAds = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await bannerAdService.getAllAds(req.query);
    return successResponse(res, result, 'Banner ads retrieved successfully');
  });

  public static getActiveAds = asyncHandler(async (req: IRequest, res: Response) => {
    const { placement } = req.query;
    const ads = await bannerAdService.getActiveAds(placement as string);
    return successResponse(res, ads, 'Active banner ads retrieved successfully');
  });

  public static updateAd = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const ad = await bannerAdService.updateAd(id, req.body);
    return successResponse(res, ad, 'Banner ad updated successfully');
  });

  public static deleteAd = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const result = await bannerAdService.deleteAd(id);
    return successResponse(res, result, 'Banner ad deleted successfully');
  });
}

export default BannerAdController;
