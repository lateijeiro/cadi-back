import mongoose, { Schema, Document, Types } from 'mongoose';
import { CaddieStatus, CaddieCategory } from '../types/enums';

// Disponibilidad específica por fecha (ej: días específicos)
export interface IAvailability {
  date: Date;
  timeSlots: string[];
}

// Disponibilidad recurrente (ej: todos los lunes, martes, etc)
export interface IRecurringAvailability {
  clubId: Types.ObjectId;
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  timeSlots: string[]; // ["9-12", "12-15", "15-18"]
}

export interface ICaddie extends Document {
  userId: Types.ObjectId;
  dni: string;
  photo?: string;
  experience: string;
  category: CaddieCategory;
  clubs: Types.ObjectId[];
  suggestedRate: number;
  status: CaddieStatus;
  // Disponibilidad específica (fechas concretas)
  availability: IAvailability[];
  // Disponibilidad recurrente (patrón semanal por club)
  recurringAvailability: IRecurringAvailability[];
  rating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>({
  date: {
    type: Date,
    required: true,
  },
  timeSlots: [{
    type: String,
    required: true,
  }],
}, { _id: false });

const RecurringAvailabilitySchema = new Schema<IRecurringAvailability>({
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true,
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  timeSlots: [{
    type: String,
    required: true,
  }],
}, { _id: false });

const CaddieSchema = new Schema<ICaddie>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    dni: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    photo: {
      type: String,
    },
    experience: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(CaddieCategory),
      required: true,
    },
    clubs: [{
      type: Schema.Types.ObjectId,
      ref: 'Club',
    }],
    suggestedRate: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(CaddieStatus),
      default: CaddieStatus.PENDING,
    },
    availability: [AvailabilitySchema],
    recurringAvailability: [RecurringAvailabilitySchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Caddie = mongoose.model<ICaddie>('Caddie', CaddieSchema);
