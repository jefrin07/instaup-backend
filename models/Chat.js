import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, trim: true },
    image_urls: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    seen: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false }
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
