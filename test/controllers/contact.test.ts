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
}));

vi.mock('../../src/services/emailTemplates', () => ({
  contactNotificationHtml: vi.fn().mockReturnValue('<html>test</html>'),
}));

vi.mock('../../src/services/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/config/config', () => ({
  default: {
    email: { SMTP_HOST: '10.5.0.46', SMTP_PORT: 587, SMTP_USER: 'contacto', SMTP_PASS: 'pass', EMAIL_FROM: 'contacto@dtpf.es', NOTIFICATION_TO: 'dtpf@dtpf.es' },
    app: { URL: 'http://localhost:3998/api/v1', PORT: 3998, API_VERSION: 'v1' },
    db: { MONGO_URL: 'mongodb://localhost:27019/test', PORT_MONGO_DB: 27019 },
    dauth: { TSK: '', DOMAIN_NAME: '', DOMAIN_URL: '' },
  },
}));

import { contactMe } from '../../src/controllers/contact';
import { createMockRequest, createMockResponse, createValidContactBody } from '../helpers/mocks';

describe('contactMe controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue({ _id: 'abc123' });
    mockSortFn.mockResolvedValue(null);
    mockSendEmail.mockResolvedValue(true);
  });

  // --- Honeypot ---
  describe('honeypot', () => {
    it('returns fake 200 if website field is filled', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ website: 'http://spam.com' }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._body.message).toBe('Mensaje enviado correctamente.');
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('continues if website field is empty', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ website: '' }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // --- Validation ---
  describe('validation', () => {
    it('returns 400 if email is missing', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ email: '' }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('obligatorios');
    });

    it('returns 400 if message is missing', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ message: '' }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('obligatorios');
    });

    it('returns 400 if message is too short', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ message: 'Corto' }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('10 caracteres');
    });

    it('accepts valid data', async () => {
      const req = createMockRequest({
        body: createValidContactBody(),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._body.message).toBe('Mensaje enviado correctamente.');
    });
  });

  // --- Time trap ---
  describe('time trap', () => {
    it('returns fake 200 if form submitted in less than 3 seconds', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ _t: Date.now() - 1000 }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('continues if form submitted after 3 seconds', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ _t: Date.now() - 5000 }),
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // --- URL detection ---
  describe('URL detection', () => {
    it('accepts message with 5 URLs or less', async () => {
      const msg = 'Check http://a.com http://b.com http://c.com http://d.com http://e.com and thanks';
      const req = createMockRequest({
        body: createValidContactBody({ message: msg }),
        ip: `url-ok-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 400 if message has more than 5 URLs', async () => {
      const msg = 'http://a.com http://b.com http://c.com http://d.com http://e.com http://f.com extra';
      const req = createMockRequest({
        body: createValidContactBody({ message: msg }),
        ip: `url-bad-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('enlaces');
    });

    it('counts www. links as URLs', async () => {
      const msg = 'www.a.com www.b.com www.c.com www.d.com www.e.com www.f.com extra text here';
      const req = createMockRequest({
        body: createValidContactBody({ message: msg }),
        ip: `url-www-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('enlaces');
    });
  });

  // --- IP rate limit ---
  describe('IP rate limit', () => {
    it('accepts first request from an IP', async () => {
      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `ip-first-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).toHaveBeenCalled();
    });

    it('rejects after 3 requests from same IP in 1 hour', async () => {
      const ip = `ip-limit-${Date.now()}`;

      for (let i = 0; i < 3; i++) {
        const req = createMockRequest({
          body: createValidContactBody({ email: `user${i}@test.com` }),
          ip,
          headers: {},
        });
        const res = createMockResponse();
        await contactMe(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
      }

      // 4th request should be rejected
      const req = createMockRequest({
        body: createValidContactBody({ email: 'user4@test.com' }),
        ip,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res._body.message).toContain('demasiados mensajes');
    });
  });

  // --- Email cooldown ---
  describe('email cooldown', () => {
    it('rejects if same email sent less than 24h ago', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockSortFn.mockResolvedValue({ date: twoHoursAgo });

      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `cd-reject-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res._body.message).toContain('recientemente');
    });

    it('includes remaining hours in cooldown message', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockSortFn.mockResolvedValue({ date: twoHoursAgo });

      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `cd-hours-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res._body.message).toMatch(/\d+h/);
    });

    it('accepts if last email was more than 24h ago', async () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      mockSortFn.mockResolvedValue({ date: twoDaysAgo });

      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `cd-ok-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // --- Happy path ---
  describe('happy path', () => {
    it('saves contact to database', async () => {
      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `hp-save-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('sends email notification', async () => {
      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `hp-email-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(mockSendEmail).toHaveBeenCalled();
    });

    it('stores email in lowercase', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ email: 'Test@EXAMPLE.com' }),
        ip: `hp-lower-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      const constructorCall = mockContactConstructor.mock.calls.at(-1)[0];
      expect(constructorCall.email).toBe('test@example.com');
    });

    it('returns 500 if save fails', async () => {
      mockSave.mockResolvedValue(null);

      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `hp-fail-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- x-forwarded-for ---
  describe('getClientIp', () => {
    it('uses x-forwarded-for header when present', async () => {
      const forwardedIp = `xff-${Date.now()}`;

      for (let i = 0; i < 3; i++) {
        const req = createMockRequest({
          body: createValidContactBody({ email: `xff${i}@test.com` }),
          headers: { 'x-forwarded-for': forwardedIp },
          ip: '127.0.0.1',
        });
        const res = createMockResponse();
        await contactMe(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
      }

      // 4th request with same forwarded IP should be rejected
      const req = createMockRequest({
        body: createValidContactBody({ email: 'xff4@test.com' }),
        headers: { 'x-forwarded-for': forwardedIp },
        ip: '127.0.0.1',
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  // --- Email normalization edge cases ---
  describe('email normalization', () => {
    it('normalizes email with mixed case domain', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ email: 'user@GMAIL.COM' }),
        ip: `norm-domain-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const constructorCall = mockContactConstructor.mock.calls.at(-1)[0];
      expect(constructorCall.email).toBe('user@gmail.com');
    });

    it('normalizes email with leading/trailing spaces via lowercase', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ email: '  USER@Example.COM  ' }),
        ip: `norm-spaces-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const constructorCall = mockContactConstructor.mock.calls.at(-1)[0];
      expect(constructorCall.email).toBe('  user@example.com  ');
    });
  });

  // --- Message trimming ---
  describe('message trimming', () => {
    it('trims whitespace from message before saving', async () => {
      const req = createMockRequest({
        body: createValidContactBody({ message: '  Este es un mensaje con espacios.  ' }),
        ip: `trim-msg-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const constructorCall = mockContactConstructor.mock.calls.at(-1)[0];
      expect(constructorCall.message).toBe('Este es un mensaje con espacios.');
    });
  });

  // --- URL detection edge cases ---
  describe('URL detection edge cases', () => {
    it('counts mixed https and www URLs in same message', async () => {
      const msg =
        'Visit https://a.com and www.b.com and https://c.com and www.d.com and https://e.com and www.f.com text';
      const req = createMockRequest({
        body: createValidContactBody({ message: msg }),
        ip: `url-mixed-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._body.message).toContain('enlaces');
    });

    it('accepts message with exactly 5 mixed URL types', async () => {
      const msg =
        'Check https://a.com www.b.com http://c.com www.d.com https://e.com and that is all for today';
      const req = createMockRequest({
        body: createValidContactBody({ message: msg }),
        ip: `url-exact5-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // --- Rate limit edge cases ---
  describe('rate limit edge cases', () => {
    it('uses "unknown" when both x-forwarded-for and req.ip are absent', async () => {
      const req = createMockRequest({
        body: createValidContactBody(),
        ip: undefined,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // --- Server error ---
  describe('server error handling', () => {
    it('returns 500 if an unexpected error is thrown', async () => {
      mockSave.mockRejectedValue(new Error('Unexpected DB crash'));

      const req = createMockRequest({
        body: createValidContactBody(),
        ip: `err-crash-${Date.now()}`,
        headers: {},
      });
      const res = createMockResponse();

      await contactMe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res._body.message).toBe('Error del servidor.');
    });
  });
});
