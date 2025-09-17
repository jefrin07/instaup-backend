// controllers/postController.js
import userModel from "../models/UserModel.js";
import Post from "../models/Post.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";

export const addPost = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const user = await userModel.findById(req.user._id);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const content = req.body?.content || "";
  const post_type = req.body?.post_type; // set by validation middleware
  const images = req.files || [];
  let image_urls = [];

  if (images.length > 0) {
    const uploadPromises = images.map((file) =>
      uploadFromBuffer(file.buffer, "posts")
    );
    const results = await Promise.all(uploadPromises);
    image_urls = results.map((r) => r.secure_url);
  }

  const post = new Post({
    user: user._id,
    content,
    image_urls,
    post_type,
  });

  const createdPost = await post.save();

  res.status(201).json({
    success: true,
    message: "Post created successfully",
    post: createdPost,
  });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  const posts = await Post.find({ user: userId })
    .sort({ createdAt: -1 }) // newest first
    .populate("user", "name username profile_picture") // populate the user details
    .lean();
  res.status(200).json({
    success: true,
    posts,
  });
});
