const { uploadFileToCloudinary } = require("../config/cloudinary-config");
const response = require("../utils/response-handler");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Status = require("../models/status");

const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const file = req.file;

    const userId = req.user.userId;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }
      mediaUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    const status = await Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiredAt,
    });
    await status.save();

    const populateStatus = await Status.findById(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    if (req.io && req.socketUserMap) {
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("new_status", populateStatus);
        }
      }
    }

    return response(res, 200, "status created successfully", populateStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const getStatus = async (req, res) => {
  try {
    const status = await Status.find({ expiredAt: { $gt: new Date() } })
      .populate("user", "userName profilePicture")
      .populate("viewers", "userName profilePicture")
      .sort({ createdAt: -1 });
    return response(res, 200, "status retrived successfully", status);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    console.log(status);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updateStatus = await Status.findById(statusId)
        .populate("user", "userName profilePicture")
        .populate("viewers", "userName profilePicture");

      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString(),
        );
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViewers: updateStatus.viewers.length,
            viewers: updateStatus.viewers,
          };
          res.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        } else {
          console.log("Status owner not connected");
        }
      }
    } else {
      console.log("user already view status");
    }
    return response(res, 200, "status view successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (!status.user.toString() !== userId) {
      return response(res, 403, "No authorized to delete this status");
    }
    await status.deleteOne();
    if (req.io && req.socketUserMap) {
      for (const [connectingUserId, socketId] of req.socketUserMap) {
        if (connectingUserId !== userId) {
          req.io.to(socketId).emit("status_delete", statusId);
        }
      }
    }
    return response(res, 200, "Status delete successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

module.exports = {
  createStatus,
  getStatus,
  viewStatus,
  deleteStatus,
};
