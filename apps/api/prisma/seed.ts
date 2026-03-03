import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash the password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fiewura.com' },
    update: {},
    create: {
      email: 'admin@fiewura.com',
      password: hashedPassword,
      role: 'LANDLORD',
      name: 'Default Admin',
      phone: '1234567890'
    },
  });

  console.log('Default admin user created:', adminUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });