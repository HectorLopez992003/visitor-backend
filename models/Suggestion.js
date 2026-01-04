import mongoose from "mongoose";

const suggestionSchema = new mongoose.Schema({
  visitorName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Suggestion", suggestionSchema);
