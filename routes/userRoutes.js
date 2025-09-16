import express from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { cancelFollowRequest, discoverUsers, followUser, unfollowUser } from "../controllers/userController.js";

const userRoutes = express.Router();

// Update profile route
userRoutes.post("/discover", authMiddleware, discoverUsers);
userRoutes.post("/followUser", authMiddleware, followUser);
userRoutes.post("/unfollowUser", authMiddleware, unfollowUser);
userRoutes.post("/cancelFollowRequest", authMiddleware, cancelFollowRequest);

export default userRoutes;
