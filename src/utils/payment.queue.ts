import Queue from "bull";
import { Types } from "mongoose";
import { EARNING_PERCENTAGE, REDIS } from "../config/env";
import { CustomError } from "./errorHandling";
import EarningsModel from "../DB/models/earning.model";

const PaymentQueue = new Queue("update-instructor-earnings", {
  redis: { host: REDIS.HOST, port: REDIS.PORT },
});

export const bulkUpdateInstructorEarnings = async (
  instructorId: Types.ObjectId,
  totalAmount: number
) => {
  if (!instructorId || typeof totalAmount !== "number") {
    throw new CustomError("instructorId and totalAmount are required", 500);
  }
  await PaymentQueue.add(
    {
      instructorId,
      totalAmount,
    },
    { attempts: 1, backoff: 5000, removeOnComplete: true, removeOnFail: true }
  );
};

PaymentQueue.process(async (job) => {
  const { instructorId, totalAmount } = job.data;

  if (!instructorId || typeof totalAmount !== "number") {
    throw new CustomError("instructorId and totalAmount are required", 500);
  }

  const instructorEarnings = await EarningsModel.findOne({ instructorId });
  if (!instructorEarnings) {
    const newEarnings = await EarningsModel.create({
      instructorId,
      totalInstructorEarnings:
        totalAmount * (EARNING_PERCENTAGE.INSTRUCTOR / 100),
      totalAdminEarnings: totalAmount * (EARNING_PERCENTAGE.ADMIN / 100),
    });

    return newEarnings;
  }

  instructorEarnings.totalInstructorEarnings +=
    totalAmount * (EARNING_PERCENTAGE.INSTRUCTOR / 100);
  instructorEarnings.totalAdminEarnings +=
    totalAmount * (EARNING_PERCENTAGE.ADMIN / 100);

  const updatedInstructorEarnings = await instructorEarnings.save();
  return updatedInstructorEarnings;
});

// Handle job failures
PaymentQueue.on("failed", async (job, err) => {
  await EarningsModel.findOneAndDelete({ instructorId: job.data.instructorId });
  console.error(
    `Job failed for update instructor earnings ${job.data.instructorId}: ${err.message}`
  );
});

// Handle successful job completion
PaymentQueue.on("completed", async (job) => {
  console.log(
    `earnign updated success completed for: ${job.data.instructorId}`
  );
});
