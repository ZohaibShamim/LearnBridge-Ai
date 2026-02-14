import mongoose from "mongoose";

const stepSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    skills: [
      {
        type: String,
      },
    ],
    resources: {
      type: Object,
    },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  jobTitle: {
    type: String,
    required: true,
  },

  roadmap: {
    career_goal: {
      type: String,
    },
    steps: [stepSchema],
  },

  description: {
    type: String,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  tags: [
    {
      type: String,
    },
  ],

  skills: [
    {
      type: String,
    },
  ],

}, { timestamps: true });

export const Roadmap = mongoose.model("Roadmap", roadmapSchema);
