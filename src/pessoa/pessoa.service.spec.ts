import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PessoaService } from './pessoa.service';
import { PessoaDao } from './pessoa.dao';
import { CacheService } from '../cache/cache.service';
import { LoggerService } from '../common/logger/logger.service';
import type { Pessoa } from '@prisma/client';

describe('PessoaService', () => {
  let service: PessoaService;
  let dao: PessoaDao;
  let cacheService: CacheService;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PessoaService,
        {
          provide: PessoaDao,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            findByEmail: jest.fn(),
            findByTelefone: jest.fn(),
            findByName: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            generateKey: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PessoaService>(PessoaService);
    dao = module.get<PessoaDao>(PessoaDao);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new Pessoa and evict cache', async () => {
      jest.spyOn(dao, 'create').mockResolvedValue(mockPessoa);
      jest.spyOn(cacheService, 'generateKey').mockReturnValue('test-key');
      jest.spyOn(cacheService, 'del').mockResolvedValue();

      const result = await service.create(mockPessoa);

      expect(result).toEqual(mockPessoa);
      expect(dao.create).toHaveBeenCalledWith(mockPessoa);
      expect(cacheService.del).toHaveBeenCalledTimes(2); // email + telefone
    });
  });

  describe('findById', () => {
    it('should return Pessoa when found', async () => {
      jest.spyOn(dao, 'getById').mockResolvedValue(mockPessoa);

      const result = await service.findById(mockPessoa.id);

      expect(result).toEqual(mockPessoa);
      expect(dao.getById).toHaveBeenCalledWith(mockPessoa.id);
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(dao, 'getById').mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    const email = 'joao.silva@example.com';
    const cacheKey = 'test-cache-key';

    it('should return cached Pessoa on cache HIT', async () => {
      jest.spyOn(cacheService, 'generateKey').mockReturnValue(cacheKey);
      jest.spyOn(cacheService, 'get').mockResolvedValue(mockPessoa);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockPessoa);
      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(dao.findByEmail).not.toHaveBeenCalled();
    });

    it('should fetch from DAO on cache MISS', async () => {
      jest.spyOn(cacheService, 'generateKey').mockReturnValue(cacheKey);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(dao, 'findByEmail').mockResolvedValue(mockPessoa);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockPessoa);
      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(dao.findByEmail).toHaveBeenCalledWith(email);
      expect(cacheService.set).toHaveBeenCalledWith(
        cacheKey,
        mockPessoa,
        300_000,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(cacheService, 'generateKey').mockReturnValue(cacheKey);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(dao, 'findByEmail').mockResolvedValue(null);

      await expect(service.findByEmail(email)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByTelefone', () => {
    const telefone = '(11) 98765-4321';
    const cacheKey = 'test-cache-key';

    it('should return cached Pessoa on cache HIT', async () => {
      jest.spyOn(cacheService, 'generateKey').mockReturnValue(cacheKey);
      jest.spyOn(cacheService, 'get').mockResolvedValue(mockPessoa);

      const result = await service.findByTelefone(telefone);

      expect(result).toEqual(mockPessoa);
      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(dao.findByTelefone).not.toHaveBeenCalled();
    });

    it('should fetch from DAO on cache MISS', async () => {
      jest.spyOn(cacheService, 'generateKey').mockReturnValue(cacheKey);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(dao, 'findByTelefone').mockResolvedValue(mockPessoa);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await service.findByTelefone(telefone);

      expect(result).toEqual(mockPessoa);
      expect(dao.findByTelefone).toHaveBeenCalledWith(telefone);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(cacheService, 'generateKey').mockReturnValue(cacheKey);
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(dao, 'findByTelefone').mockResolvedValue(null);

      await expect(service.findByTelefone(telefone)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByName', () => {
    it('should return array of Pessoas', async () => {
      jest.spyOn(dao, 'findByName').mockResolvedValue([mockPessoa]);

      const result = await service.findByName('João');

      expect(result).toEqual([mockPessoa]);
      expect(dao.findByName).toHaveBeenCalledWith('João');
    });

    it('should return empty array when no matches', async () => {
      jest.spyOn(dao, 'findByName').mockResolvedValue([]);

      const result = await service.findByName('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update Pessoa and evict cache', async () => {
      const updateData = { idade: 31 };
      const updatedPessoa = { ...mockPessoa, idade: 31 };

      jest.spyOn(dao, 'getById').mockResolvedValue(mockPessoa);
      jest.spyOn(dao, 'update').mockResolvedValue(updatedPessoa);
      jest.spyOn(cacheService, 'generateKey').mockReturnValue('test-key');
      jest.spyOn(cacheService, 'del').mockResolvedValue();

      const result = await service.update(mockPessoa.id, updateData);

      expect(result).toEqual(updatedPessoa);
      expect(dao.update).toHaveBeenCalledWith(mockPessoa.id, updateData);
      expect(cacheService.del).toHaveBeenCalledTimes(4); // old + new email/telefone
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(dao, 'getById').mockResolvedValue(null);

      await expect(service.update('non-existent', { idade: 31 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete Pessoa and evict cache', async () => {
      jest.spyOn(dao, 'getById').mockResolvedValue(mockPessoa);
      jest.spyOn(dao, 'delete').mockResolvedValue(mockPessoa);
      jest.spyOn(cacheService, 'generateKey').mockReturnValue('test-key');
      jest.spyOn(cacheService, 'del').mockResolvedValue();

      const result = await service.delete(mockPessoa.id);

      expect(result).toEqual(mockPessoa);
      expect(dao.delete).toHaveBeenCalledWith(mockPessoa.id);
      expect(cacheService.del).toHaveBeenCalledTimes(2); // email + telefone
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(dao, 'getById').mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
