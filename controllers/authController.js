import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import userModel from "../models/UserModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";
import { inngest } from "../inngest/index.js";

export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  // 2. Check if user already exists
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already in use" });
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  // 5. Create user
  const newUser = new userModel({
    name,
    email,
    password: hashedPassword,
    verifyOtp: otp,
    verifyOtpExpireAt: otpExpiry,
    role: role || "user",
    isAccountVerified: false,
  });

  await newUser.save();

  // 6. Try sending verification email
  try {
    await transporter.sendMail({
      from: `"InstaUp" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Welcome! Verify your email",
      text: `Hi ${name},\n\nThanks for registering! 🎉\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nRegards,\nMy App Team`,
    });
  } catch (err) {
    console.error("Email sending failed:", err.message);
    await userModel.findByIdAndDelete(newUser._id);
    return res.status(500).json({
      message:
        "Registration failed: could not send verification email. Please try again.",
    });
  }
  res.status(201).json({
    message: "User registered successfully. Verification email sent.",
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Find user
  const user = await userModel.findOne({ email });
  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only HTTPS in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // prevent CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  await inngest.send({
    name: "user/logged.in",
    data: {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      timestamp: new Date().toISOString(),
    },
  });

  res.status(200).json({
    message: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // prevent CSRF
  });

  res.status(200).json({ message: "Logged out successfully" });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isAccountVerified) {
    return res.status(400).json({ message: "Account already verified" });
  }

  if (!user.verifyOtp || !user.verifyOtpExpireAt) {
    return res
      .status(400)
      .json({ message: "No OTP found. Please request a new one." });
  }

  if (Date.now() > user.verifyOtpExpireAt) {
    return res
      .status(400)
      .json({ message: "OTP has expired. Please request a new one." });
  }

  if (user.verifyOtp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // ✅ Verification successful
  user.isAccountVerified = true;
  user.verifyOtp = "";
  user.verifyOtpExpireAt = null;
  await user.save();

  res.status(200).json({ message: "Email verified successfully!" });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

export const sendResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Expiry (15 min)
  const expireAt = Date.now() + 15 * 60 * 1000;

  // Save OTP in DB
  user.resetOtp = otp;
  user.resetOtpExpireAt = expireAt;
  await user.save();

  try {
    await transporter.sendMail({
      from: `"InstaUp" <${process.env.SMTP_EMAIL}>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hello ${user.name || "User"},</h2>
          <p>You requested a password reset. Use the OTP below:</p>
          <h1 style="color:#F84565; letter-spacing: 3px;">${otp}</h1>
          <p>This OTP will expire in <strong>15 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>— InstaUp Team</p>
        </div>
      `,
    });

    return res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Email sending failed:", err.message);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.resetOtpVerified) {
    return res.status(400).json({
      message: "OTP already verified. You can reset your password now.",
    });
  }

  if (
    user.resetOtp !== otp ||
    !user.resetOtpExpireAt ||
    user.resetOtpExpireAt < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Mark OTP as verified
  user.resetOtpVerified = true;
  await user.save();

  return res.status(200).json({ message: "OTP verified successfully" });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({
    user: req.user, // contains all safe user data except password
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isAccountVerified) {
    return res.status(400).json({ message: "Account already verified" });
  }

  // 1. Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  // 2. Update user with new OTP
  user.verifyOtp = otp;
  user.verifyOtpExpireAt = otpExpiry;
  await user.save();
  try {
    await transporter.sendMail({
      from: `"InstaUp" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Your new verification code",
      text: `Hi ${user.name},\n\nHere’s your new 6-digit verification code: ${otp}\n\nThis code will expire in 10 minutes.\n\nRegards,\nMy App Team`,
    });

    res.status(200).json({
      message: "New OTP sent successfully. Please check your email.",
    });
  } catch (err) {
    console.error("Resend OTP email failed:", err.message);
    return res.status(500).json({
      message: "Failed to send OTP. Please try again later.",
    });
  }
});

export const checkVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    email: user.email,
    isAccountVerified: user.isAccountVerified,
  });
});

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate reset token
  const resetToken = Math.random().toString(36).substring(2);
  const resetTokenExpire = Date.now() + 10 * 60 * 1000;

  user.resetOtp = resetToken;
  user.resetOtpExpireAt = resetTokenExpire;
  await user.save();

  // Send reset link with email and token
  const resetLink = `${
    process.env.CLIENT_URL
  }/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;

  try {
    await transporter.sendMail({
      from: `"InstaUp" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      
      <a href="${resetLink}" 
         style="display: inline-block; padding: 12px 20px; margin: 15px 0; background-color: #F84565; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Reset Password
      </a>
      
      <p>This link will expire in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
      
      <p style="margin-top: 20px;">— The InstaUp Team</p>
    </div>
  `,
    });

    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Email send failed:", err.message);
    user.resetOtp = null;
    user.resetOtpExpireAt = null;
    await user.save();
    res.status(500).json({ message: "Failed to send reset email" });
  }
};

export const resetPassword = async (req, res) => {
  const { email, token, newPassword, confirmPassword } = req.body;

  if (!email || !token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const user = await userModel.findOne({
    email,
    resetOtp: token,
    resetOtpExpireAt: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;

  // Clear reset token
  user.resetOtp = null;
  user.resetOtpExpireAt = null;

  await user.save();

  res.status(200).json({ message: "Password reset successfully!" });
};
