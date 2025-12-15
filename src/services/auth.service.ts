import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User.model';
import { Golfer } from '../models/Golfer.model';
import { Caddie } from '../models/Caddie.model';
import { config } from '../config/environment';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { UserRole, CaddieStatus, CaddieCategory } from '../types/enums';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  preferredLanguage?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    preferredLanguage: string;
  };
  token: string;
}

export class AuthService {
  
  async register(data: RegisterData): Promise<AuthResponse> {
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new BadRequestError('Email already registered', 'errors.emailExists');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Crear usuario
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      preferredLanguage: data.preferredLanguage || 'es',
    });

    // Crear perfil según el rol
    if (data.role === UserRole.GOLFER) {
      await Golfer.create({ userId: user._id });
    } else if (data.role === UserRole.CADDIE) {
      // Crear perfil básico de caddie (se completa después)
      await Caddie.create({ 
        userId: user._id,
        dni: '',
        experience: '',
        category: CaddieCategory.THIRD,
        clubs: [],
        suggestedRate: 0,
        status: CaddieStatus.PENDING,
      });
    }

    // Generar token
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
      token,
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Buscar usuario (incluir password)
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
    
    if (!user) {
      throw new UnauthorizedError('Invalid credentials', 'errors.invalidCredentials');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials', 'errors.invalidCredentials');
    }

    // Generar token
    const token = this.generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
      token,
    };
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  private generateToken(user: IUser): string {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new UnauthorizedError('Invalid token', 'errors.tokenInvalid');
    }
  }
}

export const authService = new AuthService();
