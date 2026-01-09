import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PessoaController } from './pessoa.controller';
import { PessoaDao } from './pessoa.dao';
import type { Pessoa } from '@prisma/client';

describe('PessoaController (Integration)', () => {
  let app: INestApplication;
  let pessoaDao: PessoaDao;

  const mockPessoa: Pessoa = {
    id: 'test-uuid-123',
    nome: 'João Silva',
    idade: 30,
    cpf: '123.456.789-00',
    endereco: 'Rua A, 123 - São Paulo, SP',
    email: 'joao.silva@example.com',
    telefone: '(11) 98765-4321',
    createdAt: new Date('2024-01-08T12:00:00.000Z'),
    updatedAt: new Date('2024-01-08T12:00:00.000Z'),
  };

  const createPessoaDto = {
    nome: 'João Silva',
    idade: 30,
    cpf: '123.456.789-00',
    endereco: 'Rua A, 123 - São Paulo, SP',
    email: 'joao.silva@example.com',
    telefone: '(11) 98765-4321',
  };

  beforeEach(async () => {
    // Mock do PessoaDao
    const mockPessoaDao = {
      create: jest.fn(),
      getById: jest.fn(),
      findByEmail: jest.fn(),
      findByTelefone: jest.fn(),
      findByName: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PessoaController],
      providers: [
        {
          provide: PessoaDao,
          useValue: mockPessoaDao,
        },
      ],
    }).compile();

    app = module.createNestApplication();

    // Add validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    pessoaDao = module.get<PessoaDao>(PessoaDao);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /pessoas', () => {
    it('should create a new Pessoa', async () => {
      jest.spyOn(pessoaDao, 'create').mockResolvedValue(mockPessoa);

      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send(createPessoaDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: mockPessoa.id,
        nome: mockPessoa.nome,
        email: mockPessoa.email,
      });
      expect(pessoaDao.create).toHaveBeenCalledWith(
        expect.objectContaining(createPessoaDto),
      );
    });

    it('should return 400 for invalid data', async () => {
      const invalidDto = {
        nome: 'J', // Too short
        idade: 200, // Too old
        cpf: 'invalid-cpf',
        endereco: 'Rua',
        email: 'not-an-email',
        telefone: 'invalid',
      };

      await request(app.getHttpServer())
        .post('/pessoas')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/pessoas')
        .send({})
        .expect(400);
    });

    it('should validate CPF format', async () => {
      await request(app.getHttpServer())
        .post('/pessoas')
        .send({
          ...createPessoaDto,
          cpf: '12345678900', // Missing dots and dash
        })
        .expect(400);
    });

    it('should validate telefone format', async () => {
      await request(app.getHttpServer())
        .post('/pessoas')
        .send({
          ...createPessoaDto,
          telefone: '11987654321', // Missing parentheses and dash
        })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/pessoas')
        .send({
          ...createPessoaDto,
          email: 'not-an-email',
        })
        .expect(400);
    });

    it('should not accept additional properties', async () => {
      const response = await request(app.getHttpServer())
        .post('/pessoas')
        .send({
          ...createPessoaDto,
          extraField: 'should be stripped',
        })
        .expect(400);

      expect(response.body.message.toString()).toContain('extraField');
    });
  });

  describe('GET /pessoas/:id', () => {
    it('should return Pessoa by ID', async () => {
      jest.spyOn(pessoaDao, 'getById').mockResolvedValue(mockPessoa);

      const response = await request(app.getHttpServer())
        .get(`/pessoas/${mockPessoa.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockPessoa.id,
        nome: mockPessoa.nome,
        email: mockPessoa.email,
      });
    });

    it('should return 404 if Pessoa not found', async () => {
      jest.spyOn(pessoaDao, 'getById').mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/pessoas/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /pessoas/email/:email', () => {
    it('should return Pessoa by email', async () => {
      jest.spyOn(pessoaDao, 'findByEmail').mockResolvedValue(mockPessoa);

      const response = await request(app.getHttpServer())
        .get(`/pessoas/email/${mockPessoa.email}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockPessoa.id,
        email: mockPessoa.email,
      });
      expect(pessoaDao.findByEmail).toHaveBeenCalledWith(mockPessoa.email);
    });

    it('should return 404 if not found', async () => {
      jest.spyOn(pessoaDao, 'findByEmail').mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/pessoas/email/nonexistent@example.com')
        .expect(404);
    });
  });

  describe('GET /pessoas/telefone/:telefone', () => {
    it('should return Pessoa by telefone', async () => {
      jest.spyOn(pessoaDao, 'findByTelefone').mockResolvedValue(mockPessoa);

      const response = await request(app.getHttpServer())
        .get(`/pessoas/telefone/${encodeURIComponent(mockPessoa.telefone)}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockPessoa.id,
        telefone: mockPessoa.telefone,
      });
    });

    it('should return 404 if not found', async () => {
      jest.spyOn(pessoaDao, 'findByTelefone').mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/pessoas/telefone/(99)%2099999-9999')
        .expect(404);
    });
  });

  describe('GET /pessoas/search/by-name', () => {
    it('should return array of Pessoas matching name', async () => {
      jest.spyOn(pessoaDao, 'findByName').mockResolvedValue([mockPessoa]);

      const response = await request(app.getHttpServer())
        .get('/pessoas/search/by-name?nome=João')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        nome: mockPessoa.nome,
      });
    });

    it('should return empty array if no matches', async () => {
      jest.spyOn(pessoaDao, 'findByName').mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/pessoas/search/by-name?nome=NonExistent')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('PUT /pessoas/:id', () => {
    it('should update Pessoa', async () => {
      const updatedPessoa = { ...mockPessoa, idade: 31 };
      jest.spyOn(pessoaDao, 'update').mockResolvedValue(updatedPessoa);

      const response = await request(app.getHttpServer())
        .put(`/pessoas/${mockPessoa.id}`)
        .send({ idade: 31 })
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockPessoa.id,
        idade: 31,
      });
      expect(pessoaDao.update).toHaveBeenCalledWith(
        mockPessoa.id,
        expect.objectContaining({ idade: 31 }),
      );
    });

    it('should return 404 if Pessoa not found', async () => {
      jest
        .spyOn(pessoaDao, 'update')
        .mockRejectedValue(new Error('Not found'));

      await request(app.getHttpServer())
        .put('/pessoas/non-existent-id')
        .send({ idade: 31 })
        .expect(404);
    });

    it('should validate updated data', async () => {
      await request(app.getHttpServer())
        .put(`/pessoas/${mockPessoa.id}`)
        .send({ idade: 200 }) // Invalid age
        .expect(400);
    });

    it('should allow partial updates', async () => {
      const updatedPessoa = { ...mockPessoa, nome: 'Maria Silva' };
      jest.spyOn(pessoaDao, 'update').mockResolvedValue(updatedPessoa);

      const response = await request(app.getHttpServer())
        .put(`/pessoas/${mockPessoa.id}`)
        .send({ nome: 'Maria Silva' })
        .expect(200);

      expect(response.body.nome).toBe('Maria Silva');
    });
  });

  describe('DELETE /pessoas/:id', () => {
    it('should delete Pessoa', async () => {
      jest.spyOn(pessoaDao, 'delete').mockResolvedValue(mockPessoa);

      await request(app.getHttpServer())
        .delete(`/pessoas/${mockPessoa.id}`)
        .expect(204);

      expect(pessoaDao.delete).toHaveBeenCalledWith(mockPessoa.id);
    });

    it('should return 404 if Pessoa not found', async () => {
      jest
        .spyOn(pessoaDao, 'delete')
        .mockRejectedValue(new Error('Not found'));

      await request(app.getHttpServer())
        .delete('/pessoas/non-existent-id')
        .expect(404);
    });
  });

  describe('Response format', () => {
    it('should include all required fields in response', async () => {
      jest.spyOn(pessoaDao, 'getById').mockResolvedValue(mockPessoa);

      const response = await request(app.getHttpServer())
        .get(`/pessoas/${mockPessoa.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('nome');
      expect(response.body).toHaveProperty('idade');
      expect(response.body).toHaveProperty('cpf');
      expect(response.body).toHaveProperty('endereco');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('telefone');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return proper Content-Type', async () => {
      jest.spyOn(pessoaDao, 'getById').mockResolvedValue(mockPessoa);

      await request(app.getHttpServer())
        .get(`/pessoas/${mockPessoa.id}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });
});
