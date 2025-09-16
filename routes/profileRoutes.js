import express from "express";
import {
  deleteAvatar,
  deleteCoverPic,
  setAccountType,
  updateProfile,
  uploadAvatar,
  uploadCoverPic,
} from "../controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { updateProfileValidation } from "../middlewares/validators/profileValidation.js";
import { handleValidationErrors } from "../middlewares/handleValidationErrors.js";
import upload from "../utils/multer.js";
import { getUserProfile } from "../controllers/userController.js";

const profileRoutes = express.Router();

// Update profile route
profileRoutes.post(
  "/update",
  authMiddleware,
  updateProfileValidation,
  handleValidationErrors,
  updateProfile
);

profileRoutes.put(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  uploadAvatar
);
profileRoutes.delete("/avatar/delete", authMiddleware, deleteAvatar);
profileRoutes.delete("/coverpic/delete", authMiddleware, deleteCoverPic);
profileRoutes.put(
  "/coverpic",
  authMiddleware,
  upload.single("coverpic"),
  uploadCoverPic
);

profileRoutes.put("/setAccountType", authMiddleware, setAccountType);

profileRoutes.get("/getUserProfile/:id", authMiddleware, getUserProfile);

export default profileRoutes;
