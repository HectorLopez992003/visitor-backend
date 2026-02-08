import express from "express";
import AuditTrail from "../models/AuditTrail.js";
import { verifyJWT } from "../middleware/auth.js";

const router = express.Router();

// GET ALL AUDIT LOGS
router.get("/", verifyJWT, async (req, res) => {
  try {
    const { office } = req.query;
    let query = {};

    // ---------------- ROLE-BASED FILTER ----------------
    if (req.user.role === "Office Staff") {
      // Office Staff can only see logs for their own office
      query.visitorOffice = req.user.office;
    } else if (req.user.role === "Admin" || req.user.role === "Super Admin") {
      // Admins can filter by office if provided
      if (office) query.visitorOffice = office;
      // If no office provided, Admins/Super Admins see all logs
    } else {
      // Optional: block other roles
      return res.status(403).json({ error: "Access denied" });
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
