import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let connection;

if (process.env.REDIS_URL) {
  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
} else {
  connection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });
}

const cvQueue = new Queue("cv-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// Add event listeners for debugging
cvQueue.on("worker-active", (job) => {
  console.log("[Queue] Job added:", job.data);
});

export default cvQueue;
