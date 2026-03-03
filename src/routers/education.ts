import express from 'express';
import multer from 'multer';
import * as EducationController from '../controllers/education';
import { dauth_md } from '../middlewares/authenticated';

const upload = multer({ dest: './uploads/education' });
const api = express.Router();

api.post('/add-course', dauth_md as any, EducationController.addCourse);
api.put('/update-course/:id', dauth_md as any, EducationController.updateCourse);
api.get('/get-courses', EducationController.getCourses);
api.get('/get-course/:url', EducationController.getCourse);
api.get('/get-next-course/:url', EducationController.getNextCourse);
api.get('/get-prev-course/:url', EducationController.getPrevCourse);
api.put(
  '/upload-image/:id',
  [dauth_md as any, upload.single('image')],
  EducationController.uploadImage as any
);
api.put('/add-tag/:id', dauth_md as any, EducationController.addTag);
api.delete('/delete-tag/:id', dauth_md as any, EducationController.deleteTag);
api.get('/get-image/:imageName', EducationController.getImage);
api.delete('/delete-course/:id', dauth_md as any, EducationController.deleteCourse);

export default api;
