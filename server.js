// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import connectDB from "./db.js";

// Load environment variables
dotenv.config();

// ==========================
// MongoDB Models
// ==========================
const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const statusSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    imageUrl: { type: String },
    text: { type: String },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
const Status = mongoose.model("Status", statusSchema);

// ==========================
// Express Setup
// ==========================
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// ✅ Configure CORS properly
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // frontend URL from .env
    credentials: true,
  })
);

// ==========================
// MongoDB Connection
// ==========================
connectDB();

// ==========================
// REST API Routes
// ==========================

// Test route
app.get("/", (req, res) => {
  res.send("✅ PinkChat Backend is running!");
});

// Get all messages
app.get("/api/messages", async (req, res) => {
  const messages = await Message.find().sort({ createdAt: 1 });
  res.json(messages);
});

// Save new message
app.post("/api/messages", async (req, res) => {
  const { sender, text } = req.body;
  const newMessage = new Message({ sender, text });
  await newMessage.save();
  res.status(201).json(newMessage);
});

// Get all statuses
app.get("/api/statuses", async (req, res) => {
  const statuses = await Status.find().sort({ createdAt: -1 });
  res.json(statuses);
});

// Post a new status
app.post("/api/statuses", async (req, res) => {
  const { user, imageUrl, text } = req.body;
  const newStatus = new Status({ user, imageUrl, text });
  await newStatus.save();
  res.status(201).json(newStatus);
});

// ==========================
// Socket.io Setup
// ==========================
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  socket.on("sendMessage", async (data) => {
    console.log("💬 Message received:", data);

    // Save to DB
    const newMessage = new Message({
      sender: data.sender,
      text: data.text,
    });
    await newMessage.save();

    // Broadcast to all clients
    io.emit("receiveMessage", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ==========================
// Start Server
// ==========================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
