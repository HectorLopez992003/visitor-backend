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
    scheduledTime: String,

    timeIn: { type: Date, default: null },
    timeOut: { type: Date, default: null },

    processingStartedTime: Date,
    officeProcessedTime: Date,

    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Visitor", visitorSchema);
