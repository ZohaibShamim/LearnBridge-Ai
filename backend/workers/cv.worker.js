import dotenv from "dotenv";
dotenv.config();
// ...existing code...
import { Worker } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import mongoose from "mongoose";
import { Job } from "../models/jobs.schema.js";
import { extractTextFromCV } from "../utils/ocr.js";

const redisOptions = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };

const connection = new IORedis(redisOptions);

const axiosClient = axios.create({
  baseURL: process.env.FASTAPI_URL,
  timeout: Number(process.env.ROADMAP_TIMEOUT_MS) || 30000,
});

async function init() {
  // connect mongoose for Job model operations
  await mongoose.connect(process.env.MONGO_URI);

  new Worker(
    "cv-processing",
    async (job) => {
      const { jobId, cvUrl } = job.data;

      if (!jobId) throw new Error("Missing jobId in job data");

      try {
        await Job.findByIdAndUpdate(jobId, { status: "processing" });

        const extractedText = await extractTextFromCV(cvUrl);

        await Job.findByIdAndUpdate(jobId, { extractedText });

        const payload = { job_id: jobId, cv_text: extractedText };


        let response;
        try {
          response = await axiosClient.post("/ai/roadmap", payload);
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
          status: "completed",
        });
      } catch (err) {
        // attempt to persist failure info, but don't let DB errors hide original error
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

  // graceful shutdown
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
// ...existing code...