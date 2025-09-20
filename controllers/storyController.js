import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";
import Story from "../models/Story.js";
import { inngest } from "../inngest/index.js";
import cloudinary from "../utils/cloudinary.js";

export const addStory = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const content = req.body?.content || "";
  const story_type = req.body?.story_type;
  const images = Array.isArray(req.files) ? req.files : [];

  let image_urls = [];
  if (images.length > 0) {
    const results = await Promise.all(
      images.map((file) => uploadFromBuffer(file.buffer, "stories"))
    );
    image_urls = results.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
    }));
  }

  const story = await Story.create({
    user: req.user._id, // already available from auth middleware
    content,
    bg_color: req.body?.bg_color || null,
    image_urls,
    story_type,
  });

  await inngest.send({
    name: "app/story.delete",
    data: { storyId: story._id },
  });

  await story.populate("user", "_id name profile_picture");

  res.status(201).json({
    success: true,
    message: "Story created successfully",
    story,
  });
});

export const getStories = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  const userIds = [user._id, ...user.following];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const stories = await Story.find({
    user: { $in: userIds },
    createdAt: { $gte: cutoff },
  })
    .populate("user", "name profile_picture") // only needed fields
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: stories.length,
    stories,
  });
});

export const toggleLikeStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId);
  if (!story) return res.status(404).json({ message: "Story not found" });

  const userId = req.user._id;
  const alreadyLiked = story.likes.some((id) => id.equals(userId));

  if (alreadyLiked) {
    story.likes.pull(userId);
    await story.save();
    return res.json({
      success: true,
      message: "Unliked story",
      likes: story.likes.length,
    });
  }

  story.likes.push(userId);
  await story.save();
  res.json({
    success: true,
    message: "Liked story",
    likes: story.likes.length,
  });
});

export const viewStory = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const storyId = req.params.storyId;
  const story = await Story.findById(storyId).populate(
    "view_count",
    "name profile_picture"
  ); // populate user info
  if (!story) {
    return res.status(404).json({ message: "Story not found" });
  }

  // Check if the current user has already viewed the story
  const alreadyViewed = story.view_count.some((u) =>
    u._id.equals(req.user._id)
  );
  if (!alreadyViewed) {
    story.view_count.push(req.user._id);
    await story.save();

    // Re-populate to include the newly added user
    await story.populate("view_count", "name profile_picture");
  }

  // Filter out the story owner
  const viewers = story.view_count.filter((u) => !u._id.equals(story.user));

  res.json({
    success: true,
    message: "Story viewed",
    views: viewers.length,
    viewers, // array of user objects excluding story owner
  });
});

export const deleteStory = asyncHandler(async (req, res) => {
  const { storyId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const story = await Story.findById(storyId);
  if (!story) {
    return res.status(404).json({ message: "Story not found" });
  }

  // Only the owner can delete
  if (story.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Forbidden: Not story owner" });
  }

  // Delete images from cloud storage
  if (story.image_urls && story.image_urls.length > 0) {
    await Promise.all(
      story.image_urls.map((img) => cloudinary.uploader.destroy(img.public_id))
    );
  }

  // Delete the story from DB
  await Story.deleteOne({ _id: storyId }); // <-- Use deleteOne instead of story.remove()

  res.status(200).json({
    success: true,
    message: "Story deleted successfully",
    storyId,
  });
});
