import prisma from '../../config/prisma-client.config';
import { UserRole, AuthProvider, CreateUserData, IUser } from './interfaces/user.interface';
import { PasswordHashUtility } from '../../shared/utils/password-hash.utils';
import { ENV } from '../../config/environment.config';

export class UsersService {

  // ============================================
  // CREAR USUARIO
  // ============================================
  async createUser(data: CreateUserData): Promise<IUser> {
    // Verificar si el email ya existe
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Verificar si el username ya existe
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hashear password
    const hashedPassword = await PasswordHashUtility.hashPassword(data.password);

    // Crear usuario y sus stats en una transacción
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || UserRole.USER,
          authProvider: data.authProvider || AuthProvider.LOCAL,
          coins: ENV.INITIAL_COINS,
        },
      });

      // Crear estadísticas iniciales
      await tx.userStats.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    console.log(`✅ User created in DB: ${user.username} (${user.email})`);

    return user as IUser;
  }

  // ============================================
  // BUSCAR POR EMAIL
  // ============================================
  async findByEmail(email: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        stats: true,
      },
    });

    return user as IUser | null;
  }

  // ============================================
  // BUSCAR POR ID
  // ============================================
  async findById(userId: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
      },
    });

    return user as IUser | null;
  }

  // ============================================
  // BUSCAR POR USERNAME
  // ============================================
  async findByUsername(username: string): Promise<IUser | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        stats: true,
      },
    });

    return user as IUser | null;
  }

  // ============================================
  // ACTUALIZAR ÚLTIMO LOGIN
  // ============================================
  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ============================================
  // ACTUALIZAR MONEDAS
  // ============================================
  async updateCoins(userId: string, amount: number): Promise<number> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        coins: {
          increment: amount, // Puede ser negativo para restar
        },
      },
    });

    return user.coins;
  }

  // ============================================
  // OBTENER ESTADÍSTICAS
  // ============================================
  async getUserStats(userId: string) {
    const stats = await prisma.userStats.findUnique({
      where: { userId },
    });

    return stats;
  }

  // ============================================
  // ACTUALIZAR ESTADÍSTICAS
  // ============================================
  async updateStats(userId: string, data: {
    totalGames?: number;
    victories?: number;
    defeats?: number;
    totalCorrectAnswers?: number;
    totalQuestions?: number;
    totalCoinsWon?: number;
    totalCoinsLost?: number;
  }): Promise<void> {
    const stats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      throw new Error('User stats not found');
    }

    const newTotalCorrect = stats.totalCorrectAnswers + (data.totalCorrectAnswers || 0);
    const newTotalQuestions = stats.totalQuestions + (data.totalQuestions || 0);
    const accuracyPercentage = newTotalQuestions > 0
      ? (newTotalCorrect / newTotalQuestions) * 100
      : 0;

    await prisma.userStats.update({
      where: { userId },
      data: {
        totalGames: { increment: data.totalGames || 0 },
        victories: { increment: data.victories || 0 },
        defeats: { increment: data.defeats || 0 },
        totalCorrectAnswers: { increment: data.totalCorrectAnswers || 0 },
        totalQuestions: { increment: data.totalQuestions || 0 },
        totalCoinsWon: { increment: data.totalCoinsWon || 0 },
        totalCoinsLost: { increment: data.totalCoinsLost || 0 },
        accuracyPercentage,
      },
    });
  }

  // ============================================
  // LISTAR USUARIOS (para admin)
  // ============================================
  async listUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          coins: true,
          role: true,
          isActive: true,
          createdAt: true,
          stats: true,
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // CREAR USUARIO ADMIN
  // ============================================
  async createAdminUser(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<IUser> {
    return this.createUser({
      ...data,
      role: UserRole.ADMIN,
    });
  }
}