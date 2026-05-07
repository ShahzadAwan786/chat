const express = require("express");
const { multerMiddleware } = require("../config/cloudinary-config");
const { authTokenVerifyMiddleware } = require("../middleware/auth-middleware");
const {
  createStatus,
  getStatus,
  viewStatus,
  deleteStatus,
} = require("../controllers/status-controller");

const router = express.Router();

router.post("/", authTokenVerifyMiddleware, multerMiddleware, createStatus);
router.get("/", authTokenVerifyMiddleware, getStatus);

router.put("/:statusId/view", authTokenVerifyMiddleware, viewStatus);
router.delete("/:statusId", authTokenVerifyMiddleware, deleteStatus);

module.exports = router;
