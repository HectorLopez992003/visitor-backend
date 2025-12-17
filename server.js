import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import visitorRoutes from "./routes/visitorRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Routes
app.use("/api/visitors", visitorRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Visitor Management Backend is running");
});

export default app; // ✅ REQUIRED BY VERCEL
