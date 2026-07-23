import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class InventoryController {
  public static addStock = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const item = await InventoryService.addStock(String(userId), req.body);
    return successResponse(res, item, 'Stock item added successfully', 201);
  });

  public static getStock = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const items = await InventoryService.getStock(String(userId));
    return successResponse(res, items, 'Inventory retrieved successfully');
  });

  public static updateQuantity = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { quantity } = req.body;
    const item = await InventoryService.updateQuantity(String(userId), id, quantity);
    return successResponse(res, item, 'Quantity updated successfully');
  });

  public static deleteItem = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    await InventoryService.deleteItem(String(userId), id);
    return successResponse(res, null, 'Item deleted successfully');
  });
}
export default InventoryController;