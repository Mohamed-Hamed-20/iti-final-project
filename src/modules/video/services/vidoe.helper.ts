import { Types } from "mongoose";
import { CustomError } from "../../../utils/errorHandling";
import { Isection } from "../../../DB/interfaces/videos.interface";

export const handleVideoAndThumbnaile = async (
  files: { [key: string]: Express.Multer.File[] },
  section: Isection,
  videoId: Types.ObjectId,
  videoTitle: string
) => {
  if (!files) {
    throw new CustomError("No files found", 400);
  }

  const videoFile = files["video"][0];
  const thumbnailFile = files["thumbnail"][0];

  videoFile.folder = `/courses/${section.courseId}/sections/${
    section._id
  }/videos/${videoId}/video-${videoId}-${videoTitle.replace(
    /\s/g,
    "-"
  )}-${videoFile.originalname.replace(/\s/g, "-")}`;
  // =======================================================

  thumbnailFile.folder = `/courses/${
    section.courseId
  }/sections/${section._id}/videos/${videoId}/thumbnail-${videoId}-${videoTitle.replace(
    /\s/g,
    "-"
  )}-${thumbnailFile.originalname.replace(/\s/g, "-")}`;

  return { videoFile, thumbnailFile };
};
