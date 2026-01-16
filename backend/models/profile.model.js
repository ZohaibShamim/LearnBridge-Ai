import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    profileUrl: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
    },
    education: [
      {
        degree: { type: String, required: true },
        institution: { type: String, required: true },
        year: { type: Number },
        gpa: { type: Number },
      },
    ],
    skills: [{ type: String }],
    experience: [
      {
        jobTitle: { type: String },
        company: { type: String },
        duration: { type: String },
      },
    ],
    careerGoals: { type: String },
  },
  { timestamps: true }
);

export const Profile = mongoose.model("Profile", profileSchema);
