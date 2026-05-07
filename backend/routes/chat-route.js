const express = require("express");
const { multerMiddleware } = require("../config/cloudinary-config");

const {
  authTokenVerifyMiddleware,
  checkAuthentication,
} = require("../middleware/auth-middleware");
const {
  sendMessage,
  getConversation,
  getMessage,
  markAsRead,
  deleteMessage,
} = require("../controllers/chat-controller");

const router = express.Router();

router.post(
  "/send-message",
  authTokenVerifyMiddleware,
  multerMiddleware,
  sendMessage,
);
router.get("/conversation", authTokenVerifyMiddleware, getConversation);
router.get(
  "/conversation/:conversationId/messages",
  authTokenVerifyMiddleware,
  getMessage,
);

router.put("/messages/read", authTokenVerifyMiddleware, markAsRead);
router.delete("/messages/:messageId", authTokenVerifyMiddleware, deleteMessage);
module.exports = router;
