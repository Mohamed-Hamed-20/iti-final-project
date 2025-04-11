import { Types } from 'mongoose';

export interface IEnrollment {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  enrollmentDate?: Date;
  isCartOrder?: boolean;
  cartCourses?: Types.ObjectId[];
  status: 'active' | 'completed' | 'cancelled';
  progress?: number;
  lastAccessedAt?: Date;
  completedAt?: Date;
  certificateIssued?: boolean;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  createdAt?: Date;
  updatedAt?: Date;
}
