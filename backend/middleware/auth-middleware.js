const jwt = require("jsonwebtoken");
const response = require("../utils/response-handler");
const User = require("../models/user");

const authTokenVerifyMiddleware = async (req, res, next) => {
  // const authToken = req.cookies?.auth_token;
  // if (!authToken) {
  //   return response(
  //     res,
  //     401,
  //     "Authorization token missing, please provide token",
  //   );
  // }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return response(
      res,
      401,
      "authorization token is missing. please provide token",
    );
  }

  const authToken = authHeader.split(" ")[1];
  try {
    const decode = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decode;

    next();
  } catch (error) {
    console.error(error);
    return response(res, 401, "Invalid or expired token");
  }
};
const checkAuthentication = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(
        res,
        404,
        "Unauthorization please login befor access our app",
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }
    return response(res, 200, "user retrived and allow to use app", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internel server error");
  }
};

module.exports = { authTokenVerifyMiddleware, checkAuthentication };
