import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: false }, // ✅ Added email
    office: { type: String, required: true },
    purpose: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },
    idFile: String,
    qrData: String,

    processingStartedTime: Date,
    officeProcessedTime: Date,
    timeIn: Date,
    timeOut: Date,
    processed: { type: Boolean, default: false },

    feedback: { type: String, default: "" },

    // 🔔 Email notification flag
    overdueEmailSent: { 
      type: Boolean, 
      default: false 
    },

    // ✅ ACCEPT / DECLINE STATUS
    accepted: {
      type: Boolean,
      default: null // null = pending, true = accepted, false = declined
    }
  },
  { timestamps: true }
);

// ✅ Virtual status
appointmentSchema.virtual("status").get(function () {
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

appointmentSchema.set("toJSON", { virtuals: true });
appointmentSchema.set("toObject", { virtuals: true });

export default mongoose.model("Appointment", appointmentSchema);
