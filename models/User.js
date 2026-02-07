import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,   // 🔥 normalize emails
    trim: true
  },

  password: { 
    type: String, 
    required: true     // 🔥 must have password
  },

role: { 
  type: String, 
  enum: ["Super Admin", "Admin", "Office Staff", "Guard"], 
  default: "Guard" 
},

  active: { 
    type: Boolean, 
    default: true 
  }

}, { timestamps: true });

/* ======================
   HASH PASSWORD
====================== */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();  // 🔥 avoid rehash

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

/* ======================
   PASSWORD COMPARE METHOD
====================== */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
