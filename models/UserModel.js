import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: false, default: "" },
    bio: { type: String, default: "Hey there! I am using InstaUp." },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // hash before saving
    verifyOtp: { type: String, default: "" },
    verifyOtpExpireAt: { type: Date, default: null },
    isAccountVerified: { type: Boolean, default: false },
    resetOtp: { type: String, default: "" },
    resetOtpExpireAt: { type: Date, default: null },
    resetOtpVerified: { type: Boolean, default: false },
    googleId: { type: String, default: "" },
    avatar: { type: String, default: "" },
    profile_picture: { type: String, default: "" },
    profile_public_id: { type: String, default: "" }, // <-- NEW field to store Cloudinary public_id
    cover_picture: { type: String, default: "" },
    cover_public_id: { type: String, default: "" }, // <-- NEW field to store Cloudinary public_id
    location: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // added
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // added
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isPrivate: { type: Boolean, default: false }, // private account
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
  },
  { timestamps: true }
);

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;
