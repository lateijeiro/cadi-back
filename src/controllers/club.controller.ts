import { Request, Response, NextFunction } from 'express';
import * as clubService from '../services/club.service';
import { t } from '../utils/i18n';

// Crear un club (solo admin)
export const createClub = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, city, province, phone, email } = req.body;
    const lang = req.language || 'es';

    if (!name || !address || !city || !province) {
      return res.status(400).json({
        message: t('validation.required', lang),
      });
    }

    const club = await clubService.createClub({
      name,
      address,
      city,
      province,
      phone,
      email,
    });

    return res.status(201).json({
      message: t('club.created', lang),
      data: club,
    });
  } catch (error) {
    return next(error);
  }
};

// Obtener un club por ID
export const getClubById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    const club = await clubService.getClubById(id, lang);

    res.json({
      data: club,
    });
  } catch (error) {
    next(error);
  }
};

// Listar todos los clubes (paginado)
export const listClubs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const lang = req.language || 'es';

    const result = await clubService.listClubs(page, limit);

    res.json({
      status: t('common.success', lang),
      data: result.clubs,
      pagination: {
        page,
        limit,
        total: result.pagination.total,
        totalPages: Math.ceil(result.pagination.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar un club (solo admin)
export const updateClub = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, address, city, province, phone, email } = req.body;
    const lang = req.language || 'es';

    const club = await clubService.updateClub(
      id,
      {
        name,
        address,
        city,
        province,
        phone,
        email,
      },
      lang
    );

    res.json({
      message: t('club.updated', lang),
      data: club,
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar un club (solo admin)
export const deleteClub = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lang = req.language || 'es';

    await clubService.deleteClub(id, lang);

    res.json({
      message: t('club.deleted', lang),
    });
  } catch (error) {
    next(error);
  }
};
