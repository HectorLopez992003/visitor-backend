import cron from "node-cron";
import Visitor from "../models/Visitor.js";
import Appointment from "../models/Appointment.js";
import { sendEmail } from "./email.js";

// Run every minute
cron.schedule("* * * * *", async () => {
  try {
    const now = Date.now();

    // --- Walk-in Visitors ---
    const walkinVisitors = await Visitor.find({
      officeProcessedTime: { $ne: null },
      timeOut: null,
      overdueEmailSent: false,
      email: { $ne: null },
    });

    for (const visitor of walkinVisitors) {
      const processedTime = new Date(visitor.officeProcessedTime).getTime();
      if (now - processedTime > 30 * 60 * 1000) {
        const result = await sendEmail(
          visitor.email,
          "Overdue Visitor Notification",
          `Hello ${visitor.name}, you exceeded 30 minutes after office processing. Please return to the guard for timeout.`
        );
        if (result.success) {
          visitor.overdueEmailSent = true;
          await visitor.save();
          console.log(`✅ Email sent to visitor: ${visitor.email}`);
        } else {
          console.error(`❌ Failed to send email to visitor ${visitor.email}:`, result.error);
        }
      }
    }

    // --- Online Appointments ---
    const onlineAppointments = await Appointment.find({
      officeProcessedTime: { $ne: null },
      timeOut: null,
      overdueEmailSent: false,
      email: { $ne: null },
    });

    for (const appt of onlineAppointments) {
      const processedTime = new Date(appt.officeProcessedTime).getTime();
      if (now - processedTime > 30 * 60 * 1000) {
        const result = await sendEmail(
          appt.email,
          "Overdue Appointment Notification",
          `Hello ${appt.name}, you exceeded 30 minutes after office processing. Please return to the guard for timeout.`
        );
        if (result.success) {
          appt.overdueEmailSent = true;
          await appt.save();
          console.log(`✅ Email sent to appointment: ${appt.email}`);
        } else {
          console.error(`❌ Failed to send email to appointment ${appt.email}:`, result.error);
        }
      }
    }
  } catch (err) {
    console.error("❌ Cron job error:", err);
  }
});
