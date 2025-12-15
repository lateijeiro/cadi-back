import { Club, IClub } from '../models/Club.model';
import { NotFoundError } from '../utils/errors';

interface CreateClubData {
  name: string;
  address: string;
  city: string;
  province: string;
  phone?: string;
  email?: string;
}

interface UpdateClubData {
  name?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
}

export const createClub = async (data: CreateClubData): Promise<IClub> => {
  const club = await Club.create(data);
  return club;
};

export const getClubById = async (clubId: string, lang: string): Promise<IClub> => {
  const club = await Club.findById(clubId);
  
  if (!club) {
    throw new NotFoundError('club.notFound', lang);
  }

  return club;
};

export const listClubs = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [clubs, total] = await Promise.all([
    Club.find()
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Club.countDocuments(),
  ]);

  return {
    clubs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateClub = async (
  clubId: string,
  data: UpdateClubData,
  lang: string
): Promise<IClub> => {
  const club = await Club.findByIdAndUpdate(
    clubId,
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!club) {
    throw new NotFoundError('club.notFound', lang);
  }

  return club;
};

export const deleteClub = async (clubId: string, lang: string): Promise<void> => {
  const club = await Club.findByIdAndDelete(clubId);

  if (!club) {
    throw new NotFoundError('club.notFound', lang);
  }
};
