import { Request, Response } from "express";
import { INotification } from "../../DB/interfaces/notification.interface";
import { Iuser } from "../../DB/interfaces/user.interface";
import { Notification } from "../../DB/models/notification.model";

interface AuthenticatedRequest extends Request {
  user?: Iuser;
}

export const createNotification = async (
  userId: string,
  targetId: string,
  type: string = "course"
): Promise<INotification> => {
  const message =
    type !== "course"
      ? "Your course has been submitted for review. We'll notify you once it's approved."
      : "Your support ticket has been created. We'll get back to you soon.";

  const notification = new Notification({
    userId,
    courseId: type === "course" ? targetId : undefined,
    ticketId: type === "ticket" ? targetId : undefined,
    message,
  });
  return await notification.save();
};

export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const notifications: INotification[] = await Notification.find({
    userId: req.user!._id,
  }).sort({ createdAt: -1 });
  res.status(200).json({ notifications });
};

export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const result = await Notification.updateMany(
    {
      userId: req.user!._id,
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json({
    message: `${result.modifiedCount} notifications marked as read`,
  });
};
