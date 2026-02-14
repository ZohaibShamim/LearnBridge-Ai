import dotenv from "dotenv";
dotenv.config();
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
      // Destructure with default value for role
      const { jobId, cvUrl, role = null } = job.data;

      console.log("[Worker] Processing job with data:", JSON.stringify(job.data, null, 2));
      console.log("[Worker] Role extracted from job:", role);
      console.log("[Worker] Role type:", typeof role);

      if (!jobId) throw new Error("Missing jobId in job data");

      try {
        await Job.findByIdAndUpdate(jobId, { status: "processing" });

        const extractedText = await extractTextFromCV(cvUrl);

        await Job.findByIdAndUpdate(jobId, { extractedText });

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