import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();
const port = process.env.PORT || 4000;
connectDB();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend (Vite default port)
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => res.send("API Working"));
app.use("/api/auth", authRoutes);

app.use(errorHandler);

app.listen(port, () =>
  console.log(`Server Started on PORT http://localhost:${port}`)
);
