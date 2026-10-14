import pino from 'pino';
import config from '../config/config';

const logger = pino({ level: config.log.level });

export default logger;
