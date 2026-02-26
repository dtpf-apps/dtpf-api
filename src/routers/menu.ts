import express from 'express';
import * as MenuController from '../controllers/menu';
import { ensureAuth } from '../middlewares/authenticated';

const api = express.Router();

api.post('/add-menu', ensureAuth as any, MenuController.addMenu);
api.get('/get-menus', MenuController.getMenus);
api.put('/update-menu/:id', ensureAuth as any, MenuController.updateMenu);
api.put('/activate-menu/:id', ensureAuth as any, MenuController.activateMenu);
api.delete('/delete-menu/:id', ensureAuth as any, MenuController.deleteMenu);

export default api;
