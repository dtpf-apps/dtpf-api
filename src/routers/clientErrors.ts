import express from 'express';
import * as ClientErrorsController from '../controllers/clientErrors';
import { requireJson } from '../middlewares/requireJson.middleware';

const api = express.Router();

api.post('/client-errors', requireJson, ClientErrorsController.reportClientError);

export default api;
