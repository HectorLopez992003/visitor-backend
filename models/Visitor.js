import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    // BASIC INFO
    name: String,
    contactNumber: String,
    email: String,
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
    overdueEmailSent: {
      type: Boolean,
      default: false
    },

    // ✅ ACCEPT / DECLINE STATUS
    accepted: {
      type: Boolean,
      default: null
    },

    // 🆕 FIX: prevent duplicate accept/decline emails
    acceptDeclineEmailSent: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/////////////////////////////////////////////////////
// 🚀 PERFORMANCE INDEXES (THIS FIXES SLOW LOAD)
/////////////////////////////////////////////////////

// Used when registering new visitor
visitorSchema.index({ contactNumber: 1, timeOut: 1 });

// Used for checking daily bookings
visitorSchema.index({ contactNumber: 1, scheduledDate: 1 });

// Used in GET visitors list
visitorSchema.index({ createdAt: -1 });

// Used in filtering accepted visitors
visitorSchema.index({ accepted: 1 });

/////////////////////////////////////////////////////

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
