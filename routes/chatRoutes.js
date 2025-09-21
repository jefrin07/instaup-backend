import express from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  getChat,
  getFollowingUsers,
  markMsg,
  sendMsg,
} from "../controllers/chatController.js";
import upload from "../utils/multer.js";

const chatRoutes = express.Router();

// Update profile route
chatRoutes.get("/getFollowingUsers", authMiddleware, getFollowingUsers);
chatRoutes.get("/getChat/:userId", authMiddleware, getChat);
chatRoutes.put("/mark/:msgId", authMiddleware, markMsg);
chatRoutes.post(
  "/sendMsg/:userId",
  authMiddleware,
  upload.array("files"),
  sendMsg
);

export default chatRoutes;
