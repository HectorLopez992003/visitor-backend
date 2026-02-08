import express from "express";
import AuditTrail from "../models/AuditTrail.js";

const router = express.Router();

// GET ALL AUDIT LOGS
router.get("/", async (req, res) => {
  try {
    const logs = await AuditTrail.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    console.error("❌ Failed to fetch audit trail:", err);
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

export default router;
