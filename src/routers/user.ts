import express from 'express';
import multer from 'multer';
import * as UserController from '../controllers/user';
import { ensureAuth } from '../middlewares/authenticated';

const upload = multer({ dest: './uploads/avatar' });
const api = express.Router();

api.post('/sign-up', UserController.signUp);
api.post('/sign-in', UserController.signIn);
api.get('/users', ensureAuth as any, UserController.getUsers);
api.put(
  '/upload-avatar/:id',
  [ensureAuth as any, upload.single('avatar')],
  UserController.uploadAvatar as any
);
api.get('/get-avatar/:avatarName', UserController.getAvatar);
api.put('/update-user/:id', ensureAuth as any, UserController.updateUser);
api.put('/activate-user/:id', ensureAuth as any, UserController.activateUser);
api.delete('/delete-user/:id', ensureAuth as any, UserController.deleteUser);
api.post('/sign-up-admin', ensureAuth as any, UserController.signUpAdmin);

export default api;
