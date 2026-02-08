import express from "express";
import AuditTrail from "../models/AuditTrail.js";
import { verifyJWT } from "../middleware/auth.js";

const router = express.Router();

// GET ALL AUDIT LOGS
router.get("/", verifyJWT, async (req, res) => {
  try {
    const { office } = req.query;
    let query = {};

    // Office Staff: only see logs from their office
    if (req.user.role === "Office Staff") {
      query.visitorOffice = req.user.office;
    } 
    // Admin / Super Admin: can filter by office if provided
    else if (office) {
      query.visitorOffice = office;
    }

    const logs = await AuditTrail.find(query)
      .sort({ timestamp: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    console.error("❌ Failed to fetch audit trail:", err);
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

export default router;
