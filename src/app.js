const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const config = require("../src/config/config");

// Load routings
const authRoutes = require("./routers/auth");
const userRoutes = require("./routers/user");
const menuRoutes = require("./routers/menu");
const contactRoutes = require("./routers/contact");
const educationRoutes = require("./routers/education");
const utilsRoutes = require("./routers/utils");
const aboutMeRoutes = require("./routers/aboutMe");

app.disable("x-powered-by");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Allow", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

// Router Basic
app.use(`/api/${config.app.API_VERSION}`, authRoutes);
app.use(`/api/${config.app.API_VERSION}`, userRoutes);
app.use(`/api/${config.app.API_VERSION}`, menuRoutes);
app.use(`/api/${config.app.API_VERSION}`, contactRoutes);
app.use(`/api/${config.app.API_VERSION}`, educationRoutes);
app.use(`/api/${config.app.API_VERSION}`, utilsRoutes);
app.use(`/api/${config.app.API_VERSION}`, aboutMeRoutes);
if (process.env.NODE_ENV === "production") {
  app.get("/client/service-worker.js", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "service-worker.js"));
  });
  app.use("/", express.static("client", { redirect: false }));
  app.get("*", function (req, res, next) {
    res.sendFile(path.resolve("client/index.html"));
  });
}

module.exports = app;
