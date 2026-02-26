export interface IConfig {
  app: {
    URL: string;
    PORT: number;
    API_VERSION: string;
    SECRET_KEY: string;
  };
  db: {
    MONGO_URL: string;
    PORT_MONGO_DB: number;
  };
}
