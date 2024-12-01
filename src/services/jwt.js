const jwt = require("jwt-simple");
const moment = require("moment");
const config = require("../config/config");

exports.createAccessToken = function (user) {
  const payload = {
    id: user._id,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    createToken: moment().unix(),
    exp: moment().add(24, "hours").unix(),
  };
  return jwt.encode(payload, config.app.SECRET_KEY);
};

exports.createRefreshToken = function (user) {
  const payload = {
    id: user._id,
    exp: moment().add(24, "hours").unix(),
  };
  return jwt.encode(payload, config.app.SECRET_KEY);
};

exports.decodedToken = function (token) {
  return jwt.decode(token, config.app.SECRET_KEY, true);
};
