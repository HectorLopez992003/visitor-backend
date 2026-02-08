import express from "express";
import Visitor from "../models/Visitor.js";
import Appointment from "../models/Appointment.js";
import { sendEmail } from "../utils/email.js";
import AuditTrail from "../models/AuditTrail.js";
import { verifyJWT } from "../middleware/auth.js"; // ✅ import middleware

const router = express.Router();

/** =========================
 * GET ALL VISITORS
========================= */
router.get("/", verifyJWT, async (req, res) => { // ✅ protect route
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
        accepted: 1,
        idFile: 1 
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
router.post("/", verifyJWT, async (req, res) => { // ✅ protect route
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
      qrData
    } = req.body;

    if (!contactNumber) return res.status(400).json({ error: "Contact number is required" });
    if (!name || !office || !purpose) return res.status(400).json({ error: "Missing required fields" });

    const startOfDay = new Date(scheduledDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentCount = await Appointment.countDocuments({
      contactNumber,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay }
    });
    const visitorCount = await Visitor.countDocuments({
      contactNumber,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay }
    });

    if (appointmentCount + visitorCount >= 2) {
      return res.status(409).json({ error: "Maximum 2 registrations allowed per day for this number" });
    }

    const activeVisitor = await Visitor.findOne({ contactNumber, timeOut: null });
    if (activeVisitor) return res.status(409).json({ error: "Visitor already inside" });

    const visitor = await Visitor.create({
      name,
      contactNumber,
      email,
      office,
      purpose,
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      idFile: idFile || null,
      registrationType: registrationType || "ONLINE",
      qrData: qrData || null,
      accepted: null
    });

    // Audit trail for creation
    try {
      await AuditTrail.create({
        visitorId: visitor._id,
        visitorName: visitor.name,
        visitorOffice: visitor.office,
        action: "Visitor Created",
        performedBy: req.user.name // ✅ logged-in user
      });
    } catch (auditErr) {
      console.error("❌ Audit trail error (create visitor):", auditErr);
    }

    res.status(201).json(visitor);
  } catch (err) {
    console.error("❌ Failed to save visitor:", err);
    res.status(500).json({ error: "Failed to save visitor" });
  }
});

/** =========================
 * HELPER: Update Visitor
========================= */
const updateVisitor = async (id, updateFields, res, action, performedBy) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(id, updateFields, { new: true });
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });

    // ---------------- AUDIT TRAIL ----------------
    try {
      let actionText = null;
      if (updateFields.timeIn) actionText = "Visitor Time In";
      if (updateFields.timeOut) actionText = "Visitor Time Out";
      if (updateFields.processingStartedTime) actionText = "Processing Started";
      if (updateFields.officeProcessedTime) actionText = "Visitor Processed";

      if (actionText) {
        await AuditTrail.create({
          visitorId: visitor._id,
          visitorName: visitor.name,
          visitorOffice: visitor.office,
          action: actionText,
          performedBy // ✅ passed logged-in user
        });
      }
    } catch (auditErr) {
      console.error("❌ Audit trail error:", auditErr);
    }

    const appointment = await Appointment.findOne({ contactNumber: visitor.contactNumber });
    if (appointment) {
      const fieldsToUpdate = {};
      if (updateFields.processingStartedTime) fieldsToUpdate.processingStartedTime = updateFields.processingStartedTime;
      if (updateFields.officeProcessedTime) fieldsToUpdate.officeProcessedTime = updateFields.officeProcessedTime;
      if (updateFields.feedback) fieldsToUpdate.feedback = updateFields.feedback;
      if (typeof updateFields.accepted === "boolean") fieldsToUpdate.accepted = updateFields.accepted;

      if (Object.keys(fieldsToUpdate).length > 0) {
        Object.assign(appointment, fieldsToUpdate);
        await appointment.save();
      }
    }

    res.json(visitor);
  } catch (err) {
    console.error(`❌ Failed to ${action}:`, err);
    res.status(500).json({ error: `Failed to ${action}` });
  }
};

/** =========================
 * TIME IN / TIME OUT / PROCESSING / PROCESSED / DELETE
========================= */
router.put("/:id/time-in", verifyJWT, (req, res) =>
  updateVisitor(req.params.id, { timeIn: new Date() }, res, "set time in", req.user.name)
);
router.put("/:id/time-out", verifyJWT, (req, res) =>
  updateVisitor(req.params.id, { timeOut: new Date() }, res, "set time out", req.user.name)
);
router.put("/:id/start-processing", verifyJWT, (req, res) =>
  updateVisitor(req.params.id, { processingStartedTime: new Date() }, res, "start processing", req.user.name)
);
router.put("/:id/office-processed", verifyJWT, (req, res) =>
  updateVisitor(req.params.id, { officeProcessedTime: new Date(), processed: true }, res, "mark as processed", req.user.name)
);

