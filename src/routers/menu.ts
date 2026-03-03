import express from 'express';
import * as MenuController from '../controllers/menu';
import { dauth_md } from '../middlewares/authenticated';

const api = express.Router();

api.post('/add-menu', dauth_md as any, MenuController.addMenu);
api.get('/get-menus', MenuController.getMenus);
api.put('/update-menu/:id', dauth_md as any, MenuController.updateMenu);
api.put('/activate-menu/:id', dauth_md as any, MenuController.activateMenu);
api.delete('/delete-menu/:id', dauth_md as any, MenuController.deleteMenu);

export default api;
