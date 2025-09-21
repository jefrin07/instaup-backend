import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Chat from "../models/Chat.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";
import { io, userSocketMap } from "../server.js";

// Mark message as seen
export const markMsg = asyncHandler(async (req, res) => {
  const { msgId } = req.params;
  const userId = req.user._id;
  const message = await Chat.findById(msgId);

  if (!message) {
    return res
      .status(404)
      .json({ success: false, message: "Message not found" });
  }
  if (message.receiverId.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  message.seen = true;
  await message.save();

  res.status(200).json({
    success: true,
    message: "Message marked as seen",
    updatedMessage: message,
  });
});

// Get list of following users with preview
export const getFollowingUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await userModel
    .findById(userId)
    .populate("following", "name username profile_picture");

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const followingWithPreview = await Promise.all(
    user.following.map(async (followedUser) => {
      const lastMessage = await Chat.findOne({
        $or: [
          { senderId: userId, receiverId: followedUser._id },
          { senderId: followedUser._id, receiverId: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();

      if (!lastMessage) {
        return {
          user: followedUser,
          preview: {
            message: "No messages yet",
            time: null,
            sentByMe: false,
            seen: undefined,
          },
        };
      }

      const isSentByCurrentUser =
        lastMessage.senderId.toString() === userId.toString();

      return {
        user: followedUser,
        preview: {
          message:
            lastMessage.text ||
            (lastMessage.image_urls?.length
              ? "📷 Photo"
              : "Unsupported message"),
          time: lastMessage.createdAt,
          sentByMe: isSentByCurrentUser,
          seen: isSentByCurrentUser ? lastMessage.seen : undefined,
        },
      };
    })
  );

  followingWithPreview.sort((a, b) => {
    const aTime = a.preview?.time ? new Date(a.preview.time).getTime() : 0;
    const bTime = b.preview?.time ? new Date(b.preview.time).getTime() : 0;
    return bTime - aTime;
  });

  res.status(200).json({
    success: true,
    count: followingWithPreview.length,
    chats: followingWithPreview,
  });
});

// Get chat messages with a specific user
export const getChat = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const { userId } = req.params;

  const otherUser = await userModel
    .findById(userId)
    .select("name username profile_picture");

  if (!otherUser)
    return res.status(404).json({ success: false, message: "User not found" });

  // Mark messages from other user as seen
  await Chat.updateMany(
    { senderId: userId, receiverId: currentUserId, seen: false },
    { $set: { seen: true } }
  );

  const messages = await Chat.find({
    $or: [
      { senderId: currentUserId, receiverId: userId },
      { senderId: userId, receiverId: currentUserId },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({ success: true, chatWith: otherUser, messages });
});

// Send a message
export const sendMsg = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const senderId = req.user._id;
  const receiverId = req.params.userId;

  if (!text && !req.files?.length) {
    return res
      .status(400)
      .json({ success: false, message: "Message is empty" });
  }

  let image_urls = [];
  if (req.files && req.files.length > 0) {
    const results = await Promise.all(
      req.files.map((file) => uploadFromBuffer(file.buffer, "chat"))
    );
    image_urls = results.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
    }));
  }

  const message = await Chat.create({
    senderId,
    receiverId,
    text: text || "",
    image_urls,
    seen: false,
  });

  // Emit to receiver
  const receiverSocketId = userSocketMap[receiverId];
  if (receiverSocketId) io.to(receiverSocketId).emit("New Message", message);

  // Emit to sender (for multi-tab updates)
  const senderSocketId = userSocketMap[senderId];
  if (senderSocketId) io.to(senderSocketId).emit("New Message", message);

  res.status(201).json({ success: true, message });
});
