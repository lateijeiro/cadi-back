import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGolfer extends Document {
  userId: Types.ObjectId;
  homeClub?: string; // Legacy field - deprecated
  homeClubId?: Types.ObjectId;
  handicap?: number;
  rating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

const GolferSchema = new Schema<IGolfer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    homeClub: {
      type: String,
      trim: true,
    },
    homeClubId: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
    },
    handicap: {
      type: Number,
      min: 0,
      max: 54,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Golfer = mongoose.model<IGolfer>('Golfer', GolferSchema);
