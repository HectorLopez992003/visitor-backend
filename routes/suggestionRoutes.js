import express from "express";
import Suggestion from "../models/Suggestion.js";

const router = express.Router();

// POST suggestion
router.post("/", async (req, res) => {
  try {
    const { visitorName, contactNumber, message } = req.body; // use contactNumber
    const suggestion = await Suggestion.create({
      visitorName,
      contactNumber, 
      message
    });
    res.status(201).json({ suggestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save suggestion" });
  }
});

// GET all suggestions (admin)
router.get("/", async (req, res) => {
  try {
    const suggestions = await Suggestion.find().sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

export default router;
