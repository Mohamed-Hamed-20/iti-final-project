import { Request, Response, NextFunction } from "express";
import app from "./app.controller";
import { database } from "./DB/database";
import cookieParser from "cookie-parser";
import redis from "./utils/redis";
import { ApiDocumentation, PORT } from "./config/env";
import apiRouter from "./routes/index";
import express from "express";


const port = PORT;

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

redis

// API routes
app.use("/api/v1", apiRouter);

app.get("/", (req: Request, res: Response):any => {
  return res.json({
    message:"welcome to our Application",
    ApiDocumentation :ApiDocumentation,
  })
});

// Handle invalid routes
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: "Invalid URL or Method" });
});

// Start the server after database connection
database
  .connect()
  .then(() => {
    app.listen(port, () => console.log(`Server is running on port ${port}!`));
  })
  .catch((err:Error) => {
    console.error("Database connection failed:", err.message);
  });
