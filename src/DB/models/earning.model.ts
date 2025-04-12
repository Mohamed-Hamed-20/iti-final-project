import { Schema, model } from "mongoose";

const earningsSchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    totalInstructorEarnings: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAdminEarnings: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

earningsSchema.index({ instructorId: 1 }, { unique: true });

const EarningsModel = model("earning", earningsSchema);
export default EarningsModel;
