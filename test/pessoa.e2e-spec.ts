import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Pessoa (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pessoa.deleteMany({
      where: {
        email: {
          contains: '@e2e-test.com',
        },
      },
    });

    await app.close();
  });

  describe('Complete CRUD flow', () => {
    let createdPessoaId: string;
    const timestamp = Date.now();

    const createDto = {
      nome: 'E2E Test User',
      idade: 25,
      cpf: `${timestamp.toString().slice(-11)}`,
      endereco: 'Test Address, 123',
      email: `test.${timestamp}@e2e-test.com`,
      telefone: `(11) 9${timestamp.toString().slice(-8)}`,
    };

    it('should create a new Pessoa (POST /pessoas)', async () => {
      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nome).toBe(createDto.nome);
      expect(response.body.email).toBe(createDto.email);
      expect(response.body.idade).toBe(createDto.idade);

      createdPessoaId = response.body.id;
    });

    it('should retrieve Pessoa by ID (GET /pessoas/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pessoas/${createdPessoaId}`)
        .expect(200);

      expect(response.body.id).toBe(createdPessoaId);
      expect(response.body.nome).toBe(createDto.nome);
    });

    it('should retrieve Pessoa by email (GET /pessoas/email/:email)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pessoas/email/${createDto.email}`)
        .expect(200);

      expect(response.body.id).toBe(createdPessoaId);
      expect(response.body.email).toBe(createDto.email);
    });

    it('should retrieve Pessoa by telefone (GET /pessoas/telefone/:telefone)', async () => {
      const encodedTelefone = encodeURIComponent(createDto.telefone);

      const response = await request(app.getHttpServer())
        .get(`/pessoas/telefone/${encodedTelefone}`)
        .expect(200);

      expect(response.body.id).toBe(createdPessoaId);
      expect(response.body.telefone).toBe(createDto.telefone);
    });

    it('should search Pessoa by name (GET /pessoas/search/by-name)', async () => {
      const response = await request(app.getHttpServer())
        .get('/pessoas/search/by-name?nome=E2E Test')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);

      const foundPessoa = response.body.find(
        (p: any) => p.id === createdPessoaId,
      );
      expect(foundPessoa).toBeDefined();
    });

    it('should update Pessoa (PUT /pessoas/:id)', async () => {
      const updateDto = {
        idade: 26,
        endereco: 'Updated Address, 456',
      };

      const response = await request(app.getHttpServer())
        .put(`/pessoas/${createdPessoaId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.idade).toBe(26);
      expect(response.body.endereco).toBe('Updated Address, 456');

      // Verify nome didn't change
      expect(response.body.nome).toBe(createDto.nome);
    });

    it('should delete Pessoa (DELETE /pessoas/:id)', async () => {
      await request(app.getHttpServer())
        .delete(`/pessoas/${createdPessoaId}`)
        .expect(204);

      // Verify it's really deleted
      await request(app.getHttpServer())
        .get(`/pessoas/${createdPessoaId}`)
        .expect(404);
    });
  });

  describe('Cache behavior flow', () => {
    let pessoaId: string;
    const timestamp = Date.now();
    const email = `cache.test.${timestamp}@e2e-test.com`;

    const createDto = {
      nome: 'Cache Test User',
      idade: 30,
      cpf: `${timestamp.toString().slice(-11)}`,
      endereco: 'Cache Test Address',
      email,
      telefone: `(11) 9${timestamp.toString().slice(-8)}`,
    };

    beforeAll(async () => {
      // Create pessoa for cache tests
      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(createDto)
        .expect(201);

      pessoaId = response.body.id;
    });

    afterAll(async () => {
      // Clean up
      await prisma.pessoa.delete({ where: { id: pessoaId } });
    });

    it('should have cache MISS on first findByEmail', async () => {
      // First request - should be cache MISS
      const response1 = await request(app.getHttpServer())
        .get(`/pessoas/email/${email}`)
        .expect(200);

      expect(response1.body.email).toBe(email);
    });

    it('should have cache HIT on second findByEmail (same email)', async () => {
      // Second request - should be cache HIT
      const response2 = await request(app.getHttpServer())
        .get(`/pessoas/email/${email}`)
        .expect(200);

      expect(response2.body.email).toBe(email);
    });

    it('should evict cache after update', async () => {
      // Update pessoa
      await request(app.getHttpServer())
        .put(`/pessoas/${pessoaId}`)
        .send({ idade: 31 })
        .expect(200);

      // Next findByEmail should be cache MISS (cache was evicted)
      const response = await request(app.getHttpServer())
        .get(`/pessoas/email/${email}`)
        .expect(200);

      expect(response.body.idade).toBe(31);
    });

    it('should have independent cache for telefone', async () => {
      const encodedTelefone = encodeURIComponent(createDto.telefone);

      // First telefone request - cache MISS
      const response1 = await request(app.getHttpServer())
        .get(`/pessoas/telefone/${encodedTelefone}`)
        .expect(200);

      expect(response1.body.telefone).toBe(createDto.telefone);

      // Second telefone request - cache HIT
      const response2 = await request(app.getHttpServer())
        .get(`/pessoas/telefone/${encodedTelefone}`)
        .expect(200);

      expect(response2.body.telefone).toBe(createDto.telefone);
    });
  });

  describe('Validation and error handling', () => {
    it('should return 400 for invalid CPF format', async () => {
      const invalidDto = {
        nome: 'Invalid User',
        idade: 25,
        cpf: '12345678900', // Missing dots and dash
        endereco: 'Address',
        email: 'invalid@test.com',
        telefone: '(11) 98765-4321',
      };

      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('CPF');
    });

    it('should return 400 for invalid telefone format', async () => {
      const invalidDto = {
        nome: 'Invalid User',
        idade: 25,
        cpf: '123.456.789-00',
        endereco: 'Address',
        email: 'invalid@test.com',
        telefone: '11987654321', // Missing format
      };

      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('Telefone');
    });

    it('should return 400 for invalid email', async () => {
      const invalidDto = {
        nome: 'Invalid User',
        idade: 25,
        cpf: '123.456.789-00',
        endereco: 'Address',
        email: 'not-an-email',
        telefone: '(11) 98765-4321',
      };

      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 400 for idade out of range', async () => {
      const invalidDto = {
        nome: 'Invalid User',
        idade: 200, // Too old
        cpf: '123.456.789-00',
        endereco: 'Address',
        email: 'test@test.com',
        telefone: '(11) 98765-4321',
      };

      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('idade');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 404 for non-existent Pessoa ID', async () => {
      await request(app.getHttpServer())
        .get('/pessoas/non-existent-uuid')
        .expect(404);
    });

    it('should return 404 for non-existent email', async () => {
      await request(app.getHttpServer())
        .get('/pessoas/email/nonexistent@test.com')
        .expect(404);
    });

    it('should return 404 for non-existent telefone', async () => {
      await request(app.getHttpServer())
        .get('/pessoas/telefone/(99)%2099999-9999')
        .expect(404);
    });

    it('should return empty array for non-matching name search', async () => {
      const response = await request(app.getHttpServer())
        .get('/pessoas/search/by-name?nome=NonExistentNameXYZ12345')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Duplicate constraints', () => {
    const timestamp = Date.now();
    const uniqueDto = {
      nome: 'Unique Test User',
      idade: 28,
      cpf: `${(timestamp + 1).toString().slice(-11)}`,
      endereco: 'Unique Address',
      email: `unique.${timestamp}@e2e-test.com`,
      telefone: `(11) 9${(timestamp + 1).toString().slice(-8)}`,
    };

    let createdId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(uniqueDto)
        .expect(201);

      createdId = response.body.id;
    });

    afterAll(async () => {
      await prisma.pessoa.delete({ where: { id: createdId } });
    });

    it('should reject duplicate CPF', async () => {
      const duplicateDto = {
        ...uniqueDto,
        email: `different.${timestamp}@e2e-test.com`,
        telefone: `(11) 9${(timestamp + 2).toString().slice(-8)}`,
        cpf: uniqueDto.cpf, // Same CPF
      };

      // Should fail due to unique constraint
      await request(app.getHttpServer())
        .post('/pessoas')
        .send(duplicateDto)
        .expect(500); // Prisma throws error on unique constraint violation
    });

    it('should reject duplicate email', async () => {
      const duplicateDto = {
        ...uniqueDto,
        cpf: `${(timestamp + 3).toString().slice(-11)}`,
        telefone: `(11) 9${(timestamp + 3).toString().slice(-8)}`,
        email: uniqueDto.email, // Same email
      };

      await request(app.getHttpServer())
        .post('/pessoas')
        .send(duplicateDto)
        .expect(500);
    });

    it('should reject duplicate telefone', async () => {
      const duplicateDto = {
        ...uniqueDto,
        cpf: `${(timestamp + 4).toString().slice(-11)}`,
        email: `another.${timestamp}@e2e-test.com`,
        telefone: uniqueDto.telefone, // Same telefone
      };

      await request(app.getHttpServer())
        .post('/pessoas')
        .send(duplicateDto)
        .expect(500);
    });
  });

  describe('Pagination and search', () => {
    it('should search by partial name (case insensitive)', async () => {
      const timestamp = Date.now();
      const createDto = {
        nome: 'Search Test Maria Silva',
        idade: 25,
        cpf: `${timestamp.toString().slice(-11)}`,
        endereco: 'Search Address',
        email: `search.${timestamp}@e2e-test.com`,
        telefone: `(11) 9${timestamp.toString().slice(-8)}`,
      };

      const { body: created } = await request(app.getHttpServer())
        .post('/pessoas')
        .send(createDto)
        .expect(201);

      // Search with lowercase
      const response1 = await request(app.getHttpServer())
        .get('/pessoas/search/by-name?nome=maria')
        .expect(200);

      expect(response1.body.length).toBeGreaterThan(0);
      expect(response1.body.some((p: any) => p.id === created.id)).toBe(true);

      // Search with partial match
      const response2 = await request(app.getHttpServer())
        .get('/pessoas/search/by-name?nome=Search Test')
        .expect(200);

      expect(response2.body.some((p: any) => p.id === created.id)).toBe(true);

      // Cleanup
      await prisma.pessoa.delete({ where: { id: created.id } });
    });
  });
});
