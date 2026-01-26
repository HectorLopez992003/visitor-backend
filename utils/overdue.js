import { sendEmail } from "./email.js";

export const sendOverdueEmail = async (user, type) => {
  const subject =
    type === "visitor"
      ? "Overdue Visitor Notification"
      : "Overdue Appointment Notification";

  try {
    const result = await sendEmail(
      user.email,
      subject,
      `Hello ${user.name}, you exceeded 30 mins after office processing. Please return to the guard.`
    );

    if (!result.success) throw new Error(result.error || "Unknown error");

    user.overdueEmailSent = true;
    await user.save();
    console.log(`📧 Overdue email sent to ${type}: ${user.email}`);

    return { success: true };
  } catch (err) {
    console.error(`❌ Email failed for ${type} ${user.email}:`, err.message);
    return { success: false, error: err.message };
  }
};
