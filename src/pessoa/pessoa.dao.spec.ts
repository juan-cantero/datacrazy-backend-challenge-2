import { Test, TestingModule } from '@nestjs/testing';
import { PessoaDao } from './pessoa.dao';
import { PrismaService } from '../prisma/prisma.service';
import type { Pessoa } from '@prisma/client';

describe('PessoaDao', () => {
  let dao: PessoaDao;
  let prismaService: PrismaService;

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

  beforeEach(async () => {
    const mockPrismaService = {
      pessoa: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PessoaDao,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    dao = module.get<PessoaDao>(PessoaDao);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new Pessoa', async () => {
      jest.spyOn(prismaService.pessoa, 'create').mockResolvedValue(mockPessoa);

      const result = await dao.create(mockPessoa);

      expect(result).toEqual(mockPessoa);
      expect(prismaService.pessoa.create).toHaveBeenCalledWith({
        data: mockPessoa,
      });
    });
  });

  describe('update', () => {
    it('should update a Pessoa', async () => {
      const updatedPessoa = { ...mockPessoa, idade: 31 };

      jest
        .spyOn(prismaService.pessoa, 'update')
        .mockResolvedValue(updatedPessoa);

      const result = await dao.update(mockPessoa.id, { idade: 31 });

      expect(result).toEqual(updatedPessoa);
      expect(prismaService.pessoa.update).toHaveBeenCalledWith({
        where: { id: mockPessoa.id },
        data: { idade: 31 },
      });
    });
  });

  describe('delete', () => {
    it('should delete a Pessoa', async () => {
      jest
        .spyOn(prismaService.pessoa, 'delete')
        .mockResolvedValue(mockPessoa);

      const result = await dao.delete(mockPessoa.id);

      expect(result).toEqual(mockPessoa);
      expect(prismaService.pessoa.delete).toHaveBeenCalledWith({
        where: { id: mockPessoa.id },
      });
    });
  });

  describe('getById', () => {
    it('should return Pessoa by ID', async () => {
      jest
        .spyOn(prismaService.pessoa, 'findUnique')
        .mockResolvedValue(mockPessoa);

      const result = await dao.getById(mockPessoa.id);

      expect(result).toEqual(mockPessoa);
      expect(prismaService.pessoa.findUnique).toHaveBeenCalledWith({
        where: { id: mockPessoa.id },
      });
    });

    it('should return null if not found', async () => {
      jest.spyOn(prismaService.pessoa, 'findUnique').mockResolvedValue(null);

      const result = await dao.getById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return array of Pessoas matching name', async () => {
      const pessoas = [mockPessoa];
      jest.spyOn(prismaService.pessoa, 'findMany').mockResolvedValue(pessoas);

      const result = await dao.findByName('João');

      expect(result).toEqual(pessoas);
      expect(prismaService.pessoa.findMany).toHaveBeenCalledWith({
        where: {
          nome: {
            contains: 'João',
            mode: 'insensitive',
          },
        },
      });
    });

    it('should return empty array if no matches', async () => {
      jest.spyOn(prismaService.pessoa, 'findMany').mockResolvedValue([]);

      const result = await dao.findByName('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmail', () => {
    const email = 'joao.silva@example.com';

    it('should return Pessoa by email', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);

      const result = await dao.findByEmail(email);

      expect(result).toEqual(mockPessoa);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return null if not found in database', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      const result = await dao.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findByTelefone', () => {
    const telefone = '(11) 98765-4321';

    it('should return Pessoa by telefone', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);

      const result = await dao.findByTelefone(telefone);

      expect(result).toEqual(mockPessoa);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return null if not found in database', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      const result = await dao.findByTelefone(telefone);

      expect(result).toBeNull();
    });
  });
});
