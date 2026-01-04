import express from "express";
import Visitor from "../models/Visitor.js";
import Appointment from "../models/Appointment.js";

const router = express.Router();

/** =========================
 * GET ALL VISITORS
========================= */
router.get("/", async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
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

    // Check if visitor is already inside
    const activeVisitor = await Visitor.findOne({ contactNumber, timeOut: null });
    if (activeVisitor) return res.status(409).json({ error: "Visitor already inside" });

    // Check if visitor is already registered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayVisitor = await Visitor.findOne({
      contactNumber,
      createdAt: { $gte: today, $lt: tomorrow },
    });
    if (todayVisitor) return res.status(409).json({ error: "Visitor already registered today" });

    // Create visitor
    const visitor = await Visitor.create({
      name,
      contactNumber,
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

export default router;
