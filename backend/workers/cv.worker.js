import dotenv from "dotenv";
dotenv.config();
import { Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import mongoose from "mongoose";
import { Job } from "../models/jobs.schema.js";
import { extractTextFromCV } from "../utils/ocr.js";

let connection;

if (process.env.REDIS_URL) {
  console.log("Using Redis URL from environment variable");
  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
} else {
  console.log("No Redis URL provided, connecting to local Redis");
  connection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });
}

const axiosClient = axios.create({
  baseURL: process.env.FASTAPI_URL,
  // AI roadmap gen (LLM up to 60s + per-step enrichment up to 25s) can exceed 30s on a slow
  // machine; a short timeout here fails the job while the AI service is still running. 3 min default.
  timeout: Number(process.env.ROADMAP_TIMEOUT_MS) || 180000,
});

async function init() {
  // connect mongoose for Job model operations
  await mongoose.connect(process.env.MONGO_URI);

  new Worker(
    "cv-processing",
    async (job) => {
      // Destructure with default value for role
      const { jobId, cvUrl, role = null, fileType = "image" } = job.data;

      console.log("[Worker] Processing job with data:", JSON.stringify(job.data, null, 2));
      console.log("[Worker] Role extracted from job:", role);
      console.log("[Worker] Role type:", typeof role);

      if (!jobId) throw new Error("Missing jobId in job data");

      try {
        await Job.findByIdAndUpdate(jobId, { status: "processing" });

        // PDF/DOCX text is extracted inline at upload time; reuse it. Only run (slow) OCR
        // when there's no text yet (images, or a scanned PDF with no text layer).
        const jobDoc = await Job.findById(jobId);
        let extractedText = jobDoc?.extractedText?.trim() ? jobDoc.extractedText : "";
        if (!extractedText) {
          extractedText = await extractTextFromCV(cvUrl, fileType);
          await Job.findByIdAndUpdate(jobId, { extractedText });
        }

        // Construct payload - MAKE SURE role is included
        const payload = { 
          job_id: jobId, 
          cv_text: extractedText,
          role: role  // This should work if role exists in job.data
        };

        console.log("[Worker] Payload being sent to Python:");
        console.log(JSON.stringify(payload, null, 2));
        console.log("[Worker] Payload keys:", Object.keys(payload));
        console.log("[Worker] Payload.role value:", payload.role);
        console.log("[Worker] Payload.role is undefined?", payload.role === undefined);
        console.log("[Worker] Payload.role is null?", payload.role === null);

        let response;
        try {
          response = await axiosClient.post("/ai/roadmap", payload, {
            headers: {
              'Content-Type': 'application/json',
            }
          });
          console.log("AI API response data:", response.data);
        } catch (apiErr) {
          console.error("AI API call failed:", apiErr.message);
          if (apiErr.response) {
            console.error("AI API error status:", apiErr.response.status);
            console.error("AI API error data:", apiErr.response.data);
          }
          throw apiErr;
        }

        await Job.findByIdAndUpdate(jobId, {
          roadmap: response.data?.roadmap || null,
          tags: response.data?.tags || [],
          extractedSkills: response.data?.extracted_skills || [],
          requiredSkills: response.data?.required_skills || [],
          missingSkills: response.data?.missing_skills || [],
          status: "completed",
        });
      } catch (err) {
        try {
          if (jobId) {
            await Job.findByIdAndUpdate(jobId, {
              status: "failed",
              error: err?.message || String(err),
            });
          }
        } catch (updateErr) {
          console.error("Failed to update job status:", updateErr);
        }
        throw err;
      }
    },
    { connection }
  );

  const shutdown = async () => {
    try {
      await connection.disconnect();
      await mongoose.disconnect();
      process.exit(0);
    } catch (e) {
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

init().catch((e) => {
  console.error("Worker init failed:", e);
  process.exit(1);
});