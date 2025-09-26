import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  fileUrl: String,
  delivered: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Message", MessageSchema);
