/**
 * E2E tests for dtpf.es backend API endpoints.
 * Tests the full HTTP request/response cycle through Express using supertest.
 * MongoDB and email services are mocked.
 */

const { mockSave, mockSortFn, mockSendEmail, mockContactConstructor } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockSortFn: vi.fn(),
  mockSendEmail: vi.fn(),
  mockContactConstructor: vi.fn(),
}));

vi.mock('../../src/models/contact', () => {
  const MockContact = mockContactConstructor.mockImplementation(function (
    this: Record<string, unknown>,
    data: Record<string, unknown>
  ) {
    Object.assign(this, data);
    this.save = mockSave;
  });
  (MockContact as any).findOne = vi.fn().mockReturnValue({ sort: mockSortFn });
  return { default: MockContact };
});

vi.mock('../../src/services/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  verifyEmailConnection: vi.fn().mockResolvedValue(true),
  transporter: { verify: vi.fn() },
}));

vi.mock('../../src/services/emailTemplates', () => ({
  contactNotificationHtml: vi.fn().mockReturnValue('<html>test</html>'),
}));

vi.mock('../../src/services/logger', () => {
  const logger: Record<string, any> = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    level: 'info',
    levels: {
      values: { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 },
      labels: { 10: 'trace', 20: 'debug', 30: 'info', 40: 'warn', 50: 'error', 60: 'fatal' },
    },
    child: vi.fn(() => logger),
  };
  return { default: logger };
});

vi.mock('../../src/config/config', () => ({
  default: {
    email: {
      EMAIL: 'sender@gmail.com',
      EMAIL_PASSWORD: 'pass',
      NOTIFICATION_TO: 'to@gmail.com',
      SMTP_USER: 'test',
      EMAIL_FROM: 'sender@gmail.com',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 587,
      SMTP_PASS: 'pass',
    },
    app: { URL: 'http://localhost:3998/api/v1', PORT: 3998, API_VERSION: 'v1' },
    db: { MONGO_URL: 'mongodb://localhost:27019/test', PORT_MONGO_DB: 27019 },
  },
}));

import request from 'supertest';
import app from '../../src/app';

describe('E2E: Health check', () => {
  it('GET /api/v1/connection returns 200', async () => {
    const res = await request(app).get('/api/v1/connection');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
  });
});

describe('E2E: Contact form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue({ _id: 'abc123' });
    mockSortFn.mockResolvedValue(null);
    mockSendEmail.mockResolvedValue(true);
  });

  it('POST /api/v1/contact-me with valid data returns 200', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .send({
        email: 'test@example.com',
        name: 'E2E Test',
        message: 'Este es un mensaje de prueba E2E largo.',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Mensaje enviado correctamente.');
    expect(mockSave).toHaveBeenCalled();
  });

  it('POST /api/v1/contact-me without email returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .send({
        email: '',
        name: 'E2E Test',
        message: 'Este es un mensaje de prueba largo.',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('obligatorios');
  });

  it('POST /api/v1/contact-me without message returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .send({
        email: 'test@example.com',
        name: 'E2E Test',
        message: '',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('obligatorios');
  });

  it('POST /api/v1/contact-me with honeypot returns fake 200 but does not save', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .send({
        email: 'bot@spam.com',
        name: 'Bot',
        message: 'Spam message that is long enough.',
        website: 'http://spam.com',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Mensaje enviado correctamente.');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('POST /api/v1/contact-me with short message returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .send({
        email: 'test@example.com',
        name: 'Test',
        message: 'Corto',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('10 caracteres');
  });

  it('POST /api/v1/contact-me with too many URLs returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .send({
        email: 'url@example.com',
        name: 'Test',
        message: 'http://a.com http://b.com http://c.com http://d.com http://e.com http://f.com extra text',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('enlaces');
  });

  it('POST /api/v1/contact-me sends email notification after save', async () => {
    await request(app)
      .post('/api/v1/contact-me')
      .set('X-Forwarded-For', `e2e-email-${Date.now()}`)
      .send({
        email: 'notify@example.com',
        name: 'E2E Notify',
        message: 'Este es un mensaje para verificar notificacion.',
        website: '',
        _t: Date.now() - 10000,
      });

    // sendEmail is called asynchronously (non-blocking), give it a tick
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('POST /api/v1/contact-me normalizes email to lowercase', async () => {
    await request(app)
      .post('/api/v1/contact-me')
      .set('X-Forwarded-For', `e2e-lower-${Date.now()}`)
      .send({
        email: 'Test@EXAMPLE.COM',
        name: 'Test',
        message: 'Este es un mensaje de prueba con email.',
        website: '',
        _t: Date.now() - 10000,
      });

    const constructorCall = mockContactConstructor.mock.calls.at(-1)[0];
    expect(constructorCall.email).toBe('test@example.com');
  });

  it('POST /api/v1/contact-me sets correct Content-Type header', async () => {
    const res = await request(app)
      .post('/api/v1/contact-me')
      .set('X-Forwarded-For', `e2e-ct-${Date.now()}`)
      .send({
        email: 'test@example.com',
        name: 'Test',
        message: 'Mensaje de prueba content type.',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('rate limits after 3 requests from same IP', async () => {
    const ip = `e2e-rate-${Date.now()}`;

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/contact-me')
        .set('X-Forwarded-For', ip)
        .send({
          email: `user${i}@rate.com`,
          name: 'Rate Test',
          message: 'Mensaje de prueba para rate limit test.',
          website: '',
          _t: Date.now() - 10000,
        });
      expect(res.status).toBe(200);
    }

    // 4th request should be rate-limited
    const res = await request(app)
      .post('/api/v1/contact-me')
      .set('X-Forwarded-For', ip)
      .send({
        email: 'user4@rate.com',
        name: 'Rate Test',
        message: 'Mensaje de prueba para rate limit.',
        website: '',
        _t: Date.now() - 10000,
      });
    expect(res.status).toBe(429);
    expect(res.body.message).toContain('demasiados mensajes');
  });

  it('rejects email cooldown (same email within 24h)', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    mockSortFn.mockResolvedValue({ date: twoHoursAgo });

    const res = await request(app)
      .post('/api/v1/contact-me')
      .set('X-Forwarded-For', `e2e-cooldown-${Date.now()}`)
      .send({
        email: 'cooldown@example.com',
        name: 'Cooldown Test',
        message: 'Mensaje de prueba para email cooldown.',
        website: '',
        _t: Date.now() - 10000,
      });

    expect(res.status).toBe(429);
    expect(res.body.message).toContain('recientemente');
  });
});

describe('E2E: CORS headers', () => {
  it('sets CORS headers for allowed origin', async () => {
    const res = await request(app).get('/api/v1/connection').set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });

  it('does not set Access-Control-Allow-Origin for disallowed origin', async () => {
    const res = await request(app).get('/api/v1/connection').set('Origin', 'http://evil.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('E2E: 404 handling', () => {
  it('unknown API route returns no matching route (Express 5 default)', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    // Express 5 returns 404 for unmatched routes
    expect(res.status).toBe(404);
  });
});
