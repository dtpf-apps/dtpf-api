const dotenv = require('dotenv');
const { productionStage, developmentStage } = require('../utils/constants');
dotenv.config({ path: process.env.NODE_ENV === productionStage ? '.env.production' : '.env.development' });
const ENV = process.env.NODE_ENV || developmentStage;

const CONFIG = {
  development: {
    app: {
      URL: `http://${process.env.IP_SERVER}:${process.env.PORT_SERVER}/api/${process.env.API_VERSION}`,
      PORT: process.env.PORT_SERVER || 3998,
      API_VERSION: process.env.API_VERSION || 'v1',
      SECRET_KEY: process.env.SECRET_KEY,
    },
    db: {
      MONGO_URL: `mongodb://${process.env.IP_MONGO_DB}:${process.env.PORT_MONGO_DB}/${process.env.DB_NAME}`,
      PORT_MONGO_DB: process.env.PORT_MONGO_DB || 27019,
    },
  },
  production: {
    app: {
      URL: `http://${process.env.IP_SERVER}:${process.env.PORT_SERVER}/api/${process.env.API_VERSION}`,
      PORT: process.env.PORT_SERVER || 3998,
      API_VERSION: process.env.API_VERSION || 'v1',
      SECRET_KEY: process.env.SECRET_KEY,
    },
    db: {
      MONGO_URL: `mongodb://${process.env.IP_MONGO_DB}:${process.env.PORT_MONGO_DB}/${process.env.DB_NAME}`,
      // MONGO_URL: `mongodb://${process.env.DB_USER_PASSWORD}@${process.env.IP_SERVER}:${process.env.PORT_MONGO_DB}/${process.env.DB_NAME}?authSource=admin`,
      PORT_MONGO_DB: process.env.PORT_MONGO_DB || 27018,
    },
  },
};

module.exports = CONFIG[ENV];
