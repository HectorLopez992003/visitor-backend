import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    visitorID: { type: String, required: true },
    office: { type: String, required: true },
    purpose: { type: String, required: true },
    qrData: String,
    idFile: String,

    scheduledDate: String,
    scheduledTime: String, // ✅ ADDED (HH:MM)

    generatedAt: { type: Date, default: Date.now },
    timeIn: Date,
    timeOut: Date,
    processingStartedTime: Date,
    officeProcessedTime: Date,
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Visitor = mongoose.model("Visitor", visitorSchema);

export default Visitor;
