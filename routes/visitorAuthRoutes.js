import express from "express";
import bcrypt from "bcryptjs";
import VisitorAccount from "../models/VisitorAccount.js";

const router = express.Router();

/**
 * REGISTER (ONLINE VISITORS ONLY)
 */
router.post("/register", async (req, res) => {
  try {
    console.log("=== Register Request ===");
    console.log("Request body:", req.body);

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log("Missing fields in request");
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existing = await VisitorAccount.findOne({ email });
    if (existing) {
      console.log("Email already registered:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await VisitorAccount.create({
      name,
      email,
      password: hashedPassword
    });

    console.log("✅ New account created:", account);
    res.json(account);
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Registration failed" });
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
