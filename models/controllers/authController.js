import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Office Login → allows Admin + Office Staff
export const officeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Allow only Admin or Office Staff
    if (!["Admin", "Office Staff"].includes(user.role))
      return res.status(401).json({ message: "Invalid credentials" });

    // Optionally check if account is active
    if (!user.active) return res.status(403).json({ message: "Account is inactive" });

    res.json({ name: user.name, email: user.email, role: user.role, active: user.active });
  } catch (err) {
    console.error("Office login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
