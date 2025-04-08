import { Document, Types } from 'mongoose';

export interface IFollow extends Document {
  follower: Types.ObjectId;   
  following: Types.ObjectId;
}
