import { Document } from "mongoose";
import { decrypt } from "./crpto";
import _ from "lodash";
import { Iuser } from "../DB/interfaces/user.interface";

export const sanatizeUser = (user: Iuser) => {
  // Decrypt phone if it exists
  let decryptedPhone = undefined;
  let countryCode = undefined;
  let phoneNumber = undefined;

  if (user?.phone) {
    try {
      console.log("Encrypted phone:", user.phone);
      decryptedPhone = decrypt(String(user.phone), String(process.env.SECRETKEY_CRYPTO));
      console.log("Decrypted phone:", decryptedPhone);

      // Split phone into components if decryption was successful
      if (decryptedPhone) {
        const match = decryptedPhone.match(/^(\+\d{1,4})(\d+)$/);
        if (match) {
          countryCode = match[1];
          phoneNumber = match[2];
          console.log("Country code:", countryCode);
          console.log("Phone number:", phoneNumber);
        } else {
          console.log("Phone format doesn't match expected pattern");
        }
      }
    } catch (error) {
      console.error("Error decrypting phone:", error);
    }
  } else {
    console.log("No phone number found in user object");
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
    jobTitle: user?.jobTitle,
    socialLinks: user?.socialLinks,
    verificationStatus: user?.verificationStatus,
    url: user?.url,
  };

  console.log("Final sanitized object:", sanitized);
  return _.omitBy(sanitized, _.isNil);
};
