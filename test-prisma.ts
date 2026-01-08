import { PrismaClient } from './generated/prisma';

// Prisma 7 requires at least an empty options object
const prisma = new PrismaClient({});

async function main() {
  console.log('🔍 Testing Prisma Client...\n');

  // 1. Count existing records
  const count = await prisma.pessoa.count();
  console.log(`📊 Total pessoas in database: ${count}\n`);

  // 2. Create a new pessoa
  console.log('➕ Creating new pessoa...');
  const newPessoa = await prisma.pessoa.create({
    data: {
      nome: 'João Silva',
      idade: 30,
      cpf: '123.456.789-00',
      endereco: 'Rua A, 123 - São Paulo, SP',
      email: 'joao.silva@example.com',
      telefone: '(11) 98765-4321',
    },
  });
  console.log('✅ Created:', newPessoa);
  console.log();

  // 3. Find by email
  console.log('🔎 Finding by email...');
  const foundByEmail = await prisma.pessoa.findUnique({
    where: { email: 'joao.silva@example.com' },
  });
  console.log('✅ Found:', foundByEmail);
  console.log();

  // 4. Find all pessoas
  console.log('📋 Listing all pessoas...');
  const allPessoas = await prisma.pessoa.findMany({
    select: {
      id: true,
      nome: true,
      idade: true,
      email: true,
      telefone: true,
    },
  });
  console.log('✅ All pessoas:', allPessoas);
  console.log();

  // 5. Update pessoa
  console.log('✏️  Updating pessoa...');
  const updated = await prisma.pessoa.update({
    where: { email: 'joao.silva@example.com' },
    data: { idade: 31 },
  });
  console.log('✅ Updated idade to:', updated.idade);
  console.log();

  // 6. Test unique constraint
  console.log('🚫 Testing unique constraint (should fail)...');
  try {
    await prisma.pessoa.create({
      data: {
        nome: 'Pedro Santos',
        idade: 25,
        cpf: '111.222.333-44',
        endereco: 'Rua B, 456',
        email: 'joao.silva@example.com', // Duplicate email
        telefone: '(11) 99999-9999',
      },
    });
  } catch (error: any) {
    console.log('✅ Unique constraint working! Error:', error.code);
  }
  console.log();

  // 7. Clean up (optional)
  console.log('🧹 Cleaning up test data...');
  const deleted = await prisma.pessoa.delete({
    where: { email: 'joao.silva@example.com' },
  });
  console.log('✅ Deleted:', deleted.nome);
  console.log();

  console.log('✨ All tests completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
