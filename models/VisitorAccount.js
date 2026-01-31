import mongoose from "mongoose";

const visitorAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    contactNumber: {
      type: String,
      required: true, // make it required if you always want it
      unique: false,  // set true if each number must be unique
    },
  },
  { timestamps: true }
);

export default mongoose.model("VisitorAccount", visitorAccountSchema);
