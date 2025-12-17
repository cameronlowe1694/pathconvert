import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkSessions() {
  try {
    console.log('Checking sessions in database...\n');

    const sessions = await prisma.session.findMany({
      orderBy: { id: 'desc' },
      take: 10
    });

    console.log(`Found ${sessions.length} sessions:\n`);

    sessions.forEach((session, i) => {
      console.log(`Session ${i + 1}:`);
      console.log(`  ID: ${session.id}`);
      console.log(`  Shop: ${session.shop}`);
      console.log(`  IsOnline: ${session.isOnline}`);
      console.log(`  State: ${session.state}`);
      console.log(`  Scope: ${session.scope}`);
      console.log(`  AccessToken: ${session.accessToken ? '***' + session.accessToken.slice(-8) : 'none'}`);
      console.log(`  Expires: ${session.expires}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();
