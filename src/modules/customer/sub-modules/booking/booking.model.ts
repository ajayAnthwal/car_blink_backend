import mongoose, { Schema, Document } from 'mongoose';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';

export interface IBookingCancellationDetails {
  reasons?: string[];
  customerRemarks?: string;
  requestedAt?: Date;
  executiveStatus?: 'PENDING_REVIEW' | 'CALL_CONNECTED' | 'CALL_NO_ANSWER' | 'RETAINED' | 'FORWARDED_TO_ACCOUNTS' | 'REJECTED';
  executiveId?: mongoose.Types.ObjectId;
  executiveNotes?: string;
  callAttempts?: number;
  lastCallAt?: Date;
  refundAmount?: number;
  deductionAmount?: number;
  deductionReason?: string;
  accountsStatus?: 'NOT_FORWARDED' | 'PENDING_ACCOUNTS' | 'PROCESSED' | 'REJECTED';
  accountsProcessedAt?: Date;
}

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
  assignedPartnerId?: mongoose.Types.ObjectId;
  assignedExecutiveId?: mongoose.Types.ObjectId;
  hasPaidAdvance?: boolean;
  isAdvancePaid?: boolean;
  beforePhotos: string[];
  afterPhotos: string[];
  cancellationReason?: string;
  cancellationDetails?: IBookingCancellationDetails;
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
  verificationCode?: string;
  isVerifiedByPartner?: boolean;
  verifiedAt?: Date;
  satisfactionStatus?: 'NOT_SENT' | 'PENDING_CUSTOMER' | 'SATISFIED' | 'DISSATISFIED';
  satisfactionRating?: number;
  satisfactionFeedback?: string;
  satisfactionSentAt?: Date;
  satisfactionRespondedAt?: Date;
  suspendedPartnerFlag?: boolean;
  partnerSuspendedAt?: Date;
  adminWorkflowFlag?: string;
  acceptedQuoteAmount?: number;
  totalAmount?: number;
  finalAmount?: number;
  paymentStatus?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  pricing?: IBookingPricing;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingPricing {
  partnerBaseQuote?: number;
  gstRate?: number;
  gstAmount?: number;
  customerGrossQuote?: number;
  advanceRequired?: number;
  advancePaid?: number;
  balanceAmount?: number;
  approvedExtrasAmount?: number;
  pendingExtrasAmount?: number;
  gatewayFeeAmount?: number;
  rewardAmount?: number;
  dltCostAmount?: number;
  companyMarginAmount?: number;
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
    assignedPartnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      default: null,
    },
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
    cancellationDetails: {
      reasons: { type: [String], default: [] },
      customerRemarks: { type: String, trim: true },
      requestedAt: { type: Date },
      executiveStatus: {
        type: String,
        enum: ['PENDING_REVIEW', 'CALL_CONNECTED', 'CALL_NO_ANSWER', 'RETAINED', 'FORWARDED_TO_ACCOUNTS', 'REJECTED'],
        default: 'PENDING_REVIEW',
      },
      executiveId: { type: Schema.Types.ObjectId, ref: 'User' },
      executiveNotes: { type: String, trim: true },
      callAttempts: { type: Number, default: 0 },
      lastCallAt: { type: Date },
      refundAmount: { type: Number, default: 0 },
      deductionAmount: { type: Number, default: 0 },
      deductionReason: { type: String, trim: true },
      accountsStatus: {
        type: String,
        enum: ['NOT_FORWARDED', 'PENDING_ACCOUNTS', 'PROCESSED', 'REJECTED'],
        default: 'NOT_FORWARDED',
      },
      accountsProcessedAt: { type: Date },
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
    verificationCode: {
      type: String,
      trim: true,
    },
    isVerifiedByPartner: {
      type: Boolean,
      default: false,
    },
    hasPaidAdvance: {
      type: Boolean,
      default: false,
    },
    isAdvancePaid: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
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
    },
    suspendedPartnerFlag: {
      type: Boolean,
      default: false,
    },
    partnerSuspendedAt: {
      type: Date,
    },
    adminWorkflowFlag: {
      type: String,
      trim: true,
    },
    acceptedQuoteAmount: {
      type: Number,
    },
    totalAmount: {
      type: Number,
    },
    finalAmount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'],
      default: 'PENDING',
    },
    pricing: {
      _id: false,
      partnerBaseQuote: { type: Number },
      gstRate: { type: Number },
      gstAmount: { type: Number },
      customerGrossQuote: { type: Number },
      advanceRequired: { type: Number },
      advancePaid: { type: Number },
      balanceAmount: { type: Number },
      approvedExtrasAmount: { type: Number },
      pendingExtrasAmount: { type: Number },
      gatewayFeeAmount: { type: Number },
      rewardAmount: { type: Number },
      dltCostAmount: { type: Number },
      companyMarginAmount: { type: Number },
    },
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
