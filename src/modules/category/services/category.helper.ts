import { Types } from "mongoose";


export const categoryKey = async (_id: Types.ObjectId, title: string) => {
  const folder = `/categories/${_id}/${_id}--${title.replace(/\s/g, "-")}`;

  return folder;
};