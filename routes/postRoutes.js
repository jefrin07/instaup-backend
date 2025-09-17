import express from "express";
import { addPost, getUserPosts } from "../controllers/postController.js";
import upload from "../utils/multer.js";
import { postValidation } from "../middlewares/validators/postValidation.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const postRoutes = express.Router();

postRoutes.post(
  "/add",
  authMiddleware,
  upload.array("images"),
  postValidation,
  addPost
);

postRoutes.get("/user/:userId", authMiddleware, getUserPosts);

export default postRoutes;
