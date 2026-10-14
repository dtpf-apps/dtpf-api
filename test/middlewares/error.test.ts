vi.mock('../../src/services/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn() },
}));

import { errorMiddleware } from '../../src/middlewares/error.middleware';
import logger from '../../src/services/logger';
import { asExpress, mockResponse } from '../helpers/mocks';

function handle(error: Error) {
  const res = mockResponse();
  const { req, res: expressRes, next } = asExpress(res);
  errorMiddleware(error, req, expressRes, next);
  return { res, next };
}

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers an unexpected error with 500, a code, and no internal detail', () => {
    const { res } = handle(new Error('Sensitive: password hash leaked'));

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ status: 500, code: 'server_error', message: 'Error interno del servidor.' });
    expect(JSON.stringify(res.body)).not.toContain('Sensitive');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('answers a body-parser JSON failure with 400 invalid_json, without alerting', () => {
    const error = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
      status: 400,
    });
    const { res } = handle(error);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ status: 400, code: 'invalid_json' });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('treats a SyntaxError from our own code as a server fault, not as bad input', () => {
    const { res } = handle(new SyntaxError('Unexpected end of JSON input'));

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ code: 'server_error' });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('answers an oversized body with 413 payload_too_large', () => {
    const { res } = handle(
      Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 })
    );

    expect(res.statusCode).toBe(413);
    expect(res.body).toMatchObject({ status: 413, code: 'payload_too_large' });
  });

  // A scanner probing malformed percent-encodings (`GET /%c0`) makes Express throw
  // a URIError tagged 400: client input, so it logs at warn, below the alert level.
  it('honours a malformed-URL URIError status (400) and logs at warn, not error', () => {
    const { res } = handle(Object.assign(new URIError("Failed to decode param '%c0'"), { status: 400 }));

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ status: 400, code: 'bad_request' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('honours a missing-file status (404) with not_found and logs at warn', () => {
    const { res } = handle(Object.assign(new Error('ENOENT'), { statusCode: 404, code: 'ENOENT' }));

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ code: 'not_found' });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('keeps a real 5xx status (503) and logs at error', () => {
    const { res } = handle(Object.assign(new Error('upstream down'), { status: 503 }));

    expect(res.statusCode).toBe(503);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('ignores a status outside the HTTP error range', () => {
    const { res } = handle(Object.assign(new Error('odd'), { status: 302 }));

    expect(res.statusCode).toBe(500);
  });

  it('hands over to Express when the response has already started', () => {
    const res = mockResponse();
    res.headersSent = true;
    const { req, res: expressRes, next } = asExpress(res);
    const error = new Error('late');

    errorMiddleware(error, req, expressRes, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.send).not.toHaveBeenCalled();
  });
});
