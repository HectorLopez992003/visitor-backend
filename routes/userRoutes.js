import express from "express";
import User from "../models/User.js";
import { verifyJWT, requireRole } from "../middleware/auth.js"; // ✅ JWT + role middleware

const router = express.Router();

// GET /users → Protected route (Admin & Super Admin only)
router.get("/", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /users → Add user
router.post("/", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ name, email, password, role, active });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to create user" });
  }
});

// PUT /users/:id → Edit user
router.put("/:id", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "Super Admin") {
      return res.status(403).json({ message: "Super Admin cannot be modified" });
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.role = role ?? user.role;
    user.active = active ?? user.active;
    if (password) user.password = password;

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to update user" });
  }
});

// PUT /users/:id/toggle-status → Activate/Deactivate
router.put("/:id/toggle-status", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "Super Admin") {
      return res.status(403).json({ message: "Super Admin cannot be deactivated" });
    }

    user.active = !user.active;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle status" });
  }
});

export default router;
