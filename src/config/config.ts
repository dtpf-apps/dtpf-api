import { isIP } from 'node:net';
import dotenv from 'dotenv';
import { z } from 'zod';

export const RUNTIME_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type RuntimeEnv = (typeof RUNTIME_ENVS)[number];

const port = z.coerce.number().int().min(1).max(65_535);

// The defaults describe a developer machine (`pnpm db` publishes MongoDB on 27019).
// A deployed process must declare every one of these: falling back to a local
// default there would point it at the wrong database or mailbox without a word.
const REQUIRED_WHEN_DEPLOYED = [
  'PORT_SERVER',
  'IP_MONGO_DB',
  'PORT_MONGO_DB',
  'DB_NAME',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'NOTIFICATION_TO',
] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(RUNTIME_ENVS).default('development'),
  API_VERSION: z
    .string()
    .regex(/^v\d+$/)
    .default('v1'),
  PORT_SERVER: port.default(3998),
  IP_MONGO_DB: z.string().default('127.0.0.1'),
  PORT_MONGO_DB: port.default(27019),
  DB_NAME: z.string().default('dtpf'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: port.default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_TLS_SERVERNAME: z.string().optional(),
  EMAIL_FROM: z.email().default('contacto@dtpf.es'),
  NOTIFICATION_TO: z.email().default('dtpf@dtpf.es'),
});

export function loadConfig(source: NodeJS.ProcessEnv) {
  // `KEY=` in an env file arrives as an empty string, which means "not set".
  const raw = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  const env = parsed.data;

  // Staging is a clone of production and runs the same way: same log level, same
  // certificate checks, same static serving. Only the data behind it differs.
  const deployed = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';

  if (deployed) {
    const problems: string[] = [];
    const missing = REQUIRED_WHEN_DEPLOYED.filter((key) => raw[key] === undefined);
    if (missing.length > 0) problems.push(`missing ${missing.join(', ')}`);
    if (isIP(env.SMTP_HOST) && !env.SMTP_TLS_SERVERNAME) {
      problems.push(
        'SMTP_TLS_SERVERNAME is required when SMTP_HOST is an IP address: the certificate is verified against a hostname'
      );
    }
    if (problems.length > 0) throw new Error(`Invalid ${env.NODE_ENV} environment: ${problems.join('; ')}`);
  }

  const logLevel: 'silent' | 'info' | 'debug' =
    env.NODE_ENV === 'test' ? 'silent' : deployed ? 'info' : 'debug';

  return {
    env: env.NODE_ENV,
    deployed,
    app: {
      port: env.PORT_SERVER,
      apiVersion: env.API_VERSION,
    },
    db: {
      url: `mongodb://${env.IP_MONGO_DB}:${env.PORT_MONGO_DB}/${env.DB_NAME}`,
    },
    email: {
      // Without credentials there is nothing to send with: notifications are skipped, not failed.
      enabled: env.SMTP_USER !== '',
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      // Nodemailer already uses a hostname as the TLS server name; an IP needs it spelled out.
      tlsServername: env.SMTP_TLS_SERVERNAME ?? (isIP(env.SMTP_HOST) ? undefined : env.SMTP_HOST),
      from: env.EMAIL_FROM,
      notificationTo: env.NOTIFICATION_TO,
    },
    log: {
      level: logLevel,
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

// A test run never reads a developer's local env file: each suite states what it needs.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}`, quiet: true });
}

const config: AppConfig = loadConfig(process.env);

export default config;
