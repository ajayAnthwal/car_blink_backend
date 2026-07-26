import { GlobalSettingsModel } from './settings.model';

export class SuperAdminSettingsService {
  async getSettings() {
    let settings = await GlobalSettingsModel.findOne();
    if (!settings) {
      settings = await GlobalSettingsModel.create({});
    }
    return settings;
  }

  async updateSettings(data: any) {
    let settings = await GlobalSettingsModel.findOne();
    if (!settings) {
      settings = new GlobalSettingsModel(data);
    } else {
      if (data.platformCommissionRate !== undefined) settings.platformCommissionRate = data.platformCommissionRate;
      if (data.tdsRate !== undefined) settings.tdsRate = data.tdsRate;
      if (data.gstRate !== undefined) settings.gstRate = data.gstRate;
      if (data.supportEmail !== undefined) settings.supportEmail = data.supportEmail;
      if (data.supportPhone !== undefined) settings.supportPhone = data.supportPhone;
      if (data.activeBanners !== undefined) settings.activeBanners = data.activeBanners;
      if (data.isBookingPaused !== undefined) settings.isBookingPaused = data.isBookingPaused;
    }
    await settings.save();
    return settings;
  }
}

export const superAdminSettingsService = new SuperAdminSettingsService();
