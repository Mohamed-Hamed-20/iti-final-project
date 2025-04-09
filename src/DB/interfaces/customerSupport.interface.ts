import mongoose from "mongoose";
import { Iuser } from "./user.interface";

export interface ICustomerSupport {
  name: string;
  email: string;
  phone:string;
  studentId: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  resolution?: string;
  createdBy: Iuser;
}
