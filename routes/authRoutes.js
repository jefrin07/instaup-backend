import express from "express";
import {
  loginValidation,
  registerValidation,
} from "../middlewares/validators/authValidator.js";
import {
  checkVerification,
  forgotPassword,
  getCurrentUser,
  getUserProfile,
  login,
  logout,
  register,
  resendOtp,
  resetPassword,
  sendResetOtp,
  verifyEmail,
  verifyResetOtp,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { googleLogin } from "../controllers/googleController.js";

const authRoutes = express.Router();

authRoutes.post("/register", registerValidation, register);
authRoutes.post("/login", loginValidation, login);
authRoutes.post("/logout", logout);
authRoutes.post("/verify-email", verifyEmail);
authRoutes.post("/resend-Otp", resendOtp);
authRoutes.post("/check-verification", checkVerification);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.get("/me", authMiddleware, getCurrentUser);
authRoutes.get("/userdata", authMiddleware, getUserProfile);
authRoutes.post("/send-reset-otp", sendResetOtp);
authRoutes.post("/verify-reset-otp", verifyResetOtp);
authRoutes.post("/reset-password", resetPassword);
authRoutes.post("/google/callback", googleLogin);

export default authRoutes;
