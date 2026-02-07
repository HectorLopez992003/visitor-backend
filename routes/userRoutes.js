import express from "express";
import User from "../models/User.js";
import { verifyJWT, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /users → Admin & Super Admin
router.get("/", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /users → Add user
router.post("/", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ name, email, password, role, active: active ?? true });
    res.json(user);
  } catch (err) {
    console.error("POST /users error:", err);
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
    console.error("PUT /users/:id error:", err);
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
    console.error("PUT /users/:id/toggle-status error:", err);
    res.status(500).json({ message: "Failed to toggle status" });
  }
});

// DELETE /users/:id → Delete user
router.delete("/:id", verifyJWT, requireRole("Admin", "Super Admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "Super Admin") {
      return res.status(403).json({ message: "Super Admin cannot be deleted" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully", _id: user._id });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
