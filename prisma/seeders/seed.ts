import prisma from '../../src/config/prisma-client.config';
import { PasswordHashUtility } from '../../src/shared/utils/password-hash.utils';
import { UserRole, AuthProvider } from '../../src/modules/users/interfaces/user.interface';

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Limpiar datos existentes (opcional, cuidado en producción)
  console.log('🧹 Cleaning existing data...');
  await prisma.userStats.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Data cleaned\n');

  // ============================================
  // CREAR ADMIN
  // ============================================
  console.log('👑 Creating admin user...');
  const adminPassword = await PasswordHashUtility.hashPassword('admin123');
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@gamehub.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      coins: 10000,
      role: UserRole.ADMIN,
      authProvider: AuthProvider.LOCAL,
      isActive: true,
      isVerified: true,
      stats: {
        create: {},
      },
    },
  });
  console.log(`✅ Admin created: ${admin.username} (${admin.email})\n`);

  // ============================================
  // CREAR 10 JUGADORES DE PRUEBA
  // ============================================
  console.log('👥 Creating 10 test players...');
  const testPassword = await PasswordHashUtility.hashPassword('password123');

  for (let i = 1; i <= 10; i++) {
    const player = await prisma.user.create({
      data: {
        username: `player${i}`,
        email: `player${i}@test.com`,
        password: testPassword,
        firstName: `Player`,
        lastName: `${i}`,
        coins: 100,
        role: UserRole.USER,
        authProvider: AuthProvider.LOCAL,
        isActive: true,
        isVerified: true,
        stats: {
          create: {},
        },
      },
    });
    console.log(`✅ Created: ${player.username} (${player.email})`);
  }

  console.log('\n🌱 Seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin: admin@gamehub.com / admin123');
  console.log('   Players: player1@test.com / password123');
  console.log('            player2@test.com / password123');
  console.log('            ... (player3 to player10)\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });