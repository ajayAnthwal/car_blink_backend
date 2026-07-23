import StaffModel from './staff.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class StaffService {
  public static async addStaff(partnerId: string, data: any) {
    return await StaffModel.create({ ...data, partnerId });
  }

  public static async getStaff(partnerId: string) {
    return await StaffModel.find({ partnerId }).sort({ createdAt: -1 });
  }

  public static async updateStatus(partnerId: string, id: string, status: string) {
    const staff = await StaffModel.findOneAndUpdate(
      { _id: id, partnerId },
      { status },
      { new: true }
    );
    if (!staff) throw new NotFoundError('Staff member not found');
    return staff;
  }
}