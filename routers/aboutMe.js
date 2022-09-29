const express = require("express");
const AboutMeController = require("../controllers/aboutMe");
const md_auth = require("../middlewares/authenticated");
const api = express.Router();

api.post("/add-maininfo", [md_auth.ensureAuth], AboutMeController.addMainInfo);
api.get("/get-maininfo", AboutMeController.getMainInfo);
api.put("/update-maininfo", [md_auth.ensureAuth], AboutMeController.updateMainInfo);

module.exports = api;