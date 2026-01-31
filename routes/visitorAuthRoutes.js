import express from "express";
import bcrypt from "bcryptjs";
import VisitorAccount from "../models/VisitorAccount.js";
import { sendEmail } from "../utils/email.js"; // make sure this exists
import crypto from "crypto";

const router = express.Router();

/**
 * REGISTER (ONLINE VISITORS ONLY) with contact number & verification
 */
router.post("/register", async (req, res) => {
  try {
    console.log("=== Register Request ===");
    console.log("Request body:", req.body);

    const { name, email, password, contactNumber } = req.body;

    if (!name || !email || !password || !contactNumber) {
      console.log("Missing fields in request");
      return res.status(400).json({ message: "Name, email, password, and contact number are required" });
    }

    const existing = await VisitorAccount.findOne({ email });
    if (existing) {
      console.log("Email already registered:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const account = await VisitorAccount.create({
      name,
      email,
      password: hashedPassword,
      contactNumber,
      verificationCode,
      isVerified: false
    });

    // send verification email
    const emailResult = await sendEmail(
      email,
      "Verify your email",
      `Hello ${name},\n\nYour verification code is: ${verificationCode}\n\nPlease enter this code to complete your registration.`
    );

    console.log("📧 Email result:", emailResult);
    console.log("✅ New account created:", account);

    res.status(201).json({ accountId: account._id, emailSent: emailResult.success });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/**
 * SEND VERIFICATION CODE (for FE 'Send Verification Code' button)
 */
router.post("/send-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const account = await VisitorAccount.findOne({ email });
    if (!account) return res.status(404).json({ message: "Account not found" });

    // generate new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    account.verificationCode = verificationCode;
    await account.save();

    const emailResult = await sendEmail(
      email,
      "Verify your email",
      `Hello ${account.name},\n\nYour verification code is: ${verificationCode}\n\nPlease enter this code to complete your registration.`
    );

    console.log("📧 Send-code result:", emailResult);
    res.json({ success: emailResult.success });
  } catch (err) {
    console.error("❌ Send-code error:", err);
    res.status(500).json({ message: "Failed to send verification code" });
  }
});

/**
 * VERIFY EMAIL
 */
router.post("/verify", async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const account = await VisitorAccount.findOne({ email });
    if (!account) return res.status(404).json({ message: "Account not found" });

    if (account.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    if (account.verificationCode !== verificationCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    account.isVerified = true;
    account.verificationCode = undefined; // clear code
    await account.save();

    res.json({ message: "Email verified successfully", accountId: account._id });
  } catch (err) {
    console.error("❌ Verification error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

/**
 * LOGIN (ONLINE VISITORS ONLY)
 */
router.post("/login", async (req, res) => {
  try {
    console.log("=== Login Request ===");
    console.log("Request body:", req.body);

    const { email, password } = req.body;

    const account = await VisitorAccount.findOne({ email });
    if (!account) {
      console.log("Invalid login - email not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!account.isVerified) {
      return res.status(400).json({ message: "Email not verified. Please verify before login." });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      console.log("Invalid login - password mismatch for:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("✅ Login successful:", account);
    res.json(account);
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
