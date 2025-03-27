import { NextFunction, Request, Response } from "express";
import { cartModel } from "../../../DB/models/cart.model";
import { CustomError } from "../../../utils/errorHandling";

export const cart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;
  
  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await cartModel.findOne({userId: user._id , courseId});

  if (isCourseExist) {
    return next(new CustomError("Course already exists", 400));
  }
    
  const courseAdded = new cartModel({ userId: user._id, courseId });
  const courseSaved = await courseAdded.save();

  if (!courseSaved) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res
    .status(200)
    .json({
      message: "Course added successfully in cart",
      statusCode: 200,
      success: true
    });
};

export const getCartCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  
  if (!user) throw new Error("User is not found!");

  const allCourses = await cartModel.find({userId: user._id}).populate("courseId");

  if(!allCourses){
    return next(
      new CustomError("No Courses founded in your cart", 400)
    )
  }

  res
    .status(200)
    .json({
      message: "Fetch cart courses",
      statusCode: 200,
      success: true,
      data: allCourses
    });
};

export const removeCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const {courseId} = req.params;
  
  if (!user) throw new Error("User is not found!");

  const isCourseExist = await cartModel.find({userId: user._id , courseId});
  if(!isCourseExist){
    return next(new CustomError("Course is not found" , 400));
  }

  const deleteCourse = await cartModel.findOneAndDelete({userId: user._id , courseId});

  if(!deleteCourse){
    return next(new CustomError("course id is not found" , 400));
  }
  
  res
    .status(200)
    .json({
      message: "Course deleted successfully", 
      statusCode: 200,
      success: true
    });
};

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const {courseId} = req.params;
  
  if (!user) throw new Error("User is not found!");

  const isCourseExist = await cartModel.find({userId: user._id , courseId});
  if(!isCourseExist){
    return next(new CustomError("Course is not found" , 400));
  }

  const getCourse = await cartModel.findOne({userId: user._id , courseId});

  if(!getCourse){
    return next(new CustomError("course id is not found" , 400));
  }
  
  res
    .status(200)
    .json({
      message: "Course deleted successfully",
      statusCode: 200,
      success: true,
      data: getCourse
    });
};
