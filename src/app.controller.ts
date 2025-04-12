import express, { Application } from "express";
import { errorHandler } from "./utils/errorHandling";
import cookieParser from "cookie-parser";
import redis from "./utils/redis";
import apiRouter from "./index.Routes";
import { ApiDocumentation, NODE_ENV, PORT } from "./config/env";
import { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import compression from "compression";
import http, { Server } from "http";
import SocketManager from "./socket/socket";
import { Server as SocketIOServer } from "socket.io";
import userModel from "./DB/models/user.model";
import courseModel from "./DB/models/courses.model";

const app: Application = express();
const server = http.createServer(app);
app.use(compression({ level: 6, memLevel: 8, threshold: 0 }));
app.use(cookieParser());
app.use(express.json());

const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    credentials: true,
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4200",
    ],
  })
);
app.use(express.urlencoded({ extended: true }));

redis;

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// app.use(NODE_ENV == "dev" ? morgan("dev") : morgan("combined"));

// API routes
app.use("/api/v1", apiRouter);

app.get("/", (req: Request, res: Response): any => {
  return res.json({
    message: "welcome to our Application",
    ApiDocumentation: ApiDocumentation,
  });
});

// Handle invalid routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Invalid URL or Method" });
});

app.use(errorHandler);

// Socket.io Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Initialize socket manager
SocketManager.initialize(io);

export default server;
