import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,     // smtp.gmail.com
  port: process.env.SMTP_PORT,     // 587 for TLS
  secure: false,                   // false for TLS
  auth: {
    user: process.env.SMTP_USER,   // your Gmail
    pass: process.env.SMTP_PASS,   // app password
  },
});

export const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,  // sender address
      to,                           // recipient
      subject,                      // subject line
      text,                         // plain text body
    });

    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Email error:", err);
    return { success: false, error: err.message };
  }
};
