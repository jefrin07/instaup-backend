import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    content: { type: String, trim: true },
    bg_color: { type: String },

    image_urls: [
      {
        url: { type: String },
        public_id: { type: String }, // Cloudinary public_id
      },
    ],
    story_type: {
      type: String,
      enum: ["text", "image"],
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    view_count: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true, minimize: false }
);

const Story = mongoose.model("Story", storySchema);

export default Story;
