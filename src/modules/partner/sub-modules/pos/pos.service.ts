import PosModel from './pos.model';

export class PosService {
  public static async generateInvoice(partnerId: string, data: any) {
    return await PosModel.create({ ...data, partnerId });
  }

  public static async getInvoices(partnerId: string) {
    return await PosModel.find({ partnerId }).sort({ createdAt: -1 });
  }
}