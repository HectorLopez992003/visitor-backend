import express from "express";
import AuditTrail from "../models/AuditTrail.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// GET ALL LOGS
router.get("/", verifyToken, async (req, res) => {
  try {
    const logs = await AuditTrail.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit trail" });
  }
});

export default router;
