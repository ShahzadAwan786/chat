const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
