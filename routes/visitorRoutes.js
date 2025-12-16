import express from "express";
import Visitor from "../models/Visitor.js";

const router = express.Router();

/**
 * GET ALL VISITORS
 */
router.get("/", async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    res.json(visitors);
  } catch (err) {
    console.error("❌ Failed to fetch visitors:", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});

/**
 * CREATE VISITOR (WITH ANOMALY CHECK)
 */
router.post("/", async (req, res) => {
  try {
    const { visitorID } = req.body;

    if (!visitorID) {
      return res.status(400).json({ error: "visitorID is required" });
    }

    // 🔴 BLOCK if visitor still inside
    const activeVisitor = await Visitor.findOne({
      visitorID,
      timeOut: null,
    });

    if (activeVisitor) {
      return res.status(409).json({
        error: "Visitor already registered and not yet timed out.",
      });
    }

    // 🔴 BLOCK multiple registrations in same calendar day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayVisitor = await Visitor.findOne({
      visitorID,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    if (todayVisitor) {
      return res.status(409).json({
        error: "Visitor already registered today.",
      });
    }

    const newVisitor = new Visitor(req.body);
    const saved = await newVisitor.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Failed to save visitor:", err);
    res.status(500).json({ error: "Failed to save visitor" });
  }
});

/**
 * TIME IN
 */
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

/**
 * TIME OUT
 */
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

/**
 * START PROCESSING
 */
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

/**
 * MARK AS PROCESSED
 */
router.put("/:id/office-processed", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      {
        officeProcessedTime: new Date(),
        processed: true,
      },
      { new: true }
    );
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as processed" });
  }
});

export default router;
