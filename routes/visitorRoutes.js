import express from "express";
import Visitor from "../models/Visitor.js";

const router = express.Router();

// GET all visitors
router.get("/", async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    res.json(visitors);
  } catch (err) {
    console.error("Failed to fetch visitors:", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});

// POST a new visitor (WITH ANOMALY DETECTION)
router.post("/", async (req, res) => {
  try {
    const { visitorID } = req.body;

    if (!visitorID) {
      return res.status(400).json({ error: "visitorID is required" });
    }

    // 🔴 BLOCK if visitor is still inside (no timeOut yet)
    const activeVisitor = await Visitor.findOne({
      visitorID,
      timeOut: { $exists: false },
    });

    if (activeVisitor) {
      return res.status(409).json({
        error: "Visitor already registered and not yet timed out.",
      });
    }

    // 🔴 BLOCK multiple registrations on the same day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayVisitor = await Visitor.findOne({
      visitorID,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (todayVisitor) {
      return res.status(409).json({
        error: "Visitor already registered today.",
      });
    }

    // ✅ Save visitor if no anomaly detected
    const newVisitor = new Visitor(req.body);
    const saved = await newVisitor.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error("Failed to save visitor:", err);
    res.status(500).json({ error: "Failed to save visitor" });
  }
});

// TIME IN
router.put("/:id/time-in", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { timeIn: new Date() },
      { new: true }
    );
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: "Failed to set time in" });
  }
});

// TIME OUT
router.put("/:id/time-out", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { timeOut: new Date() },
      { new: true }
    );
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: "Failed to set time out" });
  }
});

// START PROCESSING
router.put("/:id/start-processing", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { processingStartedTime: new Date() },
      { new: true }
    );
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: "Failed to start processing" });
  }
});

// MARK PROCESSED
router.put("/:id/office-processed", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { officeProcessedTime: new Date(), processed: true },
      { new: true }
    );
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as processed" });
  }
});

export default router;
