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
  followUpDate?: Date;
  serviceMode?: 'DOORSTEP' | 'GARAGE_VISIT';
  paymentMode?: 'CASH' | 'ONLINE';
  address?: string;
  landmark?: string;
  remarks?: string;
  satisfactionStatus?: 'NOT_SENT' | 'PENDING_CUSTOMER' | 'SATISFIED' | 'DISSATISFIED';
  satisfactionRating?: number;
  satisfactionFeedback?: string;
  satisfactionSentAt?: Date;
  satisfactionRespondedAt?: Date;
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
    },
    followUpDate: {
      type: Date,
    },
    serviceMode: {
      type: String,
      enum: ['DOORSTEP', 'GARAGE_VISIT'],
      default: 'GARAGE_VISIT',
    },
    paymentMode: {
      type: String,
      enum: ['CASH', 'ONLINE'],
      default: 'ONLINE',
    },
    address: {
      type: String,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    satisfactionStatus: {
      type: String,
      enum: ['NOT_SENT', 'PENDING_CUSTOMER', 'SATISFIED', 'DISSATISFIED'],
      default: 'NOT_SENT',
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    satisfactionFeedback: {
      type: String,
      trim: true,
    },
    satisfactionSentAt: {
      type: Date,
    },
    satisfactionRespondedAt: {
      type: Date,
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
