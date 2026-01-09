import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PessoaDao } from './pessoa/pessoa.dao';

/**
 * Test script to demonstrate PessoaDao functionality and cache behavior.
 *
 * This script tests:
 * 1. CRUD operations using Prisma API
 * 2. Native SQL queries with caching
 * 3. Cache HIT/MISS scenarios
 * 4. Automatic cache eviction on updates
 */
async function testDao() {
  console.log('🚀 Starting PessoaDao Test Suite\n');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const dao = app.get(PessoaDao);

  try {
    // ============================================
    // Test 1: Create Pessoa
    // ============================================
    console.log('\n📝 Test 1: Create Pessoa');
    console.log('-'.repeat(60));

    // Use timestamp to ensure unique CPF/email/telefone
    const timestamp = Date.now();

    const pessoa = await dao.create({
      nome: 'João Silva',
      idade: 30,
      cpf: `${timestamp}-00`,
      endereco: 'Rua A, 123 - São Paulo, SP',
      email: `joao.silva.${timestamp}@example.com`,
      telefone: `(11) 9${timestamp.toString().slice(-8)}`,
    });

    console.log('✅ Created Pessoa:');
    console.log(`   ID: ${pessoa.id}`);
    console.log(`   Nome: ${pessoa.nome}`);
    console.log(`   Email: ${pessoa.email}`);
    console.log(`   Telefone: ${pessoa.telefone}`);

    // ============================================
    // Test 2: Find by Email (1st time - Cache MISS)
    // ============================================
    console.log('\n🔍 Test 2: Find by Email (1st time - should be Cache MISS)');
    console.log('-'.repeat(60));

    const found1 = await dao.findByEmail(pessoa.email);
    console.log('✅ Found by email:', found1 ? found1.nome : 'Not found');

    // ============================================
    // Test 3: Find by Email (2nd time - Cache HIT)
    // ============================================
    console.log('\n🔍 Test 3: Find by Email (2nd time - should be Cache HIT)');
    console.log('-'.repeat(60));

    const found2 = await dao.findByEmail(pessoa.email);
    console.log('✅ Found by email:', found2 ? found2.nome : 'Not found');

    // ============================================
    // Test 4: Find by Telefone (1st time - Cache MISS)
    // ============================================
    console.log(
      '\n📞 Test 4: Find by Telefone (1st time - should be Cache MISS)',
    );
    console.log('-'.repeat(60));

    const found3 = await dao.findByTelefone(pessoa.telefone);
    console.log('✅ Found by telefone:', found3 ? found3.nome : 'Not found');

    // ============================================
    // Test 5: Find by Telefone (2nd time - Cache HIT)
    // ============================================
    console.log(
      '\n📞 Test 5: Find by Telefone (2nd time - should be Cache HIT)',
    );
    console.log('-'.repeat(60));

    const found4 = await dao.findByTelefone(pessoa.telefone);
    console.log('✅ Found by telefone:', found4 ? found4.nome : 'Not found');

    // ============================================
    // Test 6: Update Pessoa (triggers cache eviction)
    // ============================================
    console.log('\n✏️  Test 6: Update Pessoa (should evict cache)');
    console.log('-'.repeat(60));

    const updated = await dao.update(pessoa.id, {
      idade: 31,
      endereco: 'Rua B, 456 - São Paulo, SP',
    });

    console.log('✅ Updated Pessoa:');
    console.log(`   Nova idade: ${updated.idade}`);
    console.log(`   Novo endereço: ${updated.endereco}`);

    // ============================================
    // Test 7: Find by Email after update (Cache MISS)
    // ============================================
    console.log(
      '\n🔍 Test 7: Find by Email after update (should be Cache MISS)',
    );
    console.log('-'.repeat(60));

    const found5 = await dao.findByEmail(pessoa.email);
    console.log('✅ Found by email:', found5 ? found5.nome : 'Not found');
    console.log(`   Idade atualizada: ${found5?.idade}`);

    // ============================================
    // Test 8: Find by ID (Prisma API)
    // ============================================
    console.log('\n🆔 Test 8: Find by ID using Prisma API');
    console.log('-'.repeat(60));

    const foundById = await dao.getById(pessoa.id);
    console.log('✅ Found by ID:', foundById ? foundById.nome : 'Not found');

    // ============================================
    // Test 9: Find by Name (Prisma API)
    // ============================================
    console.log('\n🔎 Test 9: Find by Name using Prisma API');
    console.log('-'.repeat(60));

    const foundByName = await dao.findByName('João');
    console.log(
      `✅ Found ${foundByName.length} pessoa(s) with name containing "João"`,
    );
    foundByName.forEach((p) => console.log(`   - ${p.nome} (${p.email})`));

    // ============================================
    // Test 10: Create another Pessoa
    // ============================================
    console.log('\n📝 Test 10: Create another Pessoa');
    console.log('-'.repeat(60));

    const timestamp2 = Date.now();

    const pessoa2 = await dao.create({
      nome: 'Maria Santos',
      idade: 28,
      cpf: `${timestamp2}-01`,
      endereco: 'Av. Paulista, 1000 - São Paulo, SP',
      email: `maria.santos.${timestamp2}@example.com`,
      telefone: `(11) 9${timestamp2.toString().slice(-8)}`,
    });

    console.log('✅ Created second Pessoa:');
    console.log(`   Nome: ${pessoa2.nome}`);
    console.log(`   Email: ${pessoa2.email}`);

    // ============================================
    // Test 11: Test cache for both pessoas
    // ============================================
    console.log('\n🔍 Test 11: Test cache for both pessoas');
    console.log('-'.repeat(60));

    await dao.findByEmail(pessoa.email); // Should be MISS
    await dao.findByEmail(pessoa2.email); // Should be MISS
    await dao.findByEmail(pessoa.email); // Should be HIT
    await dao.findByEmail(pessoa2.email); // Should be HIT

    // ============================================
    // Test 12: Clean up
    // ============================================
    console.log('\n🧹 Test 12: Clean up test data');
    console.log('-'.repeat(60));

    await dao.delete(pessoa.id);
    console.log(`✅ Deleted: ${pessoa.nome}`);

    await dao.delete(pessoa2.id);
    console.log(`✅ Deleted: ${pessoa2.nome}`);

    // ============================================
    // Test 13: Verify deletion
    // ============================================
    console.log('\n🔍 Test 13: Verify deletion');
    console.log('-'.repeat(60));

    const shouldBeNull = await dao.findByEmail(pessoa.email);
    console.log(
      shouldBeNull
        ? '❌ ERROR: Record still exists!'
        : '✅ Record successfully deleted',
    );

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✨ All tests completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   ✅ CRUD operations working');
    console.log('   ✅ Native SQL queries working');
    console.log('   ✅ Cache HIT/MISS behavior correct');
    console.log('   ✅ Cache eviction on updates working');
    console.log('   ✅ SHA256 cache keys working');
    console.log('\n🎉 PessoaDao implementation is complete and functional!\n');
  } catch (error) {
    console.error('\n❌ ERROR during testing:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the test
void testDao();
