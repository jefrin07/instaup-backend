import express from "express";
import upload from "../utils/multer.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { storyValidation } from "../middlewares/validators/storyValidation.js";
import {
  addStory,
  deleteStory,
  getStories,
  toggleLikeStory,
  viewStory,
} from "../controllers/storyController.js";

const storyRoutes = express.Router();

storyRoutes.post(
  "/addstory",
  authMiddleware,
  upload.array("image"),
  storyValidation,
  addStory
);
storyRoutes.get("/getStories", authMiddleware, getStories);

storyRoutes.put("/toggleLikeStory/:storyId", authMiddleware, toggleLikeStory);
storyRoutes.put("/viewStory/:storyId", authMiddleware, viewStory);
storyRoutes.delete("/deleteStory/:storyId", authMiddleware, deleteStory);

export default storyRoutes;
