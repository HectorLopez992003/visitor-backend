import express from "express";
import User from "../models/User.js";
import { verifyJWT } from "../middleware/auth.js"; // ✅ JWT middleware

const router = express.Router();

// GET /users → Protected route
router.get("/", verifyJWT, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /users → Add user (Protected route)
router.post("/", verifyJWT, async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;

    // Optional: only allow Admins or Super Admin to add users
    if (!["Admin", "Super Admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient privileges" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ name, email, password, role, active });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to create user" });
  }
});

// PUT /users/:id → Edit user (Protected route)
router.put("/:id", verifyJWT, async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🚨 PROTECT SUPER ADMIN
    if (user.role === "Super Admin") {
      return res.status(403).json({ message: "Super Admin cannot be modified" });
    }

    // Optional: only allow Admins or Super Admin to edit
    if (!["Admin", "Super Admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient privileges" });
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

// PUT /users/:id/toggle-status → Activate/Deactivate (Protected route)
router.put("/:id/toggle-status", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🚨 PROTECT SUPER ADMIN
    if (user.role === "Super Admin") {
      return res.status(403).json({ message: "Super Admin cannot be deactivated" });
    }

    // Optional: only allow Admins or Super Admin to toggle status
    if (!["Admin", "Super Admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient privileges" });
    }

    user.active = !user.active;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle status" });
  }
});

export default router;
