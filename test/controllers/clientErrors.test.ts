import { reportClientError, rateLimiter } from '../../src/controllers/clientErrors';
import { createMockRequest, createMockResponse } from '../helpers/mocks';

const mockLoggerError = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/logger', () => ({
  default: { error: mockLoggerError },
}));

function createValidErrorBody(overrides: Record<string, unknown> = {}) {
  return {
    message: 'TypeError: Cannot read property of undefined',
    source: 'error-boundary',
    stack: 'TypeError: Cannot read property\n    at Component.render (app.js:42)',
    url: 'https://example.com/projects',
    userAgent: 'Mozilla/5.0',
    timestamp: '2026-03-16T12:00:00.000Z',
    ...overrides,
  };
}

describe('reportClientError controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.ipRequests.clear();
  });

  describe('validation', () => {
    it('rejects missing message', () => {
      const req = createMockRequest({ body: createValidErrorBody({ message: undefined }) });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('message es obligatorio');
    });

    it('rejects non-string message', () => {
      const req = createMockRequest({ body: createValidErrorBody({ message: 123 }) });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('message es obligatorio');
    });

    it('rejects missing source', () => {
      const req = createMockRequest({ body: createValidErrorBody({ source: undefined }) });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('source must be one of');
    });

    it('rejects invalid source', () => {
      const req = createMockRequest({ body: createValidErrorBody({ source: 'invalid-source' }) });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('source must be one of');
    });

    it.each(['error-boundary', 'unhandled-error', 'unhandled-rejection', 'fetch-error'] as const)(
      'accepts valid source: %s',
      (source) => {
        const req = createMockRequest({
          body: createValidErrorBody({ source }),
          ip: `10.0.0.${Math.floor(Math.random() * 255)}`,
        });
        const res = createMockResponse();

        reportClientError(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
      }
    );
  });

  describe('logging', () => {
    it('logs the error with pino', () => {
      const body = createValidErrorBody();
      const req = createMockRequest({ body, ip: '10.1.0.1' });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(mockLoggerError).toHaveBeenCalledWith(
        {
          clientError: {
            message: body.message,
            stack: body.stack,
            source: body.source,
            url: body.url,
            userAgent: body.userAgent,
            timestamp: body.timestamp,
          },
        },
        'client error'
      );
    });

    it('returns 204 with no body', () => {
      const req = createMockRequest({ body: createValidErrorBody(), ip: '10.1.0.2' });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('handles missing optional fields', () => {
      const req = createMockRequest({
        body: { message: 'Error occurred', source: 'fetch-error' },
        ip: '10.1.0.3',
      });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(mockLoggerError).toHaveBeenCalledWith(
        {
          clientError: {
            message: 'Error occurred',
            stack: undefined,
            source: 'fetch-error',
            url: undefined,
            userAgent: undefined,
            timestamp: undefined,
          },
        },
        'client error'
      );
    });
  });

  describe('truncation', () => {
    it('truncates message to 500 characters', () => {
      const longMessage = 'x'.repeat(600);
      const req = createMockRequest({
        body: createValidErrorBody({ message: longMessage }),
        ip: '10.2.0.1',
      });
      const res = createMockResponse();

      reportClientError(req, res);

      const loggedError = mockLoggerError.mock.calls[0][0].clientError;
      expect(loggedError.message).toHaveLength(500);
    });

    it('truncates stack to 2000 characters', () => {
      const longStack = 'y'.repeat(2500);
      const req = createMockRequest({
        body: createValidErrorBody({ stack: longStack }),
        ip: '10.2.0.2',
      });
      const res = createMockResponse();

      reportClientError(req, res);

      const loggedError = mockLoggerError.mock.calls[0][0].clientError;
      expect(loggedError.stack).toHaveLength(2000);
    });

    it('truncates url to 500 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(600);
      const req = createMockRequest({
        body: createValidErrorBody({ url: longUrl }),
        ip: '10.2.0.3',
      });
      const res = createMockResponse();

      reportClientError(req, res);

      const loggedError = mockLoggerError.mock.calls[0][0].clientError;
      expect(loggedError.url).toHaveLength(500);
    });

    it('truncates userAgent to 200 characters', () => {
      const longUA = 'Mozilla/' + 'z'.repeat(300);
      const req = createMockRequest({
        body: createValidErrorBody({ userAgent: longUA }),
        ip: '10.2.0.4',
      });
      const res = createMockResponse();

      reportClientError(req, res);

      const loggedError = mockLoggerError.mock.calls[0][0].clientError;
      expect(loggedError.userAgent).toHaveLength(200);
    });

    it('does not truncate values within limits', () => {
      const body = createValidErrorBody();
      const req = createMockRequest({ body, ip: '10.2.0.5' });
      const res = createMockResponse();

      reportClientError(req, res);

      const loggedError = mockLoggerError.mock.calls[0][0].clientError;
      expect(loggedError.message).toBe(body.message);
      expect(loggedError.stack).toBe(body.stack);
      expect(loggedError.url).toBe(body.url);
      expect(loggedError.userAgent).toBe(body.userAgent);
    });
  });

  describe('rate limiting', () => {
    it('allows up to 10 requests per IP', () => {
      const ip = '10.3.0.1';

      for (let i = 0; i < 10; i++) {
        const req = createMockRequest({ body: createValidErrorBody(), ip });
        const res = createMockResponse();
        reportClientError(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
      }
    });

    it('rejects the 11th request from the same IP', () => {
      const ip = '10.3.0.2';

      for (let i = 0; i < 10; i++) {
        const req = createMockRequest({ body: createValidErrorBody(), ip });
        const res = createMockResponse();
        reportClientError(req, res);
      }

      const req = createMockRequest({ body: createValidErrorBody(), ip });
      const res = createMockResponse();
      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res._body.message).toContain('Demasiados reportes de error');
    });

    it('does not affect different IPs', () => {
      // Fill up IP 1
      for (let i = 0; i < 10; i++) {
        const req = createMockRequest({ body: createValidErrorBody(), ip: '10.3.0.3' });
        const res = createMockResponse();
        reportClientError(req, res);
      }

      // Different IP should still work
      const req = createMockRequest({ body: createValidErrorBody(), ip: '10.3.0.4' });
      const res = createMockResponse();
      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('reads IP from x-forwarded-for header', () => {
      const req = createMockRequest({
        body: createValidErrorBody(),
        headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
        ip: '127.0.0.1',
      });
      const res = createMockResponse();

      reportClientError(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(rateLimiter.ipRequests.has('203.0.113.1')).toBe(true);
    });
  });
});
