import { RegisterDTO } from './schemas/register.schema';
import { LoginDTO } from './schemas/login.schema';
import { AuthResponse } from './interfaces/authentication.interface';
import { PasswordHashUtility } from '../../shared/utils/password-hash.utils';
import { JWTUtility } from '../../shared/utils/jwt-token.utils';
import { UserRole } from '../users/interfaces/user.interface';

// ⭐ USUARIOS SIMULADOS EN MEMORIA (EN FASE 4 usaremos Prisma)
const usersInMemory = new Map<string, any>();

export class AuthenticationService {

  // ============================================
  // REGISTRO
  // ============================================
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Verificar si el email ya existe
    const existingUserByEmail = Array.from(usersInMemory.values()).find(
      u => u.email === data.email
    );
    if (existingUserByEmail) {
      throw new Error('Email already registered');
    }

    // Verificar si el username ya existe
    const existingUserByUsername = Array.from(usersInMemory.values()).find(
      u => u.username === data.username
    );
    if (existingUserByUsername) {
      throw new Error('Username already taken');
    }

    // Hashear password
    const hashedPassword = await PasswordHashUtility.hashPassword(data.password);

    // Crear usuario
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = {
      id: userId,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      coins: 100, // Monedas iniciales
      role: UserRole.USER,
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersInMemory.set(userId, newUser);

    // Generar token
    const token = JWTUtility.generateToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    });

    console.log(`✅ User registered: ${newUser.username} (${newUser.email})`);

    return {
      token,
      user: {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        coins: newUser.coins,
      },
    };
  }

  // ============================================
  // LOGIN
  // ============================================
  async login(data: LoginDTO): Promise<AuthResponse> {
    // Buscar usuario por email
    const user = Array.from(usersInMemory.values()).find(
      u => u.email === data.email
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verificar password
    const isPasswordValid = await PasswordHashUtility.comparePassword(
      data.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Verificar si está activo
    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Actualizar último login
    user.lastLoginAt = new Date();

    // Generar token
    const token = JWTUtility.generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    console.log(`✅ User logged in: ${user.username}`);

    return {
      token,
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        coins: user.coins,
      },
    };
  }

  // ============================================
  // OBTENER PERFIL (verificar token)
  // ============================================
  async getProfile(userId: string): Promise<any> {
    const user = usersInMemory.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      coins: user.coins,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  // ============================================
  // OBTENER USUARIO POR ID (para otros servicios)
  // ============================================
  async getUserById(userId: string): Promise<any> {
    const user = usersInMemory.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // ============================================
  // CREAR USUARIO ADMIN (helper para seeds)
  // ============================================
  async createAdminUser(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<void> {
    const hashedPassword = await PasswordHashUtility.hashPassword(data.password);
    
    const userId = `admin_${Date.now()}`;
    const adminUser = {
      id: userId,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      coins: 10000,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersInMemory.set(userId, adminUser);
    console.log(`✅ Admin user created: ${adminUser.username}`);
  }
}