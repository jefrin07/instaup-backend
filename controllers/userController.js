import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Discover users
export const discoverUsers = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not authorized" });

  const currentUser = await userModel
    .findById(req.user._id)
    .select("-password");

  if (!currentUser) return res.status(404).json({ message: "User not found" });

  const { input } = req.body || {};
  let { page = 1, limit = 10 } = req.body || {};

  page = parseInt(page);
  limit = parseInt(limit);

  if (!input || input.trim() === "") {
    return res
      .status(200)
      .json({ message: "No input provided", users: [], total: 0 });
  }

  const query = {
    $or: [
      { username: { $regex: input, $options: "i" } },
      { email: { $regex: input, $options: "i" } },
      { name: { $regex: input, $options: "i" } },
      { location: { $regex: input, $options: "i" } },
    ],
    _id: { $ne: currentUser._id }, // exclude current user
  };

  const total = await userModel.countDocuments(query);

  const allUsers = await userModel
    .find(query)
    .select(
      "username email name location avatar profile_picture cover_picture followers following followRequests isPrivate"
    )
    .skip((page - 1) * limit)
    .limit(limit);

  const users = allUsers.map((user) => {
    const isFollowing = currentUser.following.includes(user._id);
    const requestSent = user.followRequests.includes(currentUser._id);
    const followingYou = user.following.includes(currentUser._id);
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      location: user.location,
      avatar: user.avatar,
      profile_picture: user.profile_picture,
      cover_picture: user.cover_picture,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isPrivate: user.isPrivate,
      isFollowing,
      requestSent,
      followingYou,
    };
  });

  res.status(200).json({
    message: "Users fetched successfully",
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// Follow user
export const followUser = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const { followid } = req.body;

  if (!followid || followid === currentUserId)
    return res.status(400).json({ message: "Invalid follow request" });

  const [currentUser, userToFollow] = await Promise.all([
    userModel.findById(currentUserId),
    userModel.findById(followid),
  ]);

  if (!userToFollow) return res.status(404).json({ message: "User not found" });

  if (currentUser.following.includes(followid))
    return res.status(400).json({ message: "You already follow this user" });

  if (userToFollow.isPrivate) {
    if (userToFollow.followRequests.includes(currentUserId))
      return res.status(400).json({ message: "Follow request already sent" });

    userToFollow.followRequests.push(currentUserId);
    await userToFollow.save();

    return res.status(200).json({
      message: "Follow request sent. Waiting for approval.",
      currentUser,
    });
  }

  currentUser.following.push(followid);
  userToFollow.followers.push(currentUserId);

  await Promise.all([currentUser.save(), userToFollow.save()]);
  res.status(200).json({ message: "User followed successfully" });
});

// Unfollow user
export const unfollowUser = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const { followid } = req.body;

  if (!followid || followid === currentUserId)
    return res.status(400).json({ message: "Invalid unfollow request" });

  const [currentUser, userToUnfollow] = await Promise.all([
    userModel.findById(currentUserId),
    userModel.findById(followid),
  ]);

  if (!currentUser.following.includes(followid))
    return res.status(400).json({ message: "You are not following this user" });

  currentUser.following = currentUser.following.filter(
    (id) => id.toString() !== followid
  );
  userToUnfollow.followers = userToUnfollow.followers.filter(
    (id) => id.toString() !== currentUserId
  );

  await Promise.all([currentUser.save(), userToUnfollow.save()]);
  res.status(200).json({ message: "User unfollowed successfully" });
});

// Cancel follow request
export const cancelFollowRequest = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const { followid } = req.body;

  if (!followid || followid === currentUserId)
    return res.status(400).json({ message: "Invalid request" });

  const userToCancel = await userModel.findById(followid);

  if (!userToCancel.followRequests.includes(currentUserId))
    return res.status(400).json({ message: "No follow request to cancel" });

  userToCancel.followRequests = userToCancel.followRequests.filter(
    (id) => id.toString() !== currentUserId
  );
  await userToCancel.save();

  res.status(200).json({ message: "Follow request canceled successfully" });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id.toString();

  const otheruser = await userModel
    .findById(id)
    .select("-password")
    .populate("followers", "username name profile_picture")
    .populate("following", "username name profile_picture");

  if (!otheruser) {
    return res.status(404).json({ message: "User not found" });
  }

  let isFollowing = otheruser.followers.some(
    (f) => f._id.toString() === currentUserId
  );

  let requestSent = otheruser.followRequests?.some(
    (f) => f._id.toString() === currentUserId
  );

  // If profile is private and not following → hide posts
  let responseUser = {
    _id: otheruser._id,
    username: otheruser.username,
    name: otheruser.name,
    bio: otheruser.bio,
    profile_picture: otheruser.profile_picture,
    cover_picture: otheruser.cover_picture,
    isPrivate: otheruser.isPrivate,
    followersCount: otheruser.followers.length,
    followingCount: otheruser.following.length,
    isFollowing,
    requestSent,
  };

  if (!otheruser.isPrivate || isFollowing) {
    // Only include posts if profile is public OR you follow them
    responseUser.posts = otheruser.posts || [];
  }

  res.status(200).json({
    success: true,
    user: responseUser,
  });
});

