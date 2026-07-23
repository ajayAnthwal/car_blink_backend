import LogisticsModel from './logistics.model';
export class LogisticsService {
  static async assignDriver(data: any) { return await LogisticsModel.create(data); }
  static async updateStatus(id: string, status: string) { return await LogisticsModel.findByIdAndUpdate(id, { status }, { new: true }); }
  static async updateLocation(id: string, lat: number, lng: number) {
    return await LogisticsModel.findByIdAndUpdate(id, { currentLocation: { lat, lng, lastUpdatedAt: new Date() } }, { new: true });
  }
}