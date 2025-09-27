// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// ✅ Configure CORS for frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // frontend URL (set in .env for production)
    credentials: true,
  })
);

// ====================
// MongoDB Connection
// ====================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};
connectDB();

// ====================
// User Schema
// ====================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
});
const User = mongoose.model("User", userSchema);

// ====================
// Routes
// ====================

// Test route
app.get("/", (req, res) => {
  res.send("✅ PinkChat Backend is running!");
});

// Login/Register route
app.post("/auth/login", async (req, res) => {
  const { username, phone } = req.body;
  if (!username || !phone) {
    return res.status(400).json({ message: "Username and phone required" });
  }

  try {
    let user = await User.findOne({ phone });

    if (!user) {
      // Register new user
      user = new User({ username, phone });
      await user.save();
      console.log("🟢 New user registered:", username, phone);
    } else {
      console.log("🔵 Existing user logged in:", username, phone);
    }

    res.json({ user, message: "Login successful" });
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ====================
// Socket.io Setup
// ====================
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  socket.on("sendMessage", (data) => {
    console.log("💬 Message received:", data);
    io.emit("receiveMessage", data); // broadcast to all clients
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ====================
// Start Server
// ====================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
