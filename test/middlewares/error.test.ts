vi.mock('../../src/services/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { errorMiddleware } from '../../src/middlewares/error.middleware';
import logger from '../../src/services/logger';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/mocks';

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds with 500 and error message for generic errors', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = new Error('Something broke');

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ status: 500, message: 'Error interno del servidor' });
  });

  it('logs the error for generic errors', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = new Error('DB connection lost');

    errorMiddleware(error, req, res, next);

    expect(logger.error).toHaveBeenCalledWith(error, 'Error interno del servidor');
  });

  it('does not expose error details to the client', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = new Error('Sensitive: password hash leaked');

    errorMiddleware(error, req, res, next);

    const body = res.send.mock.calls[0][0];
    expect(body.message).not.toContain('Sensitive');
    expect(body.message).toBe('Error interno del servidor');
  });

  it('returns 400 for JSON parse errors', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' });

    errorMiddleware(error as Error & { type?: string }, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._body.message).toBe('JSON invalido.');
  });

  it('returns 400 for ValidationError', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = new Error('Validation failed');
    error.name = 'ValidationError';

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._body.message).toBe('Datos de entrada invalidos.');
  });

  // A scanner probing malformed percent-encodings (`GET /%c0`) makes Express
  // throw a URIError tagged status 400 — client input, not a server fault: it
  // must log at warn (below the level>=50 alert threshold) and respond 400.
  it('honours a malformed-URL URIError status (400) and logs at warn, not error', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = Object.assign(new URIError("Failed to decode param '%c0'"), { status: 400 });

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._body.status).toBe(400);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('honours a missing-file ENOENT status (404) and logs at warn, not error', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = Object.assign(new Error('ENOENT'), { statusCode: 404, code: 'ENOENT' });

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns the real 5xx status (503) and logs at error', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = Object.assign(new Error('upstream down'), { status: 503 });

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
