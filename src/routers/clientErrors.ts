import express from 'express';
import * as ClientErrorsController from '../controllers/clientErrors';

const api = express.Router();

api.post('/client-errors', ClientErrorsController.reportClientError);

export default api;
