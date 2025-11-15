import { AuthenticationService } from '../../src/modules/authentication/authentication.service';

async function main() {
  console.log('🌱 Starting seed...');
  
  const authService = new AuthenticationService();

  // Crear admin
  await authService.createAdminUser({
    username: 'admin',
    email: 'admin@gamehub.com',
    password: 'admin123',
  });

  // Crear 10 usuarios de prueba
  for (let i = 1; i <= 10; i++) {
    try {
      await authService.register({
        username: `player${i}`,
        email: `player${i}@test.com`,
        password: 'password123',
        firstName: `Player`,
        lastName: `${i}`,
      });
      console.log(`✅ Created user: player${i}`);
    } catch (error) {
      console.error(`❌ Error creating player${i}:`, error);
    }
  }

  console.log('🌱 Seed completed!');
}

main()
  .catch((error) => {
    console.error('❌ Seed error:', error);
    process.exit(1);
  });