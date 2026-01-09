import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    // LoggerService is TRANSIENT scoped, so use resolve() instead of get()
    service = await module.resolve<LoggerService>(LoggerService);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('setContext', () => {
    it('should set the context', () => {
      service.setContext('TestContext');
      service.log('test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"context":"TestContext"')
      );
    });
  });

  describe('log', () => {
    it('should log info level message with JSON format', () => {
      service.log('Test message', 'TestContext');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('Test message');
      expect(loggedData.context).toBe('TestContext');
      expect(loggedData.timestamp).toBeDefined();
    });

    it('should include metadata when provided', () => {
      const meta = { userId: '123', action: 'create' };
      service.log('Test message', 'TestContext', meta);

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.meta).toEqual(meta);
    });

    it('should use default context when not provided', () => {
      service.setContext('DefaultContext');
      service.log('Test message');

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData.context).toBe('DefaultContext');
    });
  });

  describe('debug', () => {
    it('should log debug level message in development mode', () => {
      process.env.NODE_ENV = 'development';
      service.debug('Debug message', 'TestContext');

      const loggedData = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('debug');
      expect(loggedData.message).toBe('Debug message');
      delete process.env.NODE_ENV;
    });

    it('should not log debug in production without LOG_LEVEL', () => {
      process.env.NODE_ENV = 'production';
      service.debug('Debug message', 'TestContext');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      delete process.env.NODE_ENV;
    });
  });

  describe('warn', () => {
    it('should log warning level message', () => {
      service.warn('Warning message', 'TestContext');

      const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('warn');
      expect(loggedData.message).toBe('Warning message');
    });
  });

  describe('error', () => {
    it('should log error level message', () => {
      service.error('Error message', 'stack trace', 'TestContext');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(loggedData.level).toBe('error');
      expect(loggedData.message).toBe('Error message');
      expect(loggedData.context).toBe('TestContext');
    });

    it('should include stack trace in metadata', () => {
      service.error('Error message', 'stack trace here', 'TestContext');

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.meta.trace).toBe('stack trace here');
    });

    it('should include additional metadata', () => {
      const meta = { errorCode: 'E001' };
      service.error('Error message', 'stack trace', 'TestContext', meta);

      const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedData.meta.trace).toBe('stack trace');
      expect(loggedData.meta.errorCode).toBe('E001');
    });
  });

  describe('verbose', () => {
    it('should log verbose level message when LOG_LEVEL is verbose', () => {
      process.env.LOG_LEVEL = 'verbose';
      service.verbose('Verbose message', 'TestContext');

      const loggedData = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(loggedData.level).toBe('verbose');
      expect(loggedData.message).toBe('Verbose message');
      delete process.env.LOG_LEVEL;
    });

    it('should not log verbose without LOG_LEVEL set', () => {
      service.verbose('Verbose message', 'TestContext');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('timestamp format', () => {
    it('should include ISO 8601 timestamp', () => {
      service.log('Test message');

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      const timestamp = new Date(loggedData.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});
