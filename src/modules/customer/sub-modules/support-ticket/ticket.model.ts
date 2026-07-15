import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportMessage {
  senderId: mongoose.Types.ObjectId;
  senderRole: string;
  message: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  customerId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        message: '{VALUE} is not a valid status',
      },
      default: 'OPEN',
      required: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'MEDIUM',
      required: true,
    },
    messages: {
      type: [SupportMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const SupportTicketModel = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
export default SupportTicketModel;
