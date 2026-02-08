import express from "express";
import AuditTrail from "../models/AuditTrail.js";
import Visitor from "../models/Visitor.js"; // ✅ import Visitor model

const router = express.Router();

// GET ALL AUDIT LOGS
router.get("/", async (req, res) => {
  try {
    const { office } = req.query;

    let query = {};
    if (office) {
      // Only fetch logs for visitors in this office
      const visitors = await Visitor.find({ office }).select("_id");
      const visitorIds = visitors.map(v => v._id);
      query.visitorId = { $in: visitorIds };
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
