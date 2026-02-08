import express from "express";
import AuditTrail from "../models/AuditTrail.js";
import Visitor from "../models/Visitor.js"; // ✅ import Visitor model

const router = express.Router();

// GET ALL AUDIT LOGS
router.get("/", async (req, res) => {
  try {
    const { office } = req.query; // optional office filter

    // Fetch latest 200 audit logs
    let logs = await AuditTrail.find()
      .sort({ timestamp: -1 })
      .limit(200);

    // If office filter is provided, fetch visitor info and filter
    if (office) {
      // Get visitor IDs from logs
      const visitorIds = logs.map(l => l.visitorId).filter(Boolean);

      // Fetch visitors matching the office
      const visitors = await Visitor.find({ _id: { $in: visitorIds }, office });
      const visitorIdsInOffice = visitors.map(v => v._id.toString());

      // Filter logs to only those visitors in this office
      logs = logs.filter(l => visitorIdsInOffice.includes(l.visitorId?.toString()));
    }

    res.json(logs);
  } catch (err) {
    console.error("❌ Failed to fetch audit trail:", err);
    res.status(500).json({ error: "Failed to fetch audit trail" });
  }
});

export default router;
