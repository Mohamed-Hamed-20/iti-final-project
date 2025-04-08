import { Schema, model } from 'mongoose';
import { IReview } from '../interfaces/review.interface';

const reviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'user'
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Reference ID is required']
    },
    referenceType: {
      type: String,
      required: [true, 'Reference type is required'],
      enum: ['course', 'instructor']
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5']
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [3, 'Comment must be at least 3 characters long']
    },
    isEnrolled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Prevent duplicate reviews from the same user
reviewSchema.index({ userId: 1, referenceId: 1, referenceType: 1 }, { unique: true });

// Virtual populate for course reviews
reviewSchema.virtual('course', {
  ref: 'course',
  localField: 'referenceId',
  foreignField: '_id',
  justOne: true,
  options: { match: { referenceType: 'course' } }
});

// Virtual populate for instructor reviews
reviewSchema.virtual('instructor', {
  ref: 'user',
  localField: 'referenceId',
  foreignField: '_id',
  justOne: true,
  options: { match: { referenceType: 'instructor' } }
});

// Middleware to validate user role and enrollment
reviewSchema.pre('save', async function(next) {
  try {
    const User = model('user');
    const Course = model('course');
    
    // Check if the reviewer is a regular user
    const user = await User.findById(this.userId);
    if (!user || user.role !== 'user') {
      throw new Error('Only users can submit reviews');
    }

    if (this.referenceType === 'course') {
      // For course reviews, check if user is enrolled
      const course = await Course.findById(this.referenceId);
      if (!course) {
        throw new Error('Course not found');
      }
      // Note: You'll need to implement the enrollment check based on your enrollment system
      // this.isEnrolled should be set based on your enrollment logic
    } else if (this.referenceType === 'instructor') {
      // For instructor reviews, check if user has taken any course from this instructor
      const instructorCourses = await Course.find({ instructorId: this.referenceId });
      // Note: You'll need to implement the enrollment check based on your enrollment system
      // this.isEnrolled should be set based on your enrollment logic
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

const ReviewModel = model<IReview>('review', reviewSchema);

export default ReviewModel;
