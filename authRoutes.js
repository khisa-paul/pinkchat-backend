import express from "express";
import User from "./User.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    const exists = await User.findOne({ phone });
    if (exists) return res.status(400).json({ msg: "User already exists" });

    const user = new User({ username, phone, password });
    await user.save();
    res.json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    res.json({ msg: "Login successful", user: { username: user.username, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Forgot Password (placeholder)
router.post("/forgot", async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ msg: "User not found" });

    res.json({ msg: "Password reset feature coming soon" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
