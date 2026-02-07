import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// Basic JWT verification
export const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to req.user
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Role-based access control
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient privileges" });
    }
    next();
  };
};
