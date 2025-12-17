import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    name: String,
    visitorID: String,
    office: String,
    purpose: String,

    scheduledDate: Date,
    scheduledTime: String,

    timeIn: Date,
    timeOut: Date,

    processingStartedTime: Date,
    officeProcessedTime: Date,

    processed: { type: Boolean, default: false },

    idFile: String
  },
  { timestamps: true }
);

export default mongoose.model("Visitor", visitorSchema);
