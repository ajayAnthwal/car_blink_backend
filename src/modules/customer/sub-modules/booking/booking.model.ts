import mongoose, { Schema, Document } from 'mongoose';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';

export interface IBooking extends Document {
  customerId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  cityId: mongoose.Types.ObjectId;
  description?: string;
  preferredDate?: Date;
  status: BOOKING_STATUS;
  acceptedBidId?: mongoose.Types.ObjectId;
  forwardedBidIds?: mongoose.Types.ObjectId[];
  assignedExecutiveId?: mongoose.Types.ObjectId;
  beforePhotos: string[];
  afterPhotos: string[];
  cancellationReason?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  appliedCoupon?: string;
  couponDiscountAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Garage',
      required: [true, 'Vehicle ID is required'],
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
    },
    cityId: {
      type: Schema.Types.ObjectId,
      ref: 'City',
      required: [true, 'City ID is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    preferredDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BOOKING_STATUS),
        message: '{VALUE} is not a valid booking status',
      },
      default: BOOKING_STATUS.PENDING,
      required: true,
    },
    acceptedBidId: {
      type: Schema.Types.ObjectId,
      ref: 'Bid', // future Bid model
      default: null,
    },
    forwardedBidIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Bid',
    }],
    assignedExecutiveId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    beforePhotos: {
      type: [String],
      default: [],
    },
    afterPhotos: {
      type: [String],
      default: [],
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    appliedCoupon: {
      type: String,
      trim: true,
    },
    couponDiscountAmount: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

// Add compound indexes for query efficiency
BookingSchema.index({ customerId: 1, status: 1 });
BookingSchema.index({ cityId: 1, serviceId: 1, status: 1 });
BookingSchema.index({ location: '2dsphere' });

export const BookingModel = mongoose.model<IBooking>('Booking', BookingSchema);
export default BookingModel;
