const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    phoneSuffix: {
      type: String,
      default: null,
    },

    userName: {
      type: String,
      default: null,
    },

    email: {
      type: String,
      sparse: true,
      validate: {
        validator: (value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Invalid email format",
      },
    },

    emailOtp: String,
    emailOtpExpire: Date,

    profilePicture: String,
    about: String,

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Boolean, default: false },

    isVerified: { type: Boolean, default: false },
    agreed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
