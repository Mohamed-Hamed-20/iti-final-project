import { v4 as uuidv4 } from "uuid";

/**
 * Generates a unique file path for storing user verification files.
 * @param userId - The user's ID.
 * @param fileType - The type of file (e.g., "frontID", "backID", "requiredVideo", "optionalVideo").
 * @param originalFilename - The original file name for reference.
 * @returns A unique file path string.
 */
export const userFileKey = async (userId: string, fileType: string, originalFilename: string): Promise<string> => {
  const fileExtension = originalFilename.split(".").pop(); 
  const uniqueId = uuidv4();

  return `users/${userId}/${fileType}/${uniqueId}.${fileExtension}`;
};
