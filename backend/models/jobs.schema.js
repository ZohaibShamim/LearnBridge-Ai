import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  status: {
    type: String,
    enum: ["uploaded", "processing", "completed", "failed"],
    default: "uploaded",
  },

  cvUrl: {
    type: String,
    required: true,
  },

  extractedText: {
    type: String,
  },

  roadmap: {
    type: Object,
  },

  error: {
    type: String,
  },
}, { timestamps: true });

export const Job = mongoose.model("Job", jobSchema);
