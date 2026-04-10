const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('test123', 10);
    const existingUser = await prisma.user.findUnique({ where: { email: 'test@gmail.com' } });
    if (!existingUser) {
        await prisma.user.create({
            data: {
                fullName: 'Test User',
                email: 'test@gmail.com',
                mobile: '0000000000',
                passwordHash: passwordHash,
                accountNo: '9' + Math.floor(10000000000 + Math.random() * 90000000000).toString(),
                balance: 1000.00,
                transactions: {
                    create: {
                        amount: 1000.00,
                        type: 'CREDIT',
                        category: 'JOINING_BONUS',
                        description: 'Welcome Bonus',
                        status: 'SUCCESS',
                        balanceAfter: 1000.00
                    }
                }
            }
        });
        console.log('Dummy user test@gmail.com created!');
    } else {
        console.log('Dummy user already exists!');
    }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
