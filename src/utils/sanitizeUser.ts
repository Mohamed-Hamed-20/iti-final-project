import { Iuser } from "../DB/interfaces/user.interface";

export const sanatizeUser = (user: Iuser) => {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,  // Ensure phone is included
    role: user.role,
    isConfirmed: user.isConfirmed,
    isApproved: user.isApproved,
    isOnline: user.isOnline,
    avatar: user.avatar,
    jobTitle: user.jobTitle,
    socialLinks: user.socialLinks
  };
};
