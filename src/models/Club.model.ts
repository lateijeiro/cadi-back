import mongoose, { Schema, Document } from 'mongoose';

export interface IClub extends Document {
  name: string;
  address: string;
  city: string;
  province: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClubSchema = new Schema<IClub>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Club = mongoose.model<IClub>('Club', ClubSchema);
