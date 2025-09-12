import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { functions, inngest } from "./inngest/index.js";
import { serve } from "inngest/express";

const app = express();
const port = process.env.PORT || 4000;
const origin = process.env.CLIENT_URL;
connectDB();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: origin, // your frontend (Vite default port)
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => res.send("API Working"));
app.use("/api/auth", authRoutes);
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(errorHandler);

app.listen(port, () =>
  console.log(`Server Started on PORT http://localhost:${port}`)
);
