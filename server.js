import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import visitorRoutes from "./routes/visitorRoutes.js";
import visitorAuthRoutes from "./routes/visitorAuthRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import suggestionRoutes from "./routes/suggestionRoutes.js"; // ✅ ADD THIS

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json({ limit: "10mb" })); // ✅ important for ID images + feedback
app.use(express.urlencoded({ extended: true }));

/* ======================
   DATABASE
====================== */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

/* ======================
   ROUTES
====================== */
app.use("/api/visitor-auth", visitorAuthRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/suggestions", suggestionRoutes); // ✅ ADD THIS

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("Visitor Management Backend is running");
});

/* ======================
   SERVER
====================== */
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
