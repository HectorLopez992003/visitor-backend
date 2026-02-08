import mongoose from "mongoose";

const auditTrailSchema = new mongoose.Schema({
  visitorId: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor" },
  visitorName: String,
  action: String,          // Accepted, Declined, Processing Started, Processed
  performedBy: String,     // Admin name
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("AuditTrail", auditTrailSchema);
