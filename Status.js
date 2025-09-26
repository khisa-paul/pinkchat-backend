import mongoose from "mongoose";

const StatusSchema = new mongoose.Schema({
  user: String,
  filePath: String,
  createdAt: { type: Date, default: Date.now, expires: "24h" }
});

export default mongoose.model("Status", StatusSchema);
