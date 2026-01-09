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
  // Calificación y comentario del golfer al caddie
  caddieRating?: number;
  caddieReview?: string;
  // Calificación y comentario del caddie al golfer
  golferRating?: number;
  golferReview?: string;
  paymentId?: Types.ObjectId;
  // Campos de cancelación
  cancelledAt?: Date;
  cancelledBy?: 'golfer' | 'caddie' | 'admin';
  cancellationReason?: string;
  refundAmount?: number;
  refundPercentage?: number;
  refundStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  refundId?: string; // ID del refund de MercadoPago
  createdAt: Date;
  updatedAt: Date;
  timeSlot?: string;
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
    // Calificación y comentario del golfer al caddie
    caddieRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    caddieReview: {
      type: String,
      trim: true,
    },
    // Calificación y comentario del caddie al golfer
    golferRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    golferReview: {
      type: String,
      trim: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ['golfer', 'caddie', 'admin'],
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
    },
    refundId: {
      type: String,
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
