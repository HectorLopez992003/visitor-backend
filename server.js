import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import visitorRoutes from "./routes/visitorRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/visitors", visitorRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Visitor Management Backend is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
