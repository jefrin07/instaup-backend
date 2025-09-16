import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  acceptFollowRequest,
  getConnections,
  rejectFollowRequest,
} from "../controllers/connectionController.js";

const connectionRouter = express.Router();

connectionRouter.get("/", authMiddleware, getConnections);
connectionRouter.post("/accept-request", authMiddleware, acceptFollowRequest);
connectionRouter.post("/reject-request", authMiddleware, rejectFollowRequest);

export default connectionRouter;
