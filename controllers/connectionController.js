import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ===============================
// Get all connections
// ===============================
export const getConnections = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const currentUser = await userModel
    .findById(currentUserId)
    .populate("followers", "username name bio profile_picture")
    .populate("following", "username name bio profile_picture")
    .populate("followRequests", "username name bio profile_picture");

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    success: true,
    followers: currentUser.followers,
    following: currentUser.following,
    pending: currentUser.followRequests,
  });
});

// ===============================
// Accept a follow request
// ===============================
export const acceptFollowRequest = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const { requesterId } = req.body;

  if (!requesterId || requesterId === currentUserId) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const [currentUser, requester] = await Promise.all([
    userModel.findById(currentUserId),
    userModel.findById(requesterId),
  ]);

  if (!currentUser || !requester) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if request exists
  if (!currentUser.followRequests.includes(requesterId)) {
    return res.status(400).json({ message: "No follow request found" });
  }

  // Remove from pending requests
  currentUser.followRequests = currentUser.followRequests.filter(
    (id) => id.toString() !== requesterId
  );

  // Add to followers/following (no duplicates)
  if (!currentUser.followers.includes(requesterId)) {
    currentUser.followers.push(requesterId);
  }
  if (!requester.following.includes(currentUserId)) {
    requester.following.push(currentUserId);
  }

  await Promise.all([currentUser.save(), requester.save()]);

  res.status(200).json({
    success: true,
    message: "Follow request accepted",
    followers: currentUser.followers,
    following: requester.following,
  });
});

// ===============================
// Reject a follow request
// ===============================
export const rejectFollowRequest = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const { requesterId } = req.body;

  if (!requesterId || requesterId === currentUserId) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const currentUser = await userModel.findById(currentUserId);

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!currentUser.followRequests.includes(requesterId)) {
    return res.status(400).json({ message: "No follow request found" });
  }

  // Remove from pending requests
  currentUser.followRequests = currentUser.followRequests.filter(
    (id) => id.toString() !== requesterId
  );

  await currentUser.save();

  res.status(200).json({
    success: true,
    message: "Follow request rejected",
    pending: currentUser.followRequests,
  });
});
