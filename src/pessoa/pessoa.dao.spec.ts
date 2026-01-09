import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PessoaDao } from './pessoa.dao';
import { PrismaService } from '../prisma/prisma.service';
import type { Pessoa } from '@prisma/client';

describe('PessoaDao', () => {
  let dao: PessoaDao;
  let prismaService: PrismaService;
  let cacheManager: any;

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
    // Mock do CacheManager
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    // Mock do PrismaService
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
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    dao = module.get<PessoaDao>(PessoaDao);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate SHA256 hash from SQL and parameters', () => {
      const sql = 'SELECT * FROM pessoas WHERE email = $1';
      const params = ['test@example.com'];

      // Access private method via any
      const key1 = (dao as any).generateCacheKey(sql, params);
      const key2 = (dao as any).generateCacheKey(sql, params);

      // Should be deterministic
      expect(key1).toBe(key2);

      // Should be SHA256 (64 hex characters)
      expect(key1).toHaveLength(64);
      expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different keys for different queries', () => {
      const sql1 = 'SELECT * FROM pessoas WHERE email = $1';
      const sql2 = 'SELECT * FROM pessoas WHERE telefone = $1';
      const params = ['test'];

      const key1 = (dao as any).generateCacheKey(sql1, params);
      const key2 = (dao as any).generateCacheKey(sql2, params);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const sql = 'SELECT * FROM pessoas WHERE email = $1';
      const params1 = ['email1@example.com'];
      const params2 = ['email2@example.com'];

      const key1 = (dao as any).generateCacheKey(sql, params1);
      const key2 = (dao as any).generateCacheKey(sql, params2);

      expect(key1).not.toBe(key2);
    });
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

    it('should evict cache after creating', async () => {
      jest.spyOn(prismaService.pessoa, 'create').mockResolvedValue(mockPessoa);
      const delSpy = jest.spyOn(cacheManager, 'del');

      await dao.create(mockPessoa);

      // Should call cache del twice (email + telefone)
      expect(delSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('should update a Pessoa', async () => {
      const updatedPessoa = { ...mockPessoa, idade: 31 };

      jest
        .spyOn(prismaService.pessoa, 'findUnique')
        .mockResolvedValue(mockPessoa);
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

    it('should evict cache for both old and new values', async () => {
      const oldPessoa = mockPessoa;
      const newPessoa = {
        ...mockPessoa,
        email: 'new.email@example.com',
      };

      jest
        .spyOn(prismaService.pessoa, 'findUnique')
        .mockResolvedValue(oldPessoa);
      jest.spyOn(prismaService.pessoa, 'update').mockResolvedValue(newPessoa);
      const delSpy = jest.spyOn(cacheManager, 'del');

      await dao.update(mockPessoa.id, { email: 'new.email@example.com' });

      // Should evict cache for old and new email/telefone (4 calls total)
      expect(delSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('delete', () => {
    it('should delete a Pessoa', async () => {
      jest
        .spyOn(prismaService.pessoa, 'findUnique')
        .mockResolvedValue(mockPessoa);
      jest
        .spyOn(prismaService.pessoa, 'delete')
        .mockResolvedValue(mockPessoa);

      const result = await dao.delete(mockPessoa.id);

      expect(result).toEqual(mockPessoa);
      expect(prismaService.pessoa.delete).toHaveBeenCalledWith({
        where: { id: mockPessoa.id },
      });
    });

    it('should evict cache before deleting', async () => {
      jest
        .spyOn(prismaService.pessoa, 'findUnique')
        .mockResolvedValue(mockPessoa);
      jest
        .spyOn(prismaService.pessoa, 'delete')
        .mockResolvedValue(mockPessoa);
      const delSpy = jest.spyOn(cacheManager, 'del');

      await dao.delete(mockPessoa.id);

      expect(delSpy).toHaveBeenCalledTimes(2);
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

    it('should return cached Pessoa on cache HIT', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(mockPessoa);

      const result = await dao.findByEmail(email);

      expect(result).toEqual(mockPessoa);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('should query database on cache MISS', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);

      const result = await dao.findByEmail(email);

      expect(result).toEqual(mockPessoa);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should store result in cache after database query', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);
      const setSpy = jest.spyOn(cacheManager, 'set');

      await dao.findByEmail(email);

      expect(setSpy).toHaveBeenCalledWith(
        expect.any(String),
        mockPessoa,
        300_000,
      );
    });

    it('should return null if not found in database', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      const result = await dao.findByEmail(email);

      expect(result).toBeNull();
    });

    it('should not cache null results', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);
      const setSpy = jest.spyOn(cacheManager, 'set');

      await dao.findByEmail(email);

      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('findByTelefone', () => {
    const telefone = '(11) 98765-4321';

    it('should return cached Pessoa on cache HIT', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(mockPessoa);

      const result = await dao.findByTelefone(telefone);

      expect(result).toEqual(mockPessoa);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('should query database on cache MISS', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);

      const result = await dao.findByTelefone(telefone);

      expect(result).toEqual(mockPessoa);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should store result in cache after database query', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);
      const setSpy = jest.spyOn(cacheManager, 'set');

      await dao.findByTelefone(telefone);

      expect(setSpy).toHaveBeenCalledWith(
        expect.any(String),
        mockPessoa,
        300_000,
      );
    });

    it('should return null if not found in database', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      const result = await dao.findByTelefone(telefone);

      expect(result).toBeNull();
    });
  });

  describe('evictCacheForPessoa', () => {
    it('should evict cache for email and telefone', async () => {
      const delSpy = jest.spyOn(cacheManager, 'del');

      await (dao as any).evictCacheForPessoa(mockPessoa);

      expect(delSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache behavior integration', () => {
    it('should demonstrate full cache lifecycle', async () => {
      const email = 'test@example.com';

      // Setup: cache MISS → database query → cache SET
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockPessoa]);

      const result1 = await dao.findByEmail(email);
      expect(result1).toEqual(mockPessoa);
      expect(cacheManager.set).toHaveBeenCalled();

      // Second call: cache HIT
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(mockPessoa);

      const result2 = await dao.findByEmail(email);
      expect(result2).toEqual(mockPessoa);

      // Update: should evict cache
      jest
        .spyOn(prismaService.pessoa, 'findUnique')
        .mockResolvedValue(mockPessoa);
      jest
        .spyOn(prismaService.pessoa, 'update')
        .mockResolvedValue(mockPessoa);

      await dao.update(mockPessoa.id, { idade: 31 });
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });
});
