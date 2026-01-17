import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadCvOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      folder: "cv_images",
      allowed_formats: ["jpg", "jpeg", "png"],
    });

    return response;
  } catch (error) {
    console.error("Cloudinary Upload Failed Error Details:", error);
    return null;
  } finally {
    try {
      await fs.unlink(localFilePath);
    } catch (e) {
      if (e.code === "ENOENT") {
        console.warn("File already deleted or not found:", localFilePath);
      } else {
        console.error("Failed to delete local file:", e.message);
      }
    }
  }
};
