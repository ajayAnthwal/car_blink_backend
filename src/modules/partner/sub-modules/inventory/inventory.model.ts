import mongoose, { Schema, Document } from 'mongoose';
export interface IInventory extends Document {
  partnerId: mongoose.Types.ObjectId;
  itemName: string;
  partNumber: string;
  quantity: number;
  price: number;
  minThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IInventory>({
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  itemName: { type: String, required: true },
  partNumber: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  minThreshold: { type: Number, default: 5 }
}, { timestamps: true });
export const InventoryModel = mongoose.model<IInventory>('Inventory', schema);
export default InventoryModel;