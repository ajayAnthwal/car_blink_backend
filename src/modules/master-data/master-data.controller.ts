import { Request, Response } from 'express';
import { MasterDataService } from './master-data.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';

export class MasterDataController {
  // Services
  public static getServices = asyncHandler(async (req: Request, res: Response) => {
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
    };
    const result = await MasterDataService.getAllServices(query);
    return successResponse(res, result, 'Services retrieved successfully');
  });

  public static getServiceBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const result = await MasterDataService.getServiceBySlug(slug);
    return successResponse(res, result, 'Service details retrieved successfully');
  });

  public static createService = asyncHandler(async (req: Request, res: Response) => {
    const result = await MasterDataService.createService(req.body);
    return successResponse(res, result, 'Service created successfully', 201);
  });

  public static updateService = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await MasterDataService.updateService(id, req.body);
    return successResponse(res, result, 'Service updated successfully');
  });

  public static deleteService = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await MasterDataService.deleteService(id);
    return successResponse(res, result, 'Service deleted successfully');
  });

  // Cities
  public static getCities = asyncHandler(async (req: Request, res: Response) => {
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const result = await MasterDataService.getAllCities(query);
    return successResponse(res, result, 'Cities retrieved successfully');
  });

  public static createCity = asyncHandler(async (req: Request, res: Response) => {
    const result = await MasterDataService.createCity(req.body);
    return successResponse(res, result, 'City created successfully', 201);
  });

  public static updateCity = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await MasterDataService.updateCity(id, req.body);
    return successResponse(res, result, 'City updated successfully');
  });

  public static deleteCity = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await MasterDataService.deleteCity(id);
    return successResponse(res, result, 'City deleted successfully');
  });

  // Vehicle Brands & Models
  public static getVehicleBrands = asyncHandler(async (req: Request, res: Response) => {
    const result = await MasterDataService.getAllVehicleBrands();
    return successResponse(res, result, 'Vehicle brands retrieved successfully');
  });

  public static getVehicleModels = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = req.query;
    const result = await MasterDataService.getVehicleModelsByBrand(String(brandId));
    return successResponse(res, result, 'Vehicle models retrieved successfully');
  });

  public static createVehicleBrand = asyncHandler(async (req: Request, res: Response) => {
    const result = await MasterDataService.createVehicleBrand(req.body);
    return successResponse(res, result, 'Vehicle brand created successfully', 201);
  });

  public static createVehicleModel = asyncHandler(async (req: Request, res: Response) => {
    const result = await MasterDataService.createVehicleModel(req.body);
    return successResponse(res, result, 'Vehicle model created successfully', 201);
  });

  // Plans
  public static getPlans = asyncHandler(async (req: Request, res: Response) => {
    const result = await MasterDataService.getAllPlans();
    return successResponse(res, result, 'Plans retrieved successfully');
  });
}
