vi.mock('../../src/services/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

import { errorMiddleware } from '../../src/middlewares/error.middleware';
import logger from '../../src/services/logger';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/mocks';

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds with 500 and error message', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();
    const error = new Error('Something broke');

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('logs the error', () => {
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
});
