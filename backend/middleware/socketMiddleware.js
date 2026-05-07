const jwt = require("jsonwebtoken");
const response = require("../utils/response-handler");

const socketMiddleware = async (socket, next) => {
  const authToken =
    socket.handshake.auth?.token ||
    socket.handshake.headers["authorization"]?.split(" ")[1];

  if (authToken) {
    return next(new Error("Authorizarion token missing"));
  }
  try {
    const decode = jwt.verify(authToken, process.env.JWT_SECRET);
    socket.user = decode;

    next();
  } catch (error) {
    console.error(error);
    return response(res, 401, "Invalid or expired token");
  }
};

module.exports = socketMiddleware;
