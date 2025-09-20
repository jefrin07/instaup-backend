import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Post from "../models/Post.js";

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

// GET /api/profile/getUserInfo/:id
export const getUserInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id.toString();

  const otherUser = await userModel
    .findById(id)
    .select("-password")
    .populate("followers", "_id")
    .populate("following", "_id");

  if (!otherUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const isFollowing = otherUser.followers.some(
    (f) => f._id.toString() === currentUserId
  );
  const requestSent = otherUser.followRequests?.some(
    (f) => f._id.toString() === currentUserId
  );

  // Count total posts
  const totalPosts = await Post.countDocuments({ user: otherUser._id });

  res.status(200).json({
    success: true,
    user: {
      _id: otherUser._id,
      username: otherUser.username,
      name: otherUser.name,
      bio: otherUser.bio,
      profile_picture: otherUser.profile_picture,
      cover_picture: otherUser.cover_picture,
      isPrivate: otherUser.isPrivate,
      followersCount: otherUser.followers.length,
      followingCount: otherUser.following.length,
      isFollowing,
      requestSent,
      totalPosts, // include totalPosts for frontend
    },
  });
});

// GET /api/profile/getUserPosts/:id?page=1&limit=5
export const getUserPosts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const currentUserId = req.user._id.toString();

  const user = await userModel.findById(id).populate("followers", "_id");
  if (!user) return res.status(404).json({ message: "User not found" });

  // Check privacy
  const isFollowing = user.followers.some(
    (f) => f._id.toString() === currentUserId
  );
  if (user.isPrivate && !isFollowing) {
    return res.status(403).json({ message: "Cannot view posts" });
  }

  // Count total posts
  const totalPosts = await Post.countDocuments({ user: id });

  // Fetch paginated posts
  const posts = await Post.find({ user: id })
    .populate("user", "username name profile_picture")
    .populate("comments.user", "username name profile_picture")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Sort comments newest → oldest
  posts.forEach((post) => {
    if (Array.isArray(post.comments)) {
      post.comments.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else {
      post.comments = [];
    }
  });

  res.status(200).json({ posts, totalPosts });
});
