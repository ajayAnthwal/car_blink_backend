import VendorModel from './vendor.model';
export class VendorService {
  static async onboard(data: any) { return await VendorModel.create(data); }
  static async getVendors() { return await VendorModel.find({}); }
}