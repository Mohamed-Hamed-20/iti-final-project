import { Types } from "mongoose";
import { CustomError } from "../../../utils/errorHandling";
import { Isection } from "../../../DB/interfaces/videos.interface";

export const videoKey = async (
  section: Isection,
  videoId: Types.ObjectId,
  videoTitle: string
) => {
  const videoFileKey = `/courses/${section.courseId}/sections/${
    section._id
  }/videos/${videoId}/video-${videoId}-${videoTitle.replace(/\s/g, "-")}`;

  return videoFileKey;
};
