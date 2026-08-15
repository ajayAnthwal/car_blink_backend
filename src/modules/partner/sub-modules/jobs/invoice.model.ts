import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  bookingId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  reviewedByExecutiveId?: mongoose.Types.ObjectId;
  invoiceType: 'ITEMIZED' | 'PDF';
  pdfUrl?: string;
  items: IInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  executiveNotes?: string;
  status: 'SUBMITTED_TO_EXECUTIVE' | 'APPROVED_BY_EXECUTIVE' | 'FORWARDED_TO_CUSTOMER' | 'REJECTED' | 'PAID';
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
});

const InvoiceSchema = new Schema<IInvoice>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
      index: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reviewedByExecutiveId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    invoiceType: {
      type: String,
      enum: ['ITEMIZED', 'PDF'],
      default: 'ITEMIZED',
      required: true
    },
    pdfUrl: {
      type: String,
      trim: true
    },
    items: {
      type: [InvoiceItemSchema],
      default: []
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      trim: true
    },
    executiveNotes: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['SUBMITTED_TO_EXECUTIVE', 'APPROVED_BY_EXECUTIVE', 'FORWARDED_TO_CUSTOMER', 'REJECTED', 'PAID'],
      default: 'SUBMITTED_TO_EXECUTIVE',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default InvoiceModel;
