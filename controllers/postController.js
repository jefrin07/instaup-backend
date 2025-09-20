// controllers/postController.js
import userModel from "../models/UserModel.js";
import Post from "../models/Post.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";
import cloudinary from "../utils/cloudinary.js";
import mongoose from "mongoose";

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
    image_urls = results.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
    }));
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const totalPosts = await Post.countDocuments({ user: userId });

  let posts = await Post.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "name username profile_picture")
    .populate("comments.user", "name username profile_picture")
    .lean();

  // Sort comments latest-first
  posts.forEach((post) => {
    if (Array.isArray(post.comments)) {
      post.comments = post.comments.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else {
      post.comments = [];
    }
  });

  res.status(200).json({
    success: true,
    page,
    limit,
    totalPosts,
    totalPages: Math.ceil(totalPosts / limit),
    hasMore: page * limit < totalPosts,
    posts,
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!postId) {
    return res.status(400).json({ message: "Post ID is required" });
  }

  const post = await Post.findById(postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Only the owner can delete the post
  if (post.user.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not allowed to delete this post" });
  }

  // 🗑️ Delete images from Cloudinary (if any)
  if (post.image_urls && post.image_urls.length > 0) {
    const deletePromises = post.image_urls.map((img) =>
      cloudinary.uploader.destroy(img.public_id)
    );
    await Promise.all(deletePromises);
  }

  // 🗑️ Delete post from DB
  await post.deleteOne();

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
    postId,
  });
});

export const getSinglePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!postId) {
    return res.status(400).json({ message: "Post ID is required" });
  }

  const post = await Post.findById(postId)
    .populate("user", "name username profile_picture")
    .lean();

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.status(200).json({
    success: true,
    post,
  });
});

export const deletePostImage = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { public_id } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!postId || !public_id) {
    return res
      .status(400)
      .json({ message: "Post ID and public_id are required" });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Only the owner can delete
  if (post.user.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not allowed to modify this post" });
  }

  // Check if image exists in post
  const image = post.image_urls.find((img) => img.public_id === public_id);
  if (!image) {
    return res.status(404).json({ message: "Image not found in this post" });
  }

  // 1. Delete from Cloudinary
  await cloudinary.uploader.destroy(public_id);

  // 2. Remove from MongoDB
  post.image_urls = post.image_urls.filter(
    (img) => img.public_id !== public_id
  );
  await post.save();

  res.status(200).json({
    success: true,
    message: "Image deleted successfully",
    post,
  });
});

export const updatePostContent = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }

  const post = await Post.findById(postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Optional: Ensure only the owner can update
  if (post.user.toString() !== req.user._id.toString()) {
    return res.status(401).json({ message: "Not authorized" });
  }

  post.content = content;
  await post.save();

  res.status(200).json({
    success: true,
    message: "Post content updated",
    post,
  });
});

export const uploadPostImages = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Ensure only owner can upload
  if (post.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not allowed to update this post" });
  }

  const images = req.files || [];
  if (images.length === 0) {
    return res.status(400).json({ message: "No images provided" });
  }

  // Upload each image to Cloudinary
  const uploadPromises = images.map((file) =>
    uploadFromBuffer(file.buffer, "posts")
  );
  const results = await Promise.all(uploadPromises);

  // Add uploaded images to post
  const newImages = results.map((r) => ({
    url: r.secure_url,
    public_id: r.public_id,
  }));

  post.image_urls.push(...newImages);
  await post.save();

  res.status(200).json({
    success: true,
    message: "Images uploaded successfully",
    images: newImages,
    post,
  });
});

export const likePost = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const { postId } = req.body;
  const userId = req.user._id;

  const post = await Post.findById(postId).populate("user", "username avatar");
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  let action = "";

  if (post.likes.some((user) => user.toString() === userId.toString())) {
    // Unlike
    post.likes = post.likes.filter(
      (user) => user.toString() !== userId.toString()
    );
    action = "unliked";
  } else {
    // Like
    post.likes.push(userId);
    action = "liked";
  }

  await post.save();

  return res.status(200).json({
    success: true,
    message: `Post ${action}`,
    post, // send back updated post
    likesCount: post.likes.length, // optional for quick UI updates
  });
});

export const addComment = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const { postId, text } = req.body;

  if (!text || text.trim() === "") {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  let post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const newComment = {
    user: req.user._id,
    text,
    createdAt: new Date(),
  };

  post.comments.push(newComment);
  await post.save();

  // 🔄 Re-fetch with populated comments
  post = await Post.findById(postId).populate(
    "comments.user",
    "name username profile_picture"
  );

  post.comments = post.comments.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.status(201).json({
    success: true,
    message: "Comment added",
    comments: post.comments,
  });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    return res.status(400).json({ message: "Invalid Post ID or Comment ID" });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // Find the comment
  const comment = post.comments.find((c) => c._id.toString() === commentId);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  const currentUserId = req.user._id.toString();
  const isCommentOwner = comment.user.toString() === currentUserId;
  const isPostOwner = post.user.toString() === currentUserId;

  if (!isCommentOwner && !isPostOwner) {
    return res
      .status(403)
      .json({ message: "You are not allowed to delete this comment" });
  }

  // Remove the comment
  post.comments = post.comments.filter((c) => c._id.toString() !== commentId);
  await post.save();

  // Populate comments for response
  const updatedPost = await Post.findById(postId)
    .populate("comments.user", "name username profile_picture")
    .lean();

  // Sort comments newest → oldest
  updatedPost.comments = updatedPost.comments.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
    comments: updatedPost.comments,
  });
});

export const getFeedPosts = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get following list
  const user = await userModel.findById(req.user._id).select("following");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const followingIds = [...user.following, req.user._id];

  // Fetch posts (limit + 1 trick for hasMore)
  let posts = await Post.find({ user: { $in: followingIds } })
    .populate("user", "name username profile_picture")
    .populate("comments.user", "name username profile_picture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .lean();

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  // Sort comments (latest first)
  posts = posts.map((post) => {
    if (Array.isArray(post.comments)) {
      post.comments.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    return post;
  });

  res.status(200).json({
    success: true,
    page,
    limit,
    hasMore,
    posts,
  });
});
