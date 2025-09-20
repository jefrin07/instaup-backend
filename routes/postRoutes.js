import express from "express";
import {
  addComment,
  addPost,
  deleteComment,
  deletePost,
  deletePostImage,
  getFeedPosts,
  getSinglePost,
  getUserPosts,
  likePost,
  updatePostContent,
  uploadPostImages,
} from "../controllers/postController.js";
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
postRoutes.delete("/delete/:postId", authMiddleware, deletePost);
postRoutes.get("/get/:postId", authMiddleware, getSinglePost);
postRoutes.delete("/:postId/image", authMiddleware, deletePostImage);

postRoutes.put("/update/:postId", authMiddleware, updatePostContent);

postRoutes.post(
  "/update/image/:postId",
  authMiddleware,
  upload.array("images"),
  uploadPostImages
);

postRoutes.post("/like", authMiddleware, likePost);
postRoutes.post("/addComment", authMiddleware, addComment);

postRoutes.delete(
  "/:postId/comments/:commentId",
  authMiddleware,
  deleteComment
);

postRoutes.get("/getFeedPosts", authMiddleware, getFeedPosts);

export default postRoutes;
