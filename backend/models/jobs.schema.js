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

  // How to extract text from cvUrl: "image" (OCR), "pdf", or "docx".
  fileType: {
    type: String,
    enum: ["image", "pdf", "docx"],
    default: "image",
  },

  role: {
    type: String,
    enum: ["data_scientist", "software_engineer", "machine_learning", "ai"],
  },

  tags: [{
    type: String,
  }],

  // Skill analysis from the AI service (R1.6 extraction, R1.7 gap).
  extractedSkills: [{ type: String }],
  requiredSkills: [{ type: String }],
  missingSkills: [{ type: String }],

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
