import mongoose, { Schema, Document } from 'mongoose';

export interface IWarranty extends Document {
  bookingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  warrantyPeriodMonths: number;
  warrantyDocumentUrl?: string;
  startDate: Date;
  expiryDate: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED';
  createdAt: Date;
  updatedAt: Date;
}

const WarrantySchema = new Schema<IWarranty>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    warrantyPeriodMonths: {
      type: Number,
      required: [true, 'Warranty period in months is required'],
      min: [1, 'Warranty period must be at least 1 month'],
    },
    warrantyDocumentUrl: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    expiryDate: {
      type: Date,
      // Will be auto-calculated in the pre-save hook
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'EXPIRED', 'CLAIMED'],
        message: '{VALUE} is not a valid warranty status',
      },
      default: 'ACTIVE',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate expiryDate
WarrantySchema.pre('save', function (next) {
  if (this.isModified('startDate') || this.isModified('warrantyPeriodMonths')) {
    const start = new Date(this.startDate);
    start.setMonth(start.getMonth() + this.warrantyPeriodMonths);
    this.expiryDate = start;
  }
  next();
});

export const WarrantyModel = mongoose.model<IWarranty>('Warranty', WarrantySchema);
export default WarrantyModel;
