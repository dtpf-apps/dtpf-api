import dotenv from 'dotenv';
import { productionStage, stagingStage, developmentStage } from '../utils/constants';
import { IConfig } from '../interfaces';

function getEnvPath(env: string | undefined): string {
  if (env === productionStage) return '.env.production';
  if (env === stagingStage) return '.env.staging';
  return '.env.development';
}

dotenv.config({ path: getEnvPath(process.env.NODE_ENV) });
const ENV = process.env.NODE_ENV === stagingStage ? productionStage : process.env.NODE_ENV || developmentStage;

const CONFIG: Record<string, IConfig> = {
  development: {
    app: {
      URL: `http://${process.env.IP_SERVER}:${process.env.PORT_SERVER}/api/${process.env.API_VERSION}`,
      PORT: Number(process.env.PORT_SERVER) || 3998,
      API_VERSION: process.env.API_VERSION || 'v1',
      SECRET_KEY: process.env.SECRET_KEY || '',
    },
    db: {
      MONGO_URL: `mongodb://${process.env.IP_MONGO_DB}:${process.env.PORT_MONGO_DB}/${process.env.DB_NAME}`,
      PORT_MONGO_DB: Number(process.env.PORT_MONGO_DB) || 27019,
    },
  },
  production: {
    app: {
      URL: `http://${process.env.IP_SERVER}:${process.env.PORT_SERVER}/api/${process.env.API_VERSION}`,
      PORT: Number(process.env.PORT_SERVER) || 3998,
      API_VERSION: process.env.API_VERSION || 'v1',
      SECRET_KEY: process.env.SECRET_KEY || '',
    },
    db: {
      MONGO_URL: `mongodb://${process.env.IP_MONGO_DB}:${process.env.PORT_MONGO_DB}/${process.env.DB_NAME}`,
      PORT_MONGO_DB: Number(process.env.PORT_MONGO_DB) || 27018,
    },
  },
};

export default CONFIG[ENV];
