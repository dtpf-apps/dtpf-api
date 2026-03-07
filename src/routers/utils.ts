import express from 'express';
import * as UtilsController from '../controllers/utils';

const api = express.Router();

api.get('/connection', UtilsController.connection);

export default api;
