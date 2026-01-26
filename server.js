import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import visitorRoutes from "./routes/visitorRoutes.js";
import visitorAuthRoutes from "./routes/visitorAuthRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import suggestionRoutes from "./routes/suggestionRoutes.js";

import Visitor from "./models/Visitor.js";
import Appointment from "./models/Appointment.js";
import { sendEmail } from "./utils/email.js"; // ✅ Email helper
import { sendOverdueEmail } from "./utils/overdue.js"; // ✅ New helper

dotenv.config();

console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "✅ LOADED" : "❌ MISSING");

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
const checkOverdueVisitorsAndAppointments = async () => {
  try {
    const now = new Date();

    /* --------------------
       WALK-IN VISITORS
    -------------------- */
    const overdueVisitors = await Visitor.find({
      officeProcessedTime: { $ne: null },
      timeOut: null,
      overdueEmailSent: false,
      email: { $ne: null },
    });

    for (const visitor of overdueVisitors) {
      if (now.getTime() - new Date(visitor.officeProcessedTime).getTime() >= 30 * 60 * 1000) {
        await sendOverdueEmail(visitor, "visitor");
      }
    }

    /* --------------------
       ONLINE APPOINTMENTS
    -------------------- */
    const overdueAppointments = await Appointment.find({
      officeProcessedTime: { $ne: null },
      processed: true,          // ✅ Fix: use processed instead of timeOut
      overdueEmailSent: false,
      email: { $ne: null },
    });

    for (const appt of overdueAppointments) {
      if (now.getTime() - new Date(appt.officeProcessedTime).getTime() >= 30 * 60 * 1000) {
        await sendOverdueEmail(appt, "appointment");
      }
    }
  } catch (err) {
    console.error("❌ Error checking overdue visitors/appointments:", err);
  }
};

// Run every 1 minute
setInterval(checkOverdueVisitorsAndAppointments, 1 * 60 * 1000);

/* ======================
   SERVER
====================== */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
