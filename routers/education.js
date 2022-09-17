const express = require("express");
const EducationController = require("../controllers/education");
const multipart = require("connect-multiparty");

const md_auth = require("../middlewares/authenticated");
const md_upload_image = multipart({ uploadDir: "./uploads/education" });

const api = express.Router();

api.post("/add-course", [md_auth.ensureAuth], EducationController.addCourse);
api.put("/update-course/:id", [md_auth.ensureAuth], EducationController.updateCourse);
api.get("/get-courses", EducationController.getCourses);
api.get("/get-course/:url", EducationController.getCourse);
api.get("/get-next-course/:url", EducationController.getNextCourse);
api.get("/get-prev-course/:url", EducationController.getPrevCourse);
api.put("/upload-image/:id", [md_auth.ensureAuth, md_upload_image], EducationController.uploadImage);
api.put("/add-tag/:id", [md_auth.ensureAuth], EducationController.addTag);
api.delete("/delete-tag/:id", [md_auth.ensureAuth], EducationController.deleteTag);
api.get("/get-image/:imageName", EducationController.getImage);
api.delete("/delete-course/:id", [md_auth.ensureAuth], EducationController.deleteCourse);

module.exports = api;
