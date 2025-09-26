// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./db.js";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// ✅ Configure CORS properly for frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // frontend URL (set in .env for production)
    credentials: true,
  })
);

// Connect MongoDB
connectDB();

// Simple test route
app.get("/", (req, res) => {
  res.send("✅ PinkChat Backend is running!");
});

// Create HTTP server for socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

// Handle socket connections
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

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
