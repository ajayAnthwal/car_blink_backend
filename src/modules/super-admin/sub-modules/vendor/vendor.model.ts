import mongoose, { Schema, Document } from 'mongoose';
export interface IVendor extends Document {
  vendorName: string; contactPerson: string; phone: string; address: string; rating: number; suppliedParts: string[];
}
const schema = new Schema<IVendor>({
  vendorName: { type: String, required: true }, contactPerson: { type: String, required: true },
  phone: { type: String, required: true }, address: { type: String, required: true },
  rating: { type: Number, default: 5 }, suppliedParts: [{ type: String }]
}, { timestamps: true });
export default mongoose.model<IVendor>('Vendor', schema);