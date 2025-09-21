import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { functions, inngest } from "./inngest/index.js";
import { serve } from "inngest/express";
import profileRoutes from "./routes/profileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import connectionRouter from "./routes/connectionsRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { Server } from "socket.io";
import http from "http";

const port = process.env.PORT || 4000;
const origin = process.env.CLIENT_URL;
const app = express();

const server = http.createServer(app); // wrap express in http server

// ✅ Attach socket.io
export const io = new Server(server, {
  cors: {
    origin: origin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`User Connected: ${userId}`);

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // notify all clients about online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${userId}`);
    if (userId) {
      delete userSocketMap[userId];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// ✅ Database
connectDB();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => res.send("API Working"));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/user", userRoutes);
app.use("/api/connections", connectionRouter);
app.use("/api/post", postRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(errorHandler);

// ✅ IMPORTANT: Use server.listen, not app.listen
server.listen(port, () =>
  console.log(`Server Started on PORT http://localhost:${port}`)
);
