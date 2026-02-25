const express = require('express');
const AboutMeController = require('../controllers/aboutMe');
const md_auth = require('../middlewares/authenticated');
const api = express.Router();

api.post('/add-about-me-info', [md_auth.ensureAuth], AboutMeController.addAboutMeInfo);
api.get('/get-about-me-info/:title', AboutMeController.getAboutMeInfo);
api.put('/update-about-me-info/:title', [md_auth.ensureAuth], AboutMeController.updateAboutMeInfo);

module.exports = api;
