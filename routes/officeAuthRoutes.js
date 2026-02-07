// routes/officeAuthRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/**
 * OFFICE LOGIN (Super Admin, Admin, Office Staff)
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

    // Role check
    if (!["Super Admin", "Admin", "Office Staff"].includes(user.role))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.active) return res.status(403).json({ message: "Account inactive" });

    // CREATE JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

res.json({
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  },
});
  } catch (err) {
    console.error("Office login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * CREATE DEFAULT ADMIN (RUN ONCE)
 */
router.post("/create-default-admin", async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: "Admin" });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already exists" });

    const defaultAdmin = new User({
      name: "Admin",
      email: "admin@example.com",
      password: "Admin123!", // hashed in pre-save
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

/**
 * CREATE SUPER ADMIN (RUN ONCE)
 */
router.post("/create-super-admin", async (req, res) => {
  try {
    const exist = await User.findOne({ role: "Super Admin" });
    if (exist)
      return res.status(400).json({ message: "Super Admin already exists" });

    const superAdmin = new User({
      name: "Super Admin",
      email: "superadmin@office.com",
      password: "SuperAdmin123!",
      role: "Super Admin",
      active: true,
    });

    await superAdmin.save();

    res.json({
      message: "Super Admin created",
      email: superAdmin.email,
      password: "SuperAdmin123!",
    });
  } catch (err) {
    console.error("Failed to create Super Admin:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
