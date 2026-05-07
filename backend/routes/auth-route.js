const express = require("express");
const { multerMiddleware } = require("../config/cloudinary-config");
const {
  logout,
  sendOtp,
  verifyOtp,
  updateProfile,
  getAllUser,
} = require("../controllers/auth-controller");

const {
  authTokenVerifyMiddleware,
  checkAuthentication,
} = require("../middleware/auth-middleware");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/logout", logout);

router.put(
  "/update-profile",
  authTokenVerifyMiddleware,
  multerMiddleware,
  updateProfile,
);

router.get("/check-auth", authTokenVerifyMiddleware, checkAuthentication);
router.get("/users", authTokenVerifyMiddleware, getAllUser);
module.exports = router;
