import express from "express";
import Visitor from "../models/Visitor.js";
import Appointment from "../models/Appointment.js";
import { sendEmail } from "../utils/email.js"; 

const router = express.Router();

/** =========================
 * GET ALL VISITORS
========================= */
router.get("/", async (req, res) => {
  try {
    const visitors = await Visitor.find(
      {},
      {
        name: 1,
        contactNumber: 1,
        email: 1,
        office: 1,
        purpose: 1,
        scheduledDate: 1,
        scheduledTime: 1,
        timeIn: 1,
        timeOut: 1,
        processingStartedTime: 1,
        officeProcessedTime: 1,
        processed: 1,
        overdueEmailSent: 1,
        overdueSmsSent: 1,
        idFile: 1 // ✅ Add this
      }
    ).sort({ createdAt: -1 });

    res.json(visitors);
  } catch (err) {
    console.error("❌ Failed to fetch visitors:", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});

/** =========================
 * CREATE VISITOR
========================= */
router.post("/", async (req, res) => {
  try {
    const {
      contactNumber,
      email,
      name,
      office,
      purpose,
      scheduledDate,
      scheduledTime,
      idFile,
      registrationType,
      qrData,
    } = req.body;

    // Validate required fields
    if (!contactNumber) return res.status(400).json({ error: "Contact number is required" });
    if (!name || !office || !purpose) return res.status(400).json({ error: "Missing required fields" });

// --------- UPDATED ANOMALY DETECTION: max 2 per day ----------
const startOfDay = new Date(scheduledDate);
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date(scheduledDate);
endOfDay.setHours(23, 59, 59, 999);

// Count appointments + visitors for the same number on the same day
const appointmentCount = await Appointment.countDocuments({
  contactNumber,
  scheduledDate: { $gte: startOfDay, $lte: endOfDay }
});
const visitorCount = await Visitor.countDocuments({
  contactNumber,
  scheduledDate: { $gte: startOfDay, $lte: endOfDay }
});

if (appointmentCount + visitorCount >= 2) {
  return res.status(409).json({
    error: "Maximum 2 registrations allowed per day for this number"
  });
}
// -------------------------------------

    // Check if visitor is already inside
    const activeVisitor = await Visitor.findOne({ contactNumber, timeOut: null });
    if (activeVisitor) return res.status(409).json({ error: "Visitor already inside" });

    // Create visitor
    const visitor = await Visitor.create({
      name,
      contactNumber,
      email, // ✅ store email
      office,
      purpose,
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      idFile: idFile || null,
      registrationType: registrationType || "ONLINE",
      qrData: qrData || null,
    });

    res.status(201).json(visitor);
  } catch (err) {
    console.error("❌ Failed to save visitor:", err);
    res.status(500).json({ error: "Failed to save visitor" });
  }
});

/** =========================
 * HELPER: Update Visitor
========================= */
const updateVisitor = async (id, updateFields, res, action) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(id, updateFields, { new: true });
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });

    // Sync with Appointment if exists
    const appointment = await Appointment.findOne({ contactNumber: visitor.contactNumber });
    if (appointment) {
      Object.assign(appointment, updateFields);
      if (updateFields.processingStartedTime) appointment.status = "PROCESSING";
      if (updateFields.officeProcessedTime) appointment.status = "PROCESSED";
      await appointment.save();
    }

    res.json(visitor);
  } catch (err) {
    console.error(`❌ Failed to ${action}:`, err);
    res.status(500).json({ error: `Failed to ${action}` });
  }
};

/** =========================
 * TIME IN
========================= */
router.put("/:id/time-in", (req, res) =>
  updateVisitor(req.params.id, { timeIn: new Date() }, res, "set time in")
);

/** TIME OUT */
router.put("/:id/time-out", (req, res) =>
  updateVisitor(req.params.id, { timeOut: new Date() }, res, "set time out")
);

/** START PROCESSING */
router.put("/:id/start-processing", (req, res) =>
  updateVisitor(req.params.id, { processingStartedTime: new Date() }, res, "start processing")
);

/** MARK PROCESSED */
router.put("/:id/office-processed", (req, res) =>
  updateVisitor(
    req.params.id,
    { officeProcessedTime: new Date(), processed: true },
    res,
    "mark as processed"
  )
);

/** DELETE VISITOR */
router.delete("/:id", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });
    res.json({ message: "Visitor deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete visitor:", err);
    res.status(500).json({ error: "Failed to delete visitor" });
  }
});

router.post("/:id/send-overdue-email", async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: "Visitor not found" });

    if (!visitor.email) {
      return res.status(400).json({ success: false, message: "Visitor does not have an email" });
    }

    if (visitor.overdueEmailSent) {
      return res.json({ success: false, message: "Email already sent" });
    }

    if (!visitor.officeProcessedTime || visitor.timeOut) {
      return res.json({ success: false, message: "Visitor is not overdue" });
    }

    const now = Date.now();
    const processedTime = new Date(visitor.officeProcessedTime).getTime();
    if (now - processedTime < 30 * 60 * 1000) {
      return res.json({ success: false, message: "Visitor is not yet overdue" });
    }

    // Send email
    const emailResult = await sendEmail(
      visitor.email,
      "Overdue Visitor Notification",
      `Hello ${visitor.name}, you exceeded 30 mins after office processing. Please return to the guard for timeout.`
    );

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: emailResult.error });
    }

    visitor.overdueEmailSent = true;
    await visitor.save();

    return res.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔎 DEBUG: Test email
router.get("/debug/test-email", async (req, res) => {
  try {
    const result = await sendEmail(
      "hectorjoshlopez@gmail.com", // send to yourself
      "Test Email from Visitor System",
      "If you received this, SMTP is working correctly."
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: "Test email sent", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
