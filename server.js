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

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/visitors", visitorRoutes);

// Root test route
app.get("/", (req, res) => {
  res.json({ message: "Visitor Management Backend is running" });
});

export default app; // REQUIRED for Vercel
