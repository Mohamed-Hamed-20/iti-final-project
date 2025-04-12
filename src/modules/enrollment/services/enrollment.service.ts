import { Types } from 'mongoose';
import { IEnrollment } from '../../../DB/interfaces/enrollment.interface';
import courseModel from '../../../DB/models/courses.model';
import EnrollmentModel from '../../../DB/models/enrollment.model';
import { ICourse } from '../../../DB/interfaces/courses.interface';
import S3Instance from '../../../utils/aws.sdk.s3';

class EnrollmentService {
  async enrollInCourse(userId: string, courseId: string) {
    // Run course check and enrollment check in parallel
    const [course, existingEnrollment] = await Promise.all([
      courseModel.findById(courseId).select('access_type').lean(),
      EnrollmentModel.findOne({
        userId,
        courseId
      }).lean()
    ]);

    if (!course) {
      throw new Error('Course not found');
    }

    if (existingEnrollment) {
      throw new Error('You are already enrolled in this course');
    }

    // Create enrollment without population
    const enrollment = await EnrollmentModel.create({
      userId,
      courseId,
      enrollmentDate: new Date(),
      status: 'active',
      progress: 0,
      paymentStatus: course.access_type === 'free' ? 'completed' : 'pending'
    });

    // Return minimal necessary data without population
    return enrollment;
  }

  async getEnrollments(userId: string, filters: Partial<IEnrollment> = {}) {
    const enrollments = await EnrollmentModel.find({
      userId,
      ...filters
    })
      .populate<{ course: ICourse }>('course', 'title thumbnail description totalVideos totalDuration')
      .sort({ createdAt: -1 })
      .lean(); 

    const s3Instance = new S3Instance();

    const processedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        if (!enrollment.course) return enrollment;

        let url = null;
        if (enrollment.course.thumbnail) {
          url = await s3Instance.getFile(enrollment.course.thumbnail);
        }

        const formattedDuration = enrollment.course.totalDuration
          ? enrollment.course.totalDuration < 3600
            ? `${Math.floor(enrollment.course.totalDuration / 60)}m`
            : `${Math.floor(enrollment.course.totalDuration / 3600)}h ${Math.floor((enrollment.course.totalDuration % 3600) / 60)}m`
          : "0m";

        return {
          ...enrollment,
          course: {
            ...enrollment.course,
            url,
            totalDuration: formattedDuration
          }
        };
      })
    );

    return processedEnrollments;
  }


  async getEnrollmentById(userId: string, enrollmentId: string) {
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId
    }).populate('course');

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    return enrollment;
  }

  async updateProgress(userId: string, enrollmentId: string, progress: number) {
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status === 'cancelled') {
      throw new Error('Cannot update progress for cancelled enrollment');
    }

    enrollment.progress = Math.min(Math.max(0, progress), 100);
    await enrollment.save();

    return enrollment;
  }

  async cancelEnrollment(userId: string, enrollmentId: string) {
    const enrollment = await EnrollmentModel.findOne({
      _id: enrollmentId,
      userId
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.paymentStatus === 'completed') {
      throw new Error('Cannot cancel paid enrollment. Please request a refund instead.');
    }

    enrollment.status = 'cancelled';
    await enrollment.save();

    return enrollment;
  }

  async getEnrollmentStats(courseId: string) {
    const stats = await EnrollmentModel.aggregate([
      {
        $match: { courseId: new Types.ObjectId(courseId) }
      },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          activeEnrollments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          completedEnrollments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          averageProgress: { $avg: '$progress' }
        }
      },
      {
        $project: {
          _id: 0,
          totalEnrollments: 1,
          activeEnrollments: 1,
          completedEnrollments: 1,
          averageProgress: { $round: ['$averageProgress', 1] }
        }
      }
    ]);

    return stats[0] || {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      averageProgress: 0
    };
  }
}

export default new EnrollmentService(); 