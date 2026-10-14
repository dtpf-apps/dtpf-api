import express from 'express';
import * as ContactController from '../controllers/contact';
import { requireJson } from '../middlewares/requireJson.middleware';

const api = express.Router();

api.post('/contact-me', requireJson, ContactController.contactMe);

export default api;
