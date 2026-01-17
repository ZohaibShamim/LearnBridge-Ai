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

export default cvQueue;
