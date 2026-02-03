// routes/officeAuthRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

/**
 * OFFICE LOGIN (Admins + Office Staff)
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Only Admin or Office Staff can login here
    if (!["Admin", "Office Staff"].includes(user.role))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.active) return res.status(403).json({ message: "Account inactive" });

    // Return basic info (no password)
    res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    });
  } catch (err) {
    console.error("Office login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * CREATE DEFAULT ADMIN (Optional endpoint)
 */
router.post("/create-default-admin", async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: "Admin" });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already exists" });

    const defaultAdmin = new User({
      name: "Admin",
      email: "admin@example.com",
      password: "Admin123!", // will be hashed by schema
      role: "Admin",
      active: true,
    });

    await defaultAdmin.save();
    res.json({
      message: "Default Admin created",
      email: defaultAdmin.email,
      password: "Admin123!",
    });
  } catch (err) {
    console.error("Failed to create default admin:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
