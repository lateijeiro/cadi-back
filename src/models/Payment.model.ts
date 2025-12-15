import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentStatus } from '../types/enums';

export interface IPayment extends Document {
  bookingId: Types.ObjectId;
  golferId: Types.ObjectId;
  caddieId: Types.ObjectId;
  amount: number;
  commission: number;
  caddieAmount: number;
  status: PaymentStatus;
  mercadopagoId?: string;
  mercadopagoStatus?: string;
  paidAt?: Date;
  liquidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    golferId: {
      type: Schema.Types.ObjectId,
      ref: 'Golfer',
      required: true,
    },
    caddieId: {
      type: Schema.Types.ObjectId,
      ref: 'Caddie',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    commission: {
      type: Number,
      required: true,
      min: 0,
    },
    caddieAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    mercadopagoId: {
      type: String,
    },
    mercadopagoStatus: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    liquidatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
