import express from "express";
import Appointment from "../models/Appointment.js";
import Visitor from "../models/Visitor.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

/** =========================
 * HELPER: Mark overdue appointments asynchronously
========================= */
const markOverdueAppointmentsAsync = async () => {
  try {
    const now = new Date();

    // Find only appointments that are pending
    const appointments = await Appointment.find({
      processingStartedTime: null,
      officeProcessedTime: null
    });

    for (const appt of appointments) {
      const sched = new Date(appt.scheduledDate);
      const [h, m] = appt.scheduledTime.split(":").map(Number);
      sched.setHours(h, m, 0, 0);

      if (now > sched && appt.email && !appt.overdueEmailSent) {
        // Send email asynchronously
        sendEmail(
          appt.email,
          "Overdue Appointment Notification",
          `Hello ${appt.name}, your scheduled appointment is now overdue. Please return to the guard.`
        )
        .then(() => {
          appt.overdueEmailSent = true;
          return appt.save();
        })
        .then(() => console.log(`📧 Overdue email sent to ${appt.email}`))
        .catch(emailErr => console.error(`❌ Failed to send email to ${appt.email}:`, emailErr));
      }
    }
  } catch (err) {
    console.error("❌ Failed to mark overdue appointments:", err);
  }
};

/** =========================
 * GET all appointments (optimized)
========================= */
router.get("/", async (req, res) => {
  try {
    // Trigger overdue processing asynchronously
    setImmediate(markOverdueAppointmentsAsync);

    // Fetch appointments with pagination & lean
    const appointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(100)   // Limit for performance
      .lean();

    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

/** =========================
 * GET appointment by contactNumber
========================= */
router.get("/:contactNumber", async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ contactNumber: req.params.contactNumber }).lean();
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    let status = "PENDING";
    const now = new Date();

    if (appointment.officeProcessedTime) status = "PROCESSED";
    else if (appointment.processingStartedTime) status = "PROCESSING";
    else if (appointment.scheduledDate && appointment.scheduledTime) {
      const sched = new Date(appointment.scheduledDate);
      const [h, m] = appointment.scheduledTime.split(":").map(Number);
      sched.setHours(h, m, 0, 0);
      if (now > sched) status = "OVERDUE";
    }

    res.json({ appointment: { ...appointment, status }, isOverdue: status === "OVERDUE" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch appointment" });
  }
});

/** =========================
 * CREATE new appointment
========================= */
router.post("/", async (req, res) => {
  try {
    const { name, contactNumber, email, office, purpose, scheduledDate, scheduledTime, idFile } = req.body;

    if (!name || !contactNumber || !email || !office || !purpose || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: "All fields including email are required" });
    }

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

    const qrData = JSON.stringify({ contactNumber, name });

    const appointment = await Appointment.create({
      name,
      contactNumber,
      email,
      office,
      purpose,
      scheduledDate,
      scheduledTime,
      idFile,
      qrData
    });

    await Visitor.create({
      name,
      contactNumber,
      email,
      office,
      purpose,
      scheduledDate,
      scheduledTime,
      idFile,
      registrationType: "ONLINE",
      qrData
    });

    res.status(201).json({ message: "Saved", appointment });
  } catch (err) {
    console.error("❌ Failed to save appointment:", err);
    res.status(500).json({ error: "Failed to save appointment" });
  }
});

/** =========================
 * START PROCESSING
========================= */
router.put("/:id/start-processing", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    const now = new Date();
    appointment.processingStartedTime = now;
    await appointment.save();

    await Visitor.updateOne(
      { contactNumber: appointment.contactNumber },
      { processingStartedTime: now }
    );

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start processing" });
  }
});

/** =========================
 * OFFICE PROCESSED
========================= */
router.put("/:id/office-processed", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    const now = new Date();
    appointment.officeProcessedTime = now;
    appointment.processed = true;
    await appointment.save();

    await Visitor.updateOne(
      { contactNumber: appointment.contactNumber },
      { officeProcessedTime: now, processed: true }
    );

    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark as processed" });
  }
});

/** =========================
 * SUBMIT FEEDBACK
========================= */
router.patch("/:contactNumber/feedback", async (req, res) => {
  try {
    const { feedback } = req.body;
    const appointment = await Appointment.findOne({ contactNumber: req.params.contactNumber });
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    appointment.feedback = feedback;
    await appointment.save();

    await Visitor.updateOne({ contactNumber: appointment.contactNumber }, { feedback });

    res.json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

/** =========================
 * ACCEPT / DECLINE APPOINTMENT
========================= */
router.put("/:id/accept", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    appointment.accepted = true;
    await appointment.save();

    const visitor = await Visitor.findOne({ contactNumber: appointment.contactNumber });
    if (visitor) {
      visitor.accepted = true;
      await visitor.save();
    }

    res.json({ message: "Appointment accepted", appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept appointment" });
  }
});

router.put("/:id/decline", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    appointment.accepted = false;
    await appointment.save();

    const visitor = await Visitor.findOne({ contactNumber: appointment.contactNumber });
    if (visitor) {
      visitor.accepted = false;
      await visitor.save();
    }

    res.json({ message: "Appointment declined", appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to decline appointment" });
  }
});

export default router;
