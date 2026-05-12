const User = require("../models/user");
const sendToEmail = require("../services/email-services");
const otpGenerate = require("../utils/otp-generator");
const response = require("../utils/response-handler");
const phoneTwilioService = require("../services/twilio-phone-services");
const generateToken = require("../utils/generate-token");
const { uploadFileToCloudinary } = require("../config/cloudinary-config");
const Conversation = require("../models/conversation");

const sendOtp = async (req, res) => {
  const { email, phoneNumber, phoneSuffix } = req.body;
  const otp = otpGenerate();
  const expire = new Date(Date.now() + 5 * 60 * 1000);
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          email,
          phoneNumber: null,
          phoneSuffix: null,
        });
      }
      user.emailOtp = otp;
      user.emailOtpExpire = expire;
      await user.save();
      await sendToEmail(email, otp);
      return response(res, 200, "Otp send to your email", user);
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Please number and phone suffix are requierd");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber, phoneSuffix, email: null });
    }
    await user.save();
    await phoneTwilioService.sendOtpToPhoneNumber(fullPhoneNumber);

    return response(res, 200, "Otp send successfully", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const verifyOtp = async (req, res) => {
  const { email, phoneNumber, phoneSuffix, otp } = req.body;
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 400, "User not found");
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > user.emailOtpExpire
      ) {
        return response(res, 400, "Invalid and expired otp");
      }
      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpire = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone Number and Phone Suffix are required");
      }
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

      user = await User.findOne({ phoneNumber });
      if (!user) {
        return response(res, 400, "User not found");
      }
      const result = await phoneTwilioService.verifyPhoneOtp(
        fullPhoneNumber,
        otp,
      );
      if (result.status !== "approved") {
        return response(res, 400, "Otp invalid");
      }
      user.isVerified = true;
      await user.save();
    }
    const token = generateToken(user?._id);

    return response(res, 200, "Otp verified successfuly", { user, token });
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const updateProfile = async (req, res) => {
  const { username, about, agreed } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePicture = uploadResult?.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }
    if (username) user.userName = username;
    if (about) user.about = about;
    if (agreed) user.agreed = agreed;
    await user.save();

    return response(res, 200, "user profile updated successfuly", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const logout = (req, res) => {
  try {
    return response(res, 200, "user logout successfuly");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const getAllUser = async (req, res) => {
  const loggedInUser = req.user.userId;

  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select(
        "userName profilePicture isOnline lastSeen about phoneNumber phoneSuffix",
      )
      .lean();

    const userWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver",
          })
          .lean();
        return { ...user, conversation: conversation || null };
      }),
    );

    return response(
      res,
      200,
      "Users retrieved successfully",
      userWithConversation,
    );
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

module.exports = { sendOtp, verifyOtp, updateProfile, logout, getAllUser };
