import { InventoryModel } from './inventory.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class InventoryService {
  public static async addStock(partnerId: string, data: any) {
    return await InventoryModel.create({ ...data, partnerId });
  }

  public static async getStock(partnerId: string) {
    return await InventoryModel.find({ partnerId }).sort({ createdAt: -1 });
  }

  public static async updateStockItem(partnerId: string, id: string, data: any) {
    const item = await InventoryModel.findOneAndUpdate(
      { _id: id, partnerId },
      data,
      { new: true }
    );
    if (!item) throw new NotFoundError('Inventory item not found');
    return item;
  }

  public static async deleteItem(partnerId: string, id: string) {
    const item = await InventoryModel.findOneAndDelete({ _id: id, partnerId });
    if (!item) throw new NotFoundError('Inventory item not found');
    return item;
  }
}