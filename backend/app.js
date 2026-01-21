import express from "express";
import dotenv from "dotenv";
import userRouter from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Specify exact origin
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// app.use("/api/v1/", async (req, res, next) => {
//     res.send("Learn Bridge AI Backend is running");
// })
app.use("/api/v1/users", userRouter);

export default app;
