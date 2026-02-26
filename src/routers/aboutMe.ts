import express from 'express';
import * as AboutMeController from '../controllers/aboutMe';
import { ensureAuth } from '../middlewares/authenticated';

const api = express.Router();

api.post('/add-about-me-info', ensureAuth as any, AboutMeController.addAboutMeInfo);
api.get('/get-about-me-info/:title', AboutMeController.getAboutMeInfo);
api.put('/update-about-me-info/:title', ensureAuth as any, AboutMeController.updateAboutMeInfo);

export default api;
