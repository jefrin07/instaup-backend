import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import userModel from "../models/UserModel.js";
import { sendEmail } from "../utils/sendEmail.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Google token is required" });
  }

  try {
    // 1. Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // 2. Find user by email
    let user = await userModel.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // New Google user → create
      user = await userModel.create({
        googleId: sub,
        name,
        email,
        avatar: picture,
        password: null,
        isAccountVerified: true,
        role: "user",
      });
      isNewUser = true;
    } else {
      // Existing normal user → link Google account
      if (!user.googleId) {
        user.googleId = sub;
      }
      if (!user.avatar) {
        user.avatar = picture;
      }
      if (!user.isAccountVerified) {
        user.isAccountVerified = true; // auto-verify if using Google
      }
      await user.save();
    }

    // 3. Send welcome email (only if new user)
    if (isNewUser) {
      try {
        await sendEmail({
          to: email,
          subject: "Welcome to InstaUp 🎉",
          html: `
            <h2>Hi ${name},</h2>
            <p>Welcome to <strong>InstaUp</strong>! 🎉</p>
            <p>Your Google account has been successfully linked and your profile is ready.</p>
            <p>We’re excited to have you on board 🚀</p>
            <br/>
            <p>Cheers,</p>
            <p>The InstaUp Team</p>
          `,
        });
      } catch (emailErr) {
        console.error("❌ Failed to send welcome email:", emailErr.message);
        // don’t block login if email fails
      }
    }

    // 4. Generate JWT
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Set cookie
    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 6. Respond
    res.status(200).json({
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err.message);
    return res.status(401).json({ message: "Invalid Google token" });
  }
});
