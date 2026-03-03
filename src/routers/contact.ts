import express from 'express';
import * as ContactController from '../controllers/contact';
import { dauth_md } from '../middlewares/authenticated';

const api = express.Router();

api.post('/contact-me', ContactController.contactMe);
api.get('/get-contact-messages-unread', dauth_md as any, ContactController.getMessagesUnread);
api.put('/check-contact-message/:id', dauth_md as any, ContactController.checkMessage);
api.delete('/delete-contact-message/:id', dauth_md as any, ContactController.deleteMessage);
api.get('/get-last-message-email', dauth_md as any, ContactController.getLastMessageEmail);

export default api;
