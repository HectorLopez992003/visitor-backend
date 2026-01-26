import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async (to, subject, text) => {
  try {
    console.log("📨 Sending email to:", to);
    console.log("📡 Using SMTP:", "smtp.gmail.com:587");

    const info = await transporter.sendMail({
      from: `"Visitor System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Email error FULL:", err);
    return { success: false, error: err.message };
  }
};
