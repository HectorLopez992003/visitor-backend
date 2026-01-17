import express from "express";
import Appointment from "../models/Appointment.js";
import Visitor from "../models/Visitor.js";
import { sendEmail } from "../utils/email.js"; // ✅ Email helper

const router = express.Router();

// ✅ AUTO MARK OVERDUE (for notifications)
const markOverdueAppointments = async () => {
  const now = new Date();

  const appointments = await Appointment.find({
    processingStartedTime: null,
    officeProcessedTime: null
  });

  for (const appt of appointments) {
    const sched = new Date(appt.scheduledDate);
    const [h, m] = appt.scheduledTime.split(":").map(Number);
    sched.setHours(h, m, 0, 0);

    if (now > sched) {
      await Visitor.updateOne(
        { contactNumber: appt.contactNumber },
        { /* FE reads virtual status, no DB update needed */ }
      );

      // ✅ Send automatic overdue email if email exists and not sent
      if (appt.email && !appt.overdueEmailSent) {
        try {
          await sendEmail(
            appt.email,
            "Overdue Appointment Notification",
            `Hello ${appt.name}, your scheduled appointment is now overdue. Please return to the guard.`
          );
          appt.overdueEmailSent = true;
          await appt.save();
          console.log(`📧 Overdue email sent to ${appt.email}`);
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${appt.email}:`, emailErr);
        }
      }
    }
  }
};

// GET all appointments
router.get("/", async (req, res) => {
  try {
    await markOverdueAppointments();
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// GET appointment by contactNumber
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

// CREATE new appointment with anomaly detection
router.post("/", async (req, res) => {
  try {
    const { name, contactNumber, email, office, purpose, scheduledDate, scheduledTime, idFile } = req.body;

    // ✅ Validate required fields
    if (!name || !contactNumber || !email || !office || !purpose || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: "All fields including email are required" });
    }

    // --------- ANOMALY DETECTION ----------
    const existingAppointment = await Appointment.findOne({ contactNumber, scheduledDate, scheduledTime });
    const existingVisitor = await Visitor.findOne({ contactNumber, scheduledDate, scheduledTime });
    if (existingAppointment || existingVisitor) {
      return res.status(409).json({ error: "Duplicate appointment detected for this date and time." });
    }
    // -------------------------------------

    const qrData = JSON.stringify({ contactNumber, name });

    // ✅ Create Appointment
    const appointment = await Appointment.create({
      name,
      contactNumber,
      email, // store email
      office,
      purpose,
      scheduledDate,
      scheduledTime,
      idFile,
      qrData
    });

    // ✅ Create Visitor from Appointment
    try {
      await Visitor.create({
        name,
        contactNumber,
        email, // make sure this exists
        office,
        purpose,
        scheduledDate,
        scheduledTime,
        idFile,
        registrationType: "ONLINE",
        qrData
      });
    } catch (visitorErr) {
      console.error("❌ Visitor creation failed:", visitorErr);
      return res.status(500).json({ error: "Failed to create visitor" });
    }

    res.status(201).json({ message: "Saved", appointment });

  } catch (err) {
    console.error("❌ Failed to save appointment:", err);
    res.status(500).json({ error: "Failed to save appointment" });
  }
});

// START PROCESSING
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

// OFFICE PROCESSED
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

// SUBMIT FEEDBACK
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

export default router;
