import mongoose, { Schema, Document } from "mongoose";

enum Roles {
  User = "user",
  Admin = "admin",
  Guest = "guest",
}

interface Iuser extends Document {
  name: string;
  email: string;
  password: string;
  age?: number;
  phone?: string;
  role: Roles;
  isConfirmed: boolean;
  avatar: string;
}

const userSchema = new Schema<Iuser>(
  {
    name: {
      type: String,
      required: true,
      minlength: [3, "name Must be at least 3, got {VALUE}"],
      maxlength: [30, "name Must be at most 30, got {VALUE}"],
    },
    email: {
      type: String,
      required: true,
      minlength: [6, "email Must be at least 6, got {VALUE}"],
      maxlength: [30, "email Must be at most 30, got {VALUE}"],
      unique: true,
      match: [
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long"],
    },
    age: {
      type: Number,
      required: false,
      min: [5, "Age must be at least 5 years old"],
      max: [100, "Age must be at most 100 years old"],
    },
    role: {
      type: String,
      enum: Object.values(Roles),
      required: true,
      default: Roles.User,
    },
    phone: {
      type: String,
      required: false,
      message: "phone must be 11 number and start with 01",
    },
    isConfirmed: {
      type: Boolean,
      required: false,
      default: false,
    },
    avatar: {
      type: String,
      required: false,
      default:
        "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
    },
  },
  { timestamps: true }
);
const userModel = mongoose.model<Iuser>("user", userSchema);
export default userModel;
