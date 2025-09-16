import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../utils/cloudinary.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, username, bio, location } = req.body;
  if (!req.user) return res.status(401).json({ message: "Not authorized" });

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (name) user.name = name;
  if (username) user.username = username;
  if (bio) user.bio = bio;
  if (location) user.location = location;

  await user.save();

  // Exclude password from response
  const { password, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    message: "Profile updated successfully",
    user: userWithoutPassword,
  });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.profile_public_id) {
    await cloudinary.uploader.destroy(user.profile_public_id);
  }

  const result = await uploadFromBuffer(req.file.buffer, "avatars");

  user.profile_picture = result.secure_url;
  user.profile_public_id = result.public_id;
  await user.save();

  const { password, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    success: true,
    message: "Avatar uploaded successfully",
    user: userWithoutPassword,
  });
});

// ✅ Upload Cover Picture
export const uploadCoverPic = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.cover_public_id) {
    await cloudinary.uploader.destroy(user.cover_public_id);
  }

  const result = await uploadFromBuffer(req.file.buffer, "coverpicture");

  user.cover_picture = result.secure_url;
  user.cover_public_id = result.public_id;
  await user.save();

  const { password, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    success: true,
    message: "Cover picture uploaded successfully",
    user: userWithoutPassword,
  });
});

// DELETE Avatar Controller
export const deleteAvatar = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.profile_public_id) {
    await cloudinary.uploader.destroy(user.profile_public_id);
  }

  user.profile_picture = null;
  user.profile_public_id = null;
  await user.save();

  const { password, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    success: true,
    message: "Avatar deleted successfully",
    user: userWithoutPassword,
  });
});

export const deleteCoverPic = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.cover_public_id) {
    await cloudinary.uploader.destroy(user.cover_public_id);
  }

  user.cover_picture = null;
  user.cover_public_id = null;
  await user.save();

  const { password, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    success: true,
    message: "Cover picture deleted successfully",
    user: userWithoutPassword,
  });
});


export const setAccountType = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });

  const user = await userModel.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Toggle isPrivate
  user.isPrivate = !user.isPrivate;

  await user.save();

  const { password, ...userWithoutPassword } = user.toObject();

  res.status(200).json({
    success: true,
    message: `Account type updated to ${user.isPrivate ? "Private" : "Public"}`,
    user: userWithoutPassword,
  });
});
