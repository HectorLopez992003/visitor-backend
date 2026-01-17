import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import visitorRoutes from "./routes/visitorRoutes.js";
import visitorAuthRoutes from "./routes/visitorAuthRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import suggestionRoutes from "./routes/suggestionRoutes.js";

import Visitor from "./models/Visitor.js";
import { sendEmail } from "./utils/email.js"; // ✅ Email helper

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ======================
   DATABASE
====================== */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ======================
   ROUTES
====================== */
app.use("/api/visitor-auth", visitorAuthRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/suggestions", suggestionRoutes);

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("Visitor Management Backend is running");
});

/* ======================
   AUTOMATIC OVERDUE EMAIL CHECK (REAL-TIME)
====================== */
const checkOverdueVisitors = async () => {
  try {
    const now = new Date();

    // Find visitors that finished processing but haven't timed out and no email sent yet
    const overdueVisitors = await Visitor.find({
      officeProcessedTime: { $ne: null },
      timeOut: null,
      overdueEmailSent: false,
    });

    for (const visitor of overdueVisitors) {
      const processedTime = new Date(visitor.officeProcessedTime).getTime();
      const nowTime = now.getTime();

      // ✅ Send email if 30+ mins passed
      if (nowTime - processedTime >= 30 * 60 * 1000 && visitor.email) {
        try {
          await sendEmail(
            visitor.email,
            "Overdue Visitor Notification",
            `Hello ${visitor.name}, you exceeded 30 mins after office processing. Please return to the guard.`
          );

          visitor.overdueEmailSent = true;
          await visitor.save();
          console.log(`📧 Overdue email sent to ${visitor.email}`);
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${visitor.email}:`, emailErr);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error checking overdue visitors:", err);
  }
};

// Run every 1 minute for more "real-time" email
setInterval(checkOverdueVisitors, 1 * 60 * 1000);

/* ======================
   SERVER
====================== */
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
