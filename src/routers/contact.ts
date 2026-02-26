import express from 'express';
import * as ContactController from '../controllers/contact';
import { ensureAuth } from '../middlewares/authenticated';

const api = express.Router();

api.post('/contact-me', ContactController.contactMe);
api.get('/get-contact-messages-unread', ensureAuth as any, ContactController.getMessagesUnread);
api.put('/check-contact-message/:id', ensureAuth as any, ContactController.checkMessage);
api.delete('/delete-contact-message/:id', ensureAuth as any, ContactController.deleteMessage);
api.get('/get-last-message-email', ensureAuth as any, ContactController.getLastMessageEmail);

export default api;
