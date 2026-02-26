import express from 'express';
import multer from 'multer';
import * as EducationController from '../controllers/education';
import { ensureAuth } from '../middlewares/authenticated';

const upload = multer({ dest: './uploads/education' });
const api = express.Router();

api.post('/add-course', ensureAuth as any, EducationController.addCourse);
api.put('/update-course/:id', ensureAuth as any, EducationController.updateCourse);
api.get('/get-courses', EducationController.getCourses);
api.get('/get-course/:url', EducationController.getCourse);
api.get('/get-next-course/:url', EducationController.getNextCourse);
api.get('/get-prev-course/:url', EducationController.getPrevCourse);
api.put(
  '/upload-image/:id',
  [ensureAuth as any, upload.single('image')],
  EducationController.uploadImage as any
);
api.put('/add-tag/:id', ensureAuth as any, EducationController.addTag);
api.delete('/delete-tag/:id', ensureAuth as any, EducationController.deleteTag);
api.get('/get-image/:imageName', EducationController.getImage);
api.delete('/delete-course/:id', ensureAuth as any, EducationController.deleteCourse);

export default api;
