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
    email: {
      SMTP_HOST: '10.5.0.46',
      SMTP_PORT: 587,
      SMTP_USER: 'contacto',
      SMTP_PASS: 'pass',
      EMAIL_FROM: 'contacto@dtpf.es',
      NOTIFICATION_TO: 'dtpf@dtpf.es',
    },
    app: { URL: 'http://localhost:3998/api/v1', PORT: 3998, API_VERSION: 'v1' },
    db: { MONGO_URL: 'mongodb://localhost:27019/test', PORT_MONGO_DB: 27019 },
  },
}));

import { sendEmail, verifyEmailConnection } from '../../src/services/email';
import logger from '../../src/services/logger';

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

  it('calls sendMail exactly MAX_RETRIES (2) times when all fail', async () => {
    mockSendMail.mockRejectedValue(new Error('Persistent SMTP failure'));
    const promise = sendEmail({ to: 'test@test.com', subject: 'Retry boundary' });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(result).toBe(false);
    // MAX_RETRIES = 2: attempt 1 fails, waits 2s, attempt 2 fails, returns false
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockSendMail).not.toHaveBeenCalledTimes(3);
  });

  it('logs success info with messageId on successful send', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'msg-xyz' });
    await sendEmail({ to: 'info@test.com', subject: 'Log test' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'msg-xyz', to: 'info@test.com', attempt: 1 }),
      'Email sent'
    );
  });

  it('logs error on each failed attempt', async () => {
    const error = new Error('SMTP down');
    mockSendMail.mockRejectedValue(error);
    const promise = sendEmail({ to: 'fail@test.com', subject: 'Error log test' });
    await vi.advanceTimersByTimeAsync(2000);
    await promise;
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: error, to: 'fail@test.com', attempt: 1 }),
      'Email send failed'
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: error, to: 'fail@test.com', attempt: 2 }),
      'Email send failed'
    );
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
