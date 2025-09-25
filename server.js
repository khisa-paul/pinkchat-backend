import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import webpush from "web-push";

import User from "./models/User.js";
import Message from "./models/Message.js";
import Status from "./models/Status.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/pinkchat");

// JWT secret
const JWT_SECRET = "supersecret";

// ========== Auth Routes ==========
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, password: hash });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.json({ token, username: user.username });
});

// ========== File Upload (Media + Status) ==========
const chatStorage = multer.diskStorage({
  destination: "uploads/chat",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const statusStorage = multer.diskStorage({
  destination: "uploads/status",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const chatUpload = multer({ storage: chatStorage });
const statusUpload = multer({ storage: statusStorage });

app.post("/upload", chatUpload.single("file"), (req, res) => {
  res.json({ fileUrl: req.file.path });
});

app.post("/status", statusUpload.single("status"), async (req, res) => {
  const { user } = req.body;
  const status = await Status.create({ user, filePath: req.file.path });
  res.json(status);
});

app.get("/status", async (req, res) => {
  const statuses = await Status.find().sort({ createdAt: -1 });
  res.json(statuses);
});

// ========== Web Push Setup ==========
const publicVapidKey = "YOUR_PUBLIC_KEY";
const privateVapidKey = "YOUR_PRIVATE_KEY";

webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  publicVapidKey,
  privateVapidKey
);

let subscriptions = [];

app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({});
});

const sendNotification = (message) => {
  subscriptions.forEach((sub) =>
    webpush.sendNotification(sub, JSON.stringify(message)).catch(console.error)
  );
};

// ========== Socket.IO Events ==========
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message", async (msg) => {
    const message = await Message.create(msg);
    io.emit("message", message);

    sendNotification({
      title: "New Message",
      body: `${msg.sender}: ${msg.text || "📎 Media"}`
    });
  });

  socket.on("typing", (user) => {
    socket.broadcast.emit("typing", user);
  });

  socket.on("stopTyping", (user) => {
    socket.broadcast.emit("stopTyping", user);
  });

  socket.on("statusUpdate", (user) => {
    io.emit("statusUpdate", user);

    sendNotification({
      title: "New Status Update",
      body: `${user} posted a new status`
    });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
