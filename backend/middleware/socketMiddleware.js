const jwt = require("jsonwebtoken");

const socketMiddleware = (socket, next) => {
  const authToken =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1];

  if (!authToken) {
    return next(new Error("Authorization token missing"));
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    socket.user = decoded;
    socket.userId = decoded.userId;

    next();
  } catch (error) {
    console.error("Socket auth error:", error.message);
    return next(new Error("Invalid token"));
  }
};

module.exports = socketMiddleware;
