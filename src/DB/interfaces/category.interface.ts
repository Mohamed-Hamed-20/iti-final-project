
export interface ICategory extends Document {
  title: string;
  thumbnail: string;
  courseCount?: number;
  url?: string;
}
