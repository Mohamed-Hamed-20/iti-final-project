import { Request, Response } from 'express';
import reviewService from '../services/review.service';

class ReviewController {
  async createReview(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const review = await reviewService.createReview(
      userId.toString(),
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully',
      data: review
    });
  }

  async getReviews(req: Request, res: Response) {
    const reviews = await reviewService.getReviews(req.query);

    res.status(200).json({
      status: 'success',
      message: 'Reviews retrieved successfully',
      data: reviews
    });
  }

  async getReviewById(req: Request, res: Response) {
    const { id } = req.params;
    const review = await reviewService.getReviewById(id);

    res.status(200).json({
      status: 'success',
      message: 'Review retrieved successfully',
      data: review
    });
  }

  async updateReview(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    const review = await reviewService.updateReview(
      id,
      userId.toString(),
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Review updated successfully',
      data: review
    });
  }

  async deleteReview(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) throw new Error('User not authenticated');

    await reviewService.deleteReview(id, userId.toString());

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  }

  async getReviewStats(req: Request, res: Response) {
    const { referenceId, referenceType } = req.params;
    const stats = await reviewService.getReviewStats(
      referenceId,
      referenceType as 'course' | 'instructor'
    );

    res.status(200).json({
      status: 'success',
      message: 'Review statistics retrieved successfully',
      data: stats
    });
  }
}

export default new ReviewController(); 