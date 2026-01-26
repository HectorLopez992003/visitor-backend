import { sendEmail } from "./utils/email.js";

(async () => {
  const result = await sendEmail(
    "hectorjoshlopez@gmail.com",
    "Test Email",
    "Hello! This is a test email from your Visitor Management System."
  );
  console.log(result);
})();
