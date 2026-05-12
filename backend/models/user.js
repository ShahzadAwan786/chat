const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, unique: true, sparse: true },
    phoneSuffix: { type: String, default: null },
    userName: { type: String, default: null },

    email: {
      type: String,
      sparse: true,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      },
    },

    emailOtp: String,
    emailOtpExpire: Date,

    profilePicture: String,
    about: String,

    isOnline: { type: Boolean, default: false },

    lastSeen: { type: Date, default: null },

    isVerified: { type: Boolean, default: false },
    agreed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
