import express from 'express';
import * as AuthController from '../controllers/auth';

const api = express.Router();

api.post('/refresh-access-token', AuthController.refreshAccessToken);

export default api;
