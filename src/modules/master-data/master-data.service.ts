import { ServiceModel, IService } from './models/service.model';
import { CityModel, ICity } from './models/city.model';
import { VehicleBrandModel, VehicleModelModel, IVehicleBrand, IVehicleModel } from './models/vehicle.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../common/utils/pagination.util';
import { NotFoundError } from '../../common/errors/NotFoundError';

export class MasterDataService {
  // Services
  public static async getAllServices(query: { page?: number; limit?: number; search?: string; category?: string }): Promise<IPaginatedResult<IService>> {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = { isActive: true };
    
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
    if (query.category) {
      filter.category = query.category;
    }

    const [data, total] = await Promise.all([
      ServiceModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
      ServiceModel.countDocuments(filter),
    ]);
    return formatPaginatedResponse(data, total, page, limit);
  }

  public static async getServiceBySlug(slug: string): Promise<IService> {
    const service = await ServiceModel.findOne({ slug, isActive: true });
    if (!service) {
      throw new NotFoundError('Service not found');
    }
    return service;
  }

  public static async createService(data: Partial<IService>): Promise<IService> {
    return await ServiceModel.create(data);
  }

  public static async updateService(id: string, data: Partial<IService>): Promise<IService> {
    const service = await ServiceModel.findOneAndUpdate({ _id: id, isActive: true }, data, { new: true });
    if (!service) {
      throw new NotFoundError('Service category not found');
    }
    return service;
  }

  public static async deleteService(id: string): Promise<IService> {
    const service = await ServiceModel.findOneAndUpdate({ _id: id, isActive: true }, { isActive: false }, { new: true });
    if (!service) {
      throw new NotFoundError('Service category not found');
    }
    return service;
  }

  // Cities
  public static async getAllCities(query: { page?: number; limit?: number }): Promise<IPaginatedResult<ICity>> {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter = { isActive: true };
    const [data, total] = await Promise.all([
      CityModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
      CityModel.countDocuments(filter),
    ]);
    return formatPaginatedResponse(data, total, page, limit);
  }

  public static async createCity(data: Partial<ICity>): Promise<ICity> {
    return await CityModel.create(data);
  }

  public static async updateCity(id: string, data: Partial<ICity>): Promise<ICity> {
    const city = await CityModel.findOneAndUpdate({ _id: id, isActive: true }, data, { new: true });
    if (!city) {
      throw new NotFoundError('City not found');
    }
    return city;
  }

  public static async deleteCity(id: string): Promise<ICity> {
    const city = await CityModel.findOneAndUpdate({ _id: id, isActive: true }, { isActive: false }, { new: true });
    if (!city) {
      throw new NotFoundError('City not found');
    }
    return city;
  }

  // Vehicle Brands & Models
  public static async getAllVehicleBrands(): Promise<IVehicleBrand[]> {
    return await VehicleBrandModel.find({ isActive: true }).sort({ name: 1 });
  }

  public static async getVehicleModelsByBrand(brandId: string): Promise<IVehicleModel[]> {
    const brandExists = await VehicleBrandModel.findOne({ _id: brandId, isActive: true });
    if (!brandExists) {
      throw new NotFoundError('Vehicle brand not found');
    }
    return await VehicleModelModel.find({ brandId, isActive: true }).populate('brandId').sort({ name: 1 });
  }

  public static async createVehicleBrand(data: Partial<IVehicleBrand>): Promise<IVehicleBrand> {
    return await VehicleBrandModel.create(data);
  }

  public static async createVehicleModel(data: { brandId: string; name: string }): Promise<IVehicleModel> {
    const brandExists = await VehicleBrandModel.findOne({ _id: data.brandId, isActive: true });
    if (!brandExists) {
      throw new NotFoundError('Vehicle brand not found');
    }
    const model = await VehicleModelModel.create(data);
    return await model.populate('brandId');
  }
}
