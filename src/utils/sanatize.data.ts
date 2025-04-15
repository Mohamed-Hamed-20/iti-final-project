import { Document } from "mongoose";
import { decrypt } from "./crpto";
import _ from "lodash";
import { Iuser } from "../DB/interfaces/user.interface";


export const sanatizeUser = (user: Iuser) => {

  const decryptedPhone = user?.phone
    ? decrypt(String(user.phone), String(process.env.SECRETKEY_CRYPTO))
    : undefined;

  // Split phone into components if it exists
  let countryCode, phoneNumber;
  if (decryptedPhone) {
    const match = decryptedPhone.match(/^(\+\d{1,4})(\d+)$/);
    if (match) {
      countryCode = match[1];
      phoneNumber = match[2];
    }
  }

  const sanitized = {
    _id: user?._id,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    age: user?.age,
    phone: decryptedPhone, 
    countryCode,         
    phoneNumber,          
    role: user?.role,
    avatar: user?.avatar,
    bio: user?.bio,
    isConfirmed: user?.isConfirmed,
    jobTitle: user.jobTitle,
    socialLinks: user?.socialLinks,
    verificationStatus: user?.verificationStatus,
    url : user?.url,
  };

  return _.omitBy(sanitized, _.isNil);
};