router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });

    // Audit trail for deletion
    try {
      await AuditTrail.create({
        visitorId: visitor._id,
        visitorName: visitor.name,
        visitorOffice: visitor.office,
        action: "Visitor Deleted",
        performedBy: req.user.name
      });
    } catch (auditErr) {
      console.error("❌ Audit trail error (delete visitor):", auditErr);
    }

    res.json({ message: "Visitor deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete visitor:", err);
    res.status(500).json({ error: "Failed to delete visitor" });
  }
});

/** =========================
 * SEND OVERDUE EMAIL
========================= */
router.post("/:id/send-overdue-email", verifyJWT, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: "Visitor not found" });
    if (!visitor.email) return res.status(400).json({ success: false, message: "Visitor does not have an email" });
    if (visitor.overdueEmailSent) return res.json({ success: false, message: "Email already sent" });
    if (!visitor.officeProcessedTime || visitor.timeOut) return res.json({ success: false, message: "Visitor is not overdue" });

    const now = Date.now();
    const processedTime = new Date(visitor.officeProcessedTime).getTime();
    if (now - processedTime < 30 * 60 * 1000) return res.json({ success: false, message: "Visitor is not yet overdue" });

    const emailResult = await sendEmail(visitor.email, "Overdue Visitor Notification",
      `Hello ${visitor.name}, you exceeded 30 mins after office processing. Please return to the guard for timeout.`
    );

    if (!emailResult.success) return res.status(500).json({ success: false, message: emailResult.error });

    visitor.overdueEmailSent = true;
    await visitor.save();

    res.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** =========================
 * ACCEPT / DECLINE VISITOR
========================= */
router.put("/:id/accept-decline", verifyJWT, async (req, res) => {
  try {
    const { accepted } = req.body;
    if (typeof accepted !== "boolean") return res.status(400).json({ error: "Accepted must be boolean" });

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });

    visitor.accepted = accepted;
    await visitor.save();

    const appointment = await Appointment.findOne({ contactNumber: visitor.contactNumber });
    if (appointment) {
      appointment.accepted = accepted;
      await appointment.save();
    }

    // Audit trail for accept/decline
    try {
      await AuditTrail.create({
        visitorId: visitor._id,
        visitorName: visitor.name,
        visitorOffice: visitor.office,
        action: accepted ? "Visitor Accepted" : "Visitor Declined",
        performedBy: req.user.name
      });
    } catch (auditErr) {
      console.error("❌ Audit trail error (accept/decline):", auditErr);
    }

    // Send email only once
    if (visitor.email && !visitor.acceptDeclineEmailSent) {
      try {
        const subject = accepted ? "Visitor Accepted" : "Visitor Declined";
        const message = accepted
          ? `Hello ${visitor.name}, your registration has been accepted. You may now enter the premises.`
          : `Hello ${visitor.name}, unfortunately your registration has been declined. Please contact the office for more info.`;

        await sendEmail(visitor.email, subject, message);
        visitor.acceptDeclineEmailSent = true;
        await visitor.save();
      } catch (emailErr) {
        console.error(`❌ Failed to send accept/decline email to ${visitor.email}:`, emailErr);
      }
    }

    res.json({ message: `Visitor ${accepted ? "accepted" : "declined"}`, visitor });
  } catch (err) {
    console.error("❌ Failed to accept/decline visitor:", err);
    res.status(500).json({ error: "Failed to update visitor status" });
  }
});

/** =========================
 * NOTIFY VISITOR EMAIL (disabled)
========================= */
router.post("/:id/notify", verifyJWT, async (req, res) => {
  try {
    res.json({ message: "This endpoint is now disabled to prevent duplicate emails. Use accept-decline instead." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

/** =========================
 * DEBUG: TEST EMAIL
========================= */
router.get("/debug/test-email", verifyJWT, async (req, res) => {
  try {
    const result = await sendEmail(
      "hectorjoshlopez@gmail.com",
      "Test Email from Visitor System",
      "If you received this, SMTP is working correctly."
    );

    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    res.json({ success: true, message: "Test email sent", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
