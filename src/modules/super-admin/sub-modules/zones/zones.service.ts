import { OperationalZoneModel } from './zone.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { ConflictError } from '../../../../common/errors/ConflictError';

export class SuperAdminZonesService {
  async getAllZones(query: any = {}) {
    const filter: any = {};
    if (query.city) {
      filter.city = { $regex: query.city, $options: 'i' };
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    return await OperationalZoneModel.find(filter).sort({ name: 1 }).lean();
  }

  async createZone(data: any) {
    const existing = await OperationalZoneModel.findOne({ name: data.name });
    if (existing) {
      throw new ConflictError('A zone with this name already exists');
    }
    return await OperationalZoneModel.create(data);
  }

  async updateZone(id: string, data: any) {
    const zone = await OperationalZoneModel.findByIdAndUpdate(id, data, { new: true });
    if (!zone) {
      throw new NotFoundError('Zone not found');
    }
    return zone;
  }

  async deleteZone(id: string) {
    const zone = await OperationalZoneModel.findByIdAndDelete(id);
    if (!zone) {
      throw new NotFoundError('Zone not found');
    }
    return zone;
  }
}

export const superAdminZonesService = new SuperAdminZonesService();
