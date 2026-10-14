import { loadConfig } from '../../src/config/config';

const deployedEnv = {
  NODE_ENV: 'production',
  PORT_SERVER: '3998',
  IP_MONGO_DB: '10.0.0.5',
  PORT_MONGO_DB: '27017',
  DB_NAME: 'dtpf',
  SMTP_HOST: 'mail.example.com',
  SMTP_USER: 'contacto',
  SMTP_PASS: 'not-a-real-password',
  EMAIL_FROM: 'contacto@example.com',
  NOTIFICATION_TO: 'owner@example.com',
};

describe('loadConfig', () => {
  it('falls back to the local developer setup in development', () => {
    const config = loadConfig({ NODE_ENV: 'development' });

    expect(config.deployed).toBe(false);
    expect(config.app).toEqual({ port: 3998, apiVersion: 'v1' });
    expect(config.db.url).toBe('mongodb://127.0.0.1:27019/dtpf');
    expect(config.email.enabled).toBe(false);
    expect(config.log.level).toBe('debug');
  });

  it('treats a missing NODE_ENV as development', () => {
    expect(loadConfig({}).env).toBe('development');
  });

  it('silences logging under test', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).log.level).toBe('silent');
  });

  it('builds a production config from a complete environment', () => {
    const config = loadConfig(deployedEnv);

    expect(config.deployed).toBe(true);
    expect(config.log.level).toBe('info');
    expect(config.db.url).toBe('mongodb://10.0.0.5:27017/dtpf');
    expect(config.email).toMatchObject({
      enabled: true,
      host: 'mail.example.com',
      port: 587,
      tlsServername: 'mail.example.com',
      from: 'contacto@example.com',
      notificationTo: 'owner@example.com',
    });
  });

  it('runs staging exactly like production', () => {
    const staging = loadConfig({ ...deployedEnv, NODE_ENV: 'staging' });

    expect(staging.env).toBe('staging');
    expect(staging.deployed).toBe(true);
    expect(staging.log.level).toBe('info');
  });

  it('refuses a deployed environment with variables missing, and names every one', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging', SMTP_HOST: 'mail.example.com' })).toThrow(
      'missing PORT_SERVER, IP_MONGO_DB, PORT_MONGO_DB, DB_NAME, SMTP_USER, SMTP_PASS, EMAIL_FROM, NOTIFICATION_TO'
    );
  });

  it('counts an empty value as missing', () => {
    expect(() => loadConfig({ ...deployedEnv, DB_NAME: '' })).toThrow('missing DB_NAME');
  });

  it('requires the certificate hostname when the SMTP host is an IP address', () => {
    const byIp = { ...deployedEnv, SMTP_HOST: '10.0.0.9' };

    expect(() => loadConfig(byIp)).toThrow('SMTP_TLS_SERVERNAME is required');
    expect(loadConfig({ ...byIp, SMTP_TLS_SERVERNAME: 'mail.example.com' }).email.tlsServername).toBe(
      'mail.example.com'
    );
  });

  it.each([
    ['a port that is not a number', { PORT_SERVER: 'eighty' }],
    ['a port out of range', { PORT_MONGO_DB: '70000' }],
    ['an unknown NODE_ENV', { NODE_ENV: 'prod' }],
    ['a recipient that is not an address', { NOTIFICATION_TO: 'owner' }],
    ['an API version that is not vN', { API_VERSION: 'latest' }],
  ])('refuses %s', (_label, overrides) => {
    expect(() => loadConfig({ ...deployedEnv, ...overrides })).toThrow('Invalid environment');
  });
});
