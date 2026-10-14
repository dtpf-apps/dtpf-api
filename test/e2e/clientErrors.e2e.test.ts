/** POST /api/v1/client-errors over real HTTP: the browser's error reports. */

import request from 'supertest';
import app from '../../src/app';
import logger from '../../src/services/logger';
import { nextCaller } from '../helpers/mocks';

const ENDPOINT = '/api/v1/client-errors';

function report(overrides: Record<string, unknown> = {}) {
  return {
    message: 'TypeError: Cannot read properties of undefined',
    source: 'error-boundary',
    stack: 'TypeError: Cannot read properties of undefined\n    at render (app.js:42)',
    url: 'https://dtpf.es/projects',
    userAgent: 'Mozilla/5.0',
    timestamp: 1_760_000_000_000,
    ...overrides,
  };
}

function post(body: object, caller = nextCaller()) {
  return request(app).post(ENDPOINT).set('X-Forwarded-For', caller).send(body);
}

const logError = vi.spyOn(logger, 'error');

beforeEach(() => {
  logError.mockClear();
});

describe('a valid report', () => {
  it('is logged with clipped fields and answered with an empty 204', async () => {
    const res = await post(report({ message: 'm'.repeat(600) }));

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(logError).toHaveBeenCalledTimes(1);
    const [fields, label] = logError.mock.calls[0] as unknown as [
      { clientError: { message: string } },
      string,
    ];
    expect(label).toBe('client error');
    expect(fields.clientError.message).toHaveLength(500);
  });

  it('needs only a message and a source', async () => {
    const res = await post({ message: 'boom', source: 'unhandled-rejection' });

    expect(res.status).toBe(204);
  });
});

describe('an invalid report', () => {
  it.each([
    ['without a message', { message: undefined }],
    ['with an empty message', { message: '' }],
    ['with a message that is not a string', { message: 42 }],
    ['without a source', { source: undefined }],
    ['with a source the client never sends', { source: 'fetch-error' }],
    ['with a stack that is not a string', { stack: { frames: [] } }],
  ])('is refused %s, and never logged', async (_label, overrides) => {
    const res = await post(report(overrides));

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ status: 400, code: 'invalid_client_error' });
    expect(logError).not.toHaveBeenCalled();
  });

  it('is refused with 415 when it is not JSON', async () => {
    const res = await request(app).post(ENDPOINT).set('Content-Type', 'text/plain').send('boom');

    expect(res.status).toBe(415);
  });
});

describe('per-caller rate limit (10 a minute)', () => {
  it('refuses the eleventh report, valid or not, with Retry-After', async () => {
    const caller = nextCaller();
    for (let i = 0; i < 10; i++) {
      expect((await post(report({ message: `error ${i}` }), caller)).status).toBe(204);
    }

    const res = await post({ nonsense: true }, caller);

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'rate_limited' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
