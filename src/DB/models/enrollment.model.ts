import { Schema, model } from 'mongoose';
import { IEnrollment } from '../interfaces/enrollment.interface';

const enrollmentSchema = new Schema<IEnrollment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: [true, 'User ID is required']
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'course',
      required: [true, 'Course ID is required']
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    certificateIssued: {
      type: Boolean,
      default: false
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      required: [true, 'Payment status is required'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ paymentStatus: 1 });

// Virtual populate for user
enrollmentSchema.virtual('user', {
  ref: 'user',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual populate for course
enrollmentSchema.virtual('course', {
  ref: 'course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to update lastAccessedAt
enrollmentSchema.pre('save', function(next) {
  if (this.isModified('progress')) {
    this.lastAccessedAt = new Date();
  }
  next();
});

// Pre-save middleware to check completion
enrollmentSchema.pre('save', function(next) {
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  next();
});

const EnrollmentModel = model<IEnrollment>('enrollment', enrollmentSchema);

export default EnrollmentModel;
