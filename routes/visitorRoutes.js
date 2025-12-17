import express from "express";
import Visitor from "../models/Visitor.js";

const router = express.Router();

/** GET ALL VISITORS */
router.get("/", async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    res.json(visitors);
  } catch {
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});

/** CREATE VISITOR */
router.post("/", async (req, res) => {
  try {
    const { visitorID } = req.body;
    if (!visitorID) {
      return res.status(400).json({ error: "visitorID is required" });
    }

    const activeVisitor = await Visitor.findOne({ visitorID, timeOut: null });
    if (activeVisitor) {
      return res.status(409).json({ error: "Visitor already inside" });
    }

    const visitor = await Visitor.create(req.body);
    res.status(201).json(visitor);
  } catch {
    res.status(500).json({ error: "Failed to save visitor" });
  }
});

/** TIME IN */
router.put("/:id/time-in", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { timeIn: new Date() },
      { new: true }
    );
    res.json(visitor);
  } catch {
    res.status(500).json({ error: "Failed to time in" });
  }
});

/** TIME OUT */
router.put("/:id/time-out", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { timeOut: new Date() },
      { new: true }
    );
    res.json(visitor);
  } catch {
    res.status(500).json({ error: "Failed to time out" });
  }
});

/** START PROCESSING */
router.put("/:id/start-processing", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { processingStartedTime: new Date() },
      { new: true }
    );
    res.json(visitor);
  } catch {
    res.status(500).json({ error: "Failed to start processing" });
  }
});

/** MARK PROCESSED */
router.put("/:id/office-processed", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      { officeProcessedTime: new Date(), processed: true },
      { new: true }
    );
    res.json(visitor);
  } catch {
    res.status(500).json({ error: "Failed to process visitor" });
  }
});

/** DELETE VISITOR */
router.delete("/:id", async (req, res) => {
  try {
    await Visitor.findByIdAndDelete(req.params.id);
    res.json({ message: "Visitor deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete visitor" });
  }
});

export default router;
