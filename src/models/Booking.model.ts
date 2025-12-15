import mongoose, { Schema, Document, Types } from 'mongoose';
import { BookingStatus } from '../types/enums';

export interface IBooking extends Document {
  golferId: Types.ObjectId;
  caddieId: Types.ObjectId;
  clubId: Types.ObjectId;
  date: Date;
  startTime: string; // Formato "HH:mm" ej: "10:00"
  endTime: string;   // Formato "HH:mm" ej: "12:30"
  totalPrice: number; // Precio total del servicio (suggestedRate * horas)
  status: BookingStatus;
  qrCode?: string;
  rating?: number;
  review?: string;
  paymentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
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
    clubId: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: 'startTime debe estar en formato HH:mm (ej: 10:00)'
      }
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: 'endTime debe estar en formato HH:mm (ej: 12:30)'
      }
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },
    qrCode: {
      type: String,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto para búsquedas eficientes
BookingSchema.index({ clubId: 1, date: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ caddieId: 1, date: 1, startTime: 1 });
BookingSchema.index({ golferId: 1, createdAt: -1 });
BookingSchema.index({ caddieId: 1, createdAt: -1 });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
