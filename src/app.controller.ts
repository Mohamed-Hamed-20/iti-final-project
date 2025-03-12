import express, { Application } from "express";
import { errorHandler } from "./utils/errorHandling";
import path from "path";

const app: Application = express();

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(errorHandler);

export default app;
