import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis();

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
