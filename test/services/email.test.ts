const { mockSendMail, mockVerify } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
      verify: mockVerify,
    }),
  },
}));

vi.mock('../../src/services/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/config/config', () => ({
  default: {
    email: { EMAIL: 'test@gmail.com', EMAIL_PASSWORD: 'pass', NOTIFICATION_TO: 'to@gmail.com' },
    app: { URL: 'http://localhost:3998/api/v1', PORT: 3998, API_VERSION: 'v1' },
    db: { MONGO_URL: 'mongodb://localhost:27019/test', PORT_MONGO_DB: 27019 },
    dauth: { TSK: '', DOMAIN_NAME: '', DOMAIN_URL: '' },
  },
}));

import { sendEmail, verifyEmailConnection } from '../../src/services/email';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true on successful send', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'abc123' });
    const result = await sendEmail({ to: 'test@test.com', subject: 'Test' });
    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('retries on first failure and succeeds on second attempt', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error')).mockResolvedValueOnce({ messageId: 'abc' });
    const promise = sendEmail({ to: 'test@test.com', subject: 'Test' });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(result).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it('returns false if all retries fail', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP error'));
    const promise = sendEmail({ to: 'test@test.com', subject: 'Test' });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(result).toBe(false);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });
});

describe('verifyEmailConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when verification succeeds', async () => {
    mockVerify.mockResolvedValueOnce(true);
    const result = await verifyEmailConnection();
    expect(result).toBe(true);
  });

  it('returns false and logs warning when verification fails', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Connection refused'));
    const result = await verifyEmailConnection();
    expect(result).toBe(false);
  });
});
