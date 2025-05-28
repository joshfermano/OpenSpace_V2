import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformFeeRemittance extends Document {
  host: mongoose.Types.ObjectId;
  earning: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  platformFeeAmount: number;
  status: 'outstanding' | 'paid' | 'overdue';
  dueDate: Date;
  paymentMethod?: 'card' | 'gcash' | 'maya';
  paymentDetails?: {
    transactionId?: string;
    paymentDate?: Date;
    mobileNumber?: string;
    cardLastFour?: string;
    cardholderName?: string;
  };
  remittanceId?: string;
  overdueDate?: Date;
  penalties?: number;
  createdAt: Date;
  updatedAt: Date;
}

const platformFeeRemittanceSchema = new Schema<IPlatformFeeRemittance>(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    earning: {
      type: Schema.Types.ObjectId,
      ref: 'Earning',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    platformFeeAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['outstanding', 'paid', 'overdue'],
      default: 'outstanding',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'gcash', 'maya'],
    },
    paymentDetails: {
      transactionId: String,
      paymentDate: Date,
      mobileNumber: String,
      cardLastFour: String,
      cardholderName: String,
    },
    remittanceId: String,
    overdueDate: Date,
    penalties: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

platformFeeRemittanceSchema.index({ host: 1, status: 1 });
platformFeeRemittanceSchema.index({ dueDate: 1, status: 1 });
platformFeeRemittanceSchema.index({ status: 1, overdueDate: 1 });

export default mongoose.model<IPlatformFeeRemittance>(
  'PlatformFeeRemittance',
  platformFeeRemittanceSchema
);
