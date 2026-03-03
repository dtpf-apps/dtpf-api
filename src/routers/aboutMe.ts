import express from 'express';
import * as AboutMeController from '../controllers/aboutMe';
import { dauth_md } from '../middlewares/authenticated';

const api = express.Router();

api.post('/add-about-me-info', dauth_md as any, AboutMeController.addAboutMeInfo);
api.get('/get-about-me-info/:title', AboutMeController.getAboutMeInfo);
api.put('/update-about-me-info/:title', dauth_md as any, AboutMeController.updateAboutMeInfo);

export default api;
