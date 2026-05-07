const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true },
    content: { type: String, require: true },
    contentType: {
      type: String,
      enum: ["img", "video", "text"],
      default: "text",
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    expiredAt: { type: Date },
  },
  { timestamps: true },
);

const Status = mongoose.model("Status", statusSchema);

module.exports = Status;
