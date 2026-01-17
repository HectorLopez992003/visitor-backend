import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    // BASIC INFO
    name: String,
    contactNumber: String,
    email: String, // ✅ Added email
    office: String,
    purpose: String,

    // ONLINE APPOINTMENT FIELDS
    scheduledDate: Date,
    scheduledTime: String,

    // SYSTEM TIME LOGS
    timeIn: Date,
    timeOut: Date,

    processingStartedTime: Date,
    officeProcessedTime: Date,

    processed: { type: Boolean, default: false },
    idFile: String,

    registrationType: {
      type: String,
      enum: ["SYSTEM", "ONLINE"],
      required: true
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitorAccount",
      default: null
    },

    feedback: {
      type: String,
      default: ""
    },

    qrData: String,

    // 🔔 NOTIFICATIONS
    overdueSmsSent: {
      type: Boolean,
      default: false
    },
    overdueEmailSent: { // ✅ Added email notification flag
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// ✅ Virtual status
visitorSchema.virtual("status").get(function () {
  const now = new Date();

  if (this.officeProcessedTime) return "PROCESSED";
  if (this.processingStartedTime) return "PROCESSING";

  if (this.scheduledDate && this.scheduledTime) {
    const sched = new Date(this.scheduledDate);
    const [h, m] = this.scheduledTime.split(":").map(Number);
    sched.setHours(h, m, 0, 0);

    if (now > sched && !this.officeProcessedTime && !this.processingStartedTime)
      return "OVERDUE";
  }

  return "PENDING";
});

visitorSchema.set("toJSON", { virtuals: true });
visitorSchema.set("toObject", { virtuals: true });

export default mongoose.model("Visitor", visitorSchema);
