import { RegisterDTO } from './schemas/register.schema';
import { LoginDTO } from './schemas/login.schema';
import { AuthResponse } from './interfaces/authentication.interface';
import { PasswordHashUtility } from '../../shared/utils/password-hash.utils';
import { JWTUtility } from '../../shared/utils/jwt-token.utils';
import { UsersService } from '../users/users.service';

export class AuthenticationService {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  // ============================================
  // REGISTRO
  // ============================================
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Crear usuario en la base de datos
    const newUser = await this.usersService.createUser({
      username: data.username,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    // Generar token
    const token = JWTUtility.generateToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    });

    console.log(` User registered: ${newUser.username} (${newUser.email})`);

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
    const user = await this.usersService.findByEmail(data.email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verificar password
    if (!user.password) {
      throw new Error('Invalid credentials');
    }

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
    await this.usersService.updateLastLogin(user.id);

    // Generar token
    const token = JWTUtility.generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    console.log(` User logged in: ${user.username}`);

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
  // OBTENER PERFIL
  // ============================================
  async getProfile(userId: string): Promise<any> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const stats = await this.usersService.getUserStats(userId);

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
      stats: stats || null,
    };
  }

  // ============================================
  // OBTENER USUARIO POR ID
  // ============================================
  async getUserById(userId: string): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}