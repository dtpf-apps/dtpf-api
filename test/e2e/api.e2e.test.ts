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
      SMTP_HOST: 'localhost',
      SMTP_PORT: 587,
      SMTP_USER: 'test',
      SMTP_PASS: 'pass',
      EMAIL_FROM: 'sender@example.com',
      NOTIFICATION_TO: 'to@example.com',
    },
    app: { URL: 'http://localhost:3998/api/v1', PORT: 3998, API_VERSION: 'v1' },
    db: { MONGO_URL: 'mongodb://localhost:27019/test', PORT_MONGO_DB: 27019 },
  },
}));

// The static block serves the built SPA from `client/`, which this repo never
// contains. A throwaway fixture stands in for it so the per-route HTML resolution
// is exercised over real HTTP: a shell, two pre-rendered routes, and a file that
// sits OUTSIDE the client root and must never be reachable.
const { clientFixture } = await vi.hoisted(async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const nodePath = await import('node:path');
  const root = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'dtpf-api-client-'));
  const client = nodePath.join(root, 'client');
  const write = (rel: string, title: string) => {
    const file = nodePath.join(root, rel);
    fs.mkdirSync(nodePath.dirname(file), { recursive: true });
    fs.writeFileSync(file, `<!doctype html><html><head><title>${title}</title></head><body></body></html>`);
  };
  write('client/index.html', 'shell');
  write('client/about/index.html', 'about page');
  write('client/en/index.html', 'english home');
  write('outside/index.html', 'outside the client root');
  process.env.CLIENT_DIR = client;
  return { clientFixture: { root, client } };
});

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

    expect(res.status).toBe(201);
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
    expect(res.body.message).toBe('El email no es valido.');
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
    expect(res.body.message).toBe('El mensaje es obligatorio.');
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
      expect(res.status).toBe(201);
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
    expect(res.body.message).toContain('Demasiadas solicitudes');
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
  it('unknown API route returns a JSON 404, never the SPA shell', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({ status: 404 });
  });
});

describe('E2E: error handler ordering (scanner-style malformed URL)', () => {
  // A scanner probing `GET /%c0` makes serve-static / the `{*splat}` param
  // decoder throw a URIError (status 400). The error handler must be registered
  // LAST (after the production static/catch-all block) so this reaches it and
  // returns clean JSON — not Express's default finalhandler, which leaks a
  // stack trace when NODE_ENV != production. Guards against re-introducing the
  // handler-before-static ordering bug.
  it('returns clean JSON 400 for a malformed-URL URIError, never the default HTML stack trace', async () => {
    const res = await request(app).get('/%c0');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({ status: 400 });
    expect(JSON.stringify(res.body)).not.toContain('URIError');
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });
});

describe('E2E: SPA shell and pre-rendered routes', () => {
  afterAll(async () => {
    const fs = await import('node:fs');
    fs.rmSync(clientFixture.root, { recursive: true, force: true });
  });

  const html = async (url: string) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    return res.text;
  };

  it('serves the shell at the root', async () => {
    expect(await html('/')).toContain('<title>shell</title>');
  });

  it('serves a route its own pre-rendered HTML, with and without the trailing slash', async () => {
    expect(await html('/about')).toContain('<title>about page</title>');
    expect(await html('/about/')).toContain('<title>about page</title>');
    expect(await html('/en')).toContain('<title>english home</title>');
  });

  it('falls back to the shell for a route the build did not pre-render', async () => {
    expect(await html('/projects/anything')).toContain('<title>shell</title>');
    expect(await html('/en/projects')).toContain('<title>shell</title>');
  });

  it('never resolves a pre-rendered page outside the client root', async () => {
    // Node's HTTP client sends the path verbatim, so Express sees the `..` segments.
    expect(await html('/../outside')).toContain('<title>shell</title>');
    expect(await html('/about/../../outside')).toContain('<title>shell</title>');
    expect(await html('/..%2Foutside')).toContain('<title>shell</title>');
  });
});
