import { ServiceModel, IService } from './models/service.model';
import { CityModel, ICity } from './models/city.model';
import { StateModel, IState } from './models/state.model';
import { VehicleBrandModel, VehicleModelModel, IVehicleBrand, IVehicleModel } from './models/vehicle.model';
import { PlanModel, IPlan } from './models/plan.model';
import { getPaginationOptions, formatPaginatedResponse, IPaginatedResult } from '../../common/utils/pagination.util';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { ConflictError } from '../../common/errors/ConflictError';

export class MasterDataService {
  // ==========================================
  // STATES CRUD (Geographic Hierarchy Level 1)
  // ==========================================

  public static async getAllStates(query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: string;
    includeCitiesCount?: boolean;
  }): Promise<IPaginatedResult<any>> {
    const { page, limit, skip } = getPaginationOptions(query, 500);
    const filter: any = {};

    if (query.isActive !== undefined && query.isActive !== 'all') {
      filter.isActive = query.isActive === 'true';
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { code: searchRegex }];
    }

    const [states, total] = await Promise.all([
      StateModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }).lean(),
      StateModel.countDocuments(filter),
    ]);

    // Attach city count per state
    const stateIds = states.map((s: any) => s._id);
    const stateNames = states.map((s: any) => s.name);

    const cityCounts = await CityModel.aggregate([
      {
        $match: {
          $or: [
            { stateId: { $in: stateIds } },
            { state: { $in: stateNames } }
          ]
        }
      },
      {
        $group: {
          _id: { $ifNull: ['$stateId', '$state'] },
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = new Map<string, number>();
    cityCounts.forEach((c: any) => {
      countMap.set(String(c._id), c.count);
    });

    const enrichedStates = states.map((state: any) => ({
      ...state,
      citiesCount: countMap.get(String(state._id)) || countMap.get(state.name) || 0,
    }));

    return formatPaginatedResponse(enrichedStates, total, page, limit);
  }

  public static async getStateById(id: string): Promise<any> {
    const state = await StateModel.findById(id).lean();
    if (!state) {
      throw new NotFoundError('State not found');
    }

    const cities = await CityModel.find({
      $or: [{ stateId: state._id }, { state: state.name }]
    }).sort({ name: 1 }).lean();

    return {
      ...state,
      cities,
      citiesCount: cities.length,
    };
  }

  public static async createState(data: {
    name: string;
    code?: string;
    country?: string;
    isActive?: boolean;
  }): Promise<IState> {
    const cleanName = data.name.trim();
    const existing = await StateModel.findOne({
      name: { $regex: `^${cleanName}$`, $options: 'i' },
    });
    if (existing) {
      throw new ConflictError(`State "${cleanName}" already exists`);
    }

    return await StateModel.create({
      name: cleanName,
      code: data.code?.trim().toUpperCase(),
      country: data.country?.trim() || 'India',
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  public static async updateState(id: string, data: Partial<IState>): Promise<IState> {
    const state = await StateModel.findById(id);
    if (!state) {
      throw new NotFoundError('State not found');
    }

    const previousName = state.name;

    if (data.name && data.name.trim() !== state.name) {
      const cleanName = data.name.trim();
      const duplicate = await StateModel.findOne({
        _id: { $ne: id },
        name: { $regex: `^${cleanName}$`, $options: 'i' },
      });
      if (duplicate) {
        throw new ConflictError(`Another state with name "${cleanName}" already exists`);
      }
      state.name = cleanName;
    }

    if (data.code !== undefined) {
      state.code = data.code ? data.code.trim().toUpperCase() : undefined;
    }
    if (data.country !== undefined) {
      state.country = data.country.trim();
    }
    if (data.isActive !== undefined) {
      state.isActive = data.isActive;
    }

    await state.save();

    // If state name changed, update the string reference across all associated cities
    if (data.name && data.name.trim() !== previousName) {
      await CityModel.updateMany(
        { $or: [{ stateId: state._id }, { state: previousName }] },
        { $set: { state: state.name, stateId: state._id } }
      );
    }

    return state;
  }

  public static async deleteState(id: string, deleteLinkedCities: boolean = false): Promise<{ message: string; deletedCitiesCount: number }> {
    const state = await StateModel.findById(id);
    if (!state) {
      throw new NotFoundError('State not found');
    }

    let deletedCitiesCount = 0;
    if (deleteLinkedCities) {
      const result = await CityModel.deleteMany({
        $or: [{ stateId: state._id }, { state: state.name }]
      });
      deletedCitiesCount = result.deletedCount || 0;
    } else {
      // Unlink stateId from cities so they aren't orphaned
      await CityModel.updateMany(
        { stateId: state._id },
        { $unset: { stateId: 1 } }
      );
    }

    await StateModel.findByIdAndDelete(id);

    return {
      message: `State "${state.name}" deleted successfully`,
      deletedCitiesCount,
    };
  }

  // ==========================================
  // CITIES CRUD (Geographic Hierarchy Level 2)
  // ==========================================

  public static async getAllCities(query: {
    page?: number;
    limit?: number;
    search?: string;
    state?: string;
    stateId?: string;
    isActive?: string;
  }): Promise<IPaginatedResult<any>> {
    const { page, limit, skip } = getPaginationOptions(query, 5000);
    const filter: any = {};

    if (query.isActive !== undefined && query.isActive !== 'all') {
      filter.isActive = query.isActive === 'true';
    }

    if (query.stateId) {
      filter.stateId = query.stateId;
    } else if (query.state && query.state.trim() !== 'all') {
      filter.state = { $regex: new RegExp(`^${query.state.trim()}$`, 'i') };
    }

    if (query.search) {
      filter.name = { $regex: new RegExp(query.search.trim(), 'i') };
    }

    const [data, total] = await Promise.all([
      CityModel.find(filter)
        .populate('stateId', 'name code country')
        .skip(skip)
        .limit(limit)
        .sort({ state: 1, name: 1 })
        .lean(),
      CityModel.countDocuments(filter),
    ]);

    return formatPaginatedResponse(data, total, page, limit);
  }

  public static async getCityById(id: string): Promise<ICity> {
    const city = await CityModel.findById(id).populate('stateId', 'name code country');
    if (!city) {
      throw new NotFoundError('City not found');
    }
    return city;
  }

  public static async createCity(data: {
    name: string;
    state?: string;
    stateId?: string;
    isActive?: boolean;
  }): Promise<ICity> {
    const cleanCityName = data.name.trim();
    let stateName = data.state?.trim() || '';
    let stateId = data.stateId;

    if (stateId) {
      const stateObj = await StateModel.findById(stateId);
      if (!stateObj) {
        throw new NotFoundError('Selected State not found');
      }
      stateName = stateObj.name;
    } else if (stateName) {
      // Find or auto-link StateModel
      let stateObj = await StateModel.findOne({
        name: { $regex: `^${stateName}$`, $options: 'i' }
      });
      if (!stateObj) {
        stateObj = await StateModel.create({
          name: stateName,
          country: 'India',
          isActive: true
        });
      }
      stateId = (stateObj._id as any);
      stateName = stateObj.name;
    } else {
      throw new ConflictError('A valid state or stateId must be specified');
    }

    // Check for duplicate city within this state
    const existing = await CityModel.findOne({
      name: { $regex: `^${cleanCityName}$`, $options: 'i' },
      $or: [
        { state: { $regex: `^${stateName}$`, $options: 'i' } },
        ...(stateId ? [{ stateId }] : [])
      ]
    });

    if (existing) {
      throw new ConflictError(`City "${cleanCityName}" already exists in ${stateName}`);
    }

    const created = await CityModel.create({
      name: cleanCityName,
      state: stateName,
      stateId,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return await created.populate('stateId', 'name code country');
  }

  public static async updateCity(id: string, data: Partial<ICity>): Promise<ICity> {
    const city = await CityModel.findById(id);
    if (!city) {
      throw new NotFoundError('City not found');
    }

    if (data.name) {
      city.name = data.name.trim();
    }

    if (data.stateId) {
      const stateObj = await StateModel.findById(data.stateId);
      if (!stateObj) {
        throw new NotFoundError('Selected State not found');
      }
      city.stateId = stateObj._id as any;
      city.state = stateObj.name;
    } else if (data.state && data.state.trim() !== city.state) {
      const cleanStateName = data.state.trim();
      let stateObj = await StateModel.findOne({
        name: { $regex: `^${cleanStateName}$`, $options: 'i' }
      });
      if (!stateObj) {
        stateObj = await StateModel.create({
          name: cleanStateName,
          country: 'India',
          isActive: true
        });
      }
      city.stateId = stateObj._id as any;
      city.state = stateObj.name;
    }

    if (data.isActive !== undefined) {
      city.isActive = data.isActive;
    }

    await city.save();
    return await city.populate('stateId', 'name code country');
  }

  public static async deleteCity(id: string): Promise<ICity> {
    const city = await CityModel.findByIdAndDelete(id);
    if (!city) {
      throw new NotFoundError('City not found');
    }
    return city;
  }

  // ==========================================
  // GEOGRAPHIC HIERARCHY
  // ==========================================

  public static async getLocationHierarchy(): Promise<any[]> {
    const [states, cities] = await Promise.all([
      StateModel.find({ isActive: true }).sort({ name: 1 }).lean(),
      CityModel.find({ isActive: true }).sort({ name: 1 }).lean()
    ]);

    // Group cities under each state
    const stateCitiesMap = new Map<string, any[]>();
    cities.forEach((city) => {
      const key = city.stateId ? String(city.stateId) : city.state.toLowerCase();
      if (!stateCitiesMap.has(key)) {
        stateCitiesMap.set(key, []);
      }
      stateCitiesMap.get(key)!.push(city);
    });

    return states.map((state) => {
      const byId = stateCitiesMap.get(String(state._id)) || [];
      const byName = stateCitiesMap.get(state.name.toLowerCase()) || [];
      // Deduplicate
      const cityMap = new Map<string, any>();
      [...byId, ...byName].forEach((c) => cityMap.set(String(c._id), c));

      return {
        _id: state._id,
        name: state.name,
        code: state.code,
        country: state.country,
        cities: Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  }

  // ==========================================
  // SERVICES
  // ==========================================

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
    const service = await ServiceModel.findByIdAndDelete(id);
    if (!service) {
      throw new NotFoundError('Service category not found');
    }
    return service;
  }

  // ==========================================
  // VEHICLES & PLANS
  // ==========================================

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

  public static async getAllPlans(): Promise<IPlan[]> {
    return await PlanModel.find({ isActive: true }).sort({ price: 1 });
  }
}
