const express = require("express");
const ContactController = require("../controllers/contact");
const md_auth = require("../middlewares/authenticated");
const api = express.Router();

api.post("/contact-me", ContactController.contactMe);
api.get("/get-contact-messages-unread", [md_auth.ensureAuth], ContactController.getMessagesUnread);
api.put("/check-contact-message/:id", [md_auth.ensureAuth], ContactController.checkMessage);
api.delete("/delete-contact-message/:id", [md_auth.ensureAuth], ContactController.deleteMessage);
api.get("/get-last-message-email", [md_auth.ensureAuth], ContactController.getLastMessageEmail);

module.exports = api;