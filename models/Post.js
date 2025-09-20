import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true },
    image_urls: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true }, // store Cloudinary public_id
      },
    ],
    post_type: {
      type: String,
      enum: ["text", "image", "text_with_image"],
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, minimize: false }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
