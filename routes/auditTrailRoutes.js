import express from "express";
import AuditTrail from "../models/AuditTrail.js";

const router = express.Router();

// GET ALL AUDIT LOGS
// GET ALL AUDIT LOGS
router.get("/", async (req, res) => {
  try {
    const { office } = req.query; // ✅ Get optional office from query params

    // Build the query object
    let query = {};
    if (office) query.visitorOffice = office; // ✅ Only filter by office if provided

    const logs = await AuditTrail.find(query) // use the query
      .sort({ timestamp: -1 })
      .limit(200);

    res.json(logs);
  } catch (err) {
    console.error("❌ Failed to fetch audit trail:", err);
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

export default router;


