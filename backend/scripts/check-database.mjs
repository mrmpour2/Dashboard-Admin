import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  await prisma.$queryRawUnsafe('SELECT 1');
  console.log('DATABASE_CONNECTION_OK');
} catch (error) {
  console.log('DATABASE_CONNECTION_FAILED', error.code || error.name);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
