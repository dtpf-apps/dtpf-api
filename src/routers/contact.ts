import express from 'express';
import * as ContactController from '../controllers/contact';

const api = express.Router();

api.post('/contact-me', ContactController.contactMe);

export default api;
