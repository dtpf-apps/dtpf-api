export interface IConfig {
  app: {
    URL: string;
    PORT: number;
    API_VERSION: string;
  };
  db: {
    MONGO_URL: string;
    PORT_MONGO_DB: number;
  };
  dauth: {
    TSK: string;
    DOMAIN_NAME: string;
    DOMAIN_URL: string;
    PREVIOUS_TSK?: string;
  };
  email: {
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASS: string;
    EMAIL_FROM: string;
    NOTIFICATION_TO: string;
  };
}
