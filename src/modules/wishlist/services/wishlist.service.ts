import { NextFunction, Request, Response } from "express";
import { wishListModel } from "../../../DB/models/wishlist.model";
import { CustomError } from "../../../utils/errorHandling";
import { cartModel } from "../../../DB/models/cart.model";

export const wishList = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;
  
  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await wishListModel.findOne({userId: user._id , courseId});

  if (isCourseExist) {
    return next(new CustomError("Course already exists", 400));
  }
    
  const courseAdded = new wishListModel({ userId: user._id, courseId , isWishlistAdded: true});
  const courseSaved = await courseAdded.save();

  if (!courseSaved) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res
    .status(200)
    .json({
      message: "Course added successfully in wishlist",
      statusCode: 200,
      success: true
    });
};

export const addToCartIcon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;
  const {isCartAdded} = req.body;
  console.log(isCartAdded);
   
  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await wishListModel.findOne({userId: user._id , courseId});

  // if (isCourseExist) {
  //   return next(new CustomError("Course already exists", 400));
  // }
    
  const updateCartIcon = await wishListModel.findOneAndUpdate({ userId: user._id, courseId },{isCartAdded:isCartAdded},{new: true});

  if (!updateCartIcon) {
    return next(
      new CustomError("Something went wrong during saving course", 400)
    );
  }
  res
    .status(200)
    .json({
      message: "cart icon change successfully",
      statusCode: 200,
      success: true,
      data: updateCartIcon
    });
};

export const getWishListCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  
  if (!user) throw new Error("User is not found!");

  const allCourses = await wishListModel.find({userId: user._id}).populate("courseId");

  if(!allCourses){
    return next(
      new CustomError("No Courses founded in your wishlist", 400)
    )
  }

  let coursesIds = [];

  for (let i = 0; i < allCourses.length ; i++) {
    coursesIds.push(allCourses[i].courseId._id)    
  }
  console.log(coursesIds);
  
  res
    .status(200)
    .json({
      message: "Fetch wishlist courses",
      statusCode: 200,
      success: true,
      data: allCourses,
      ids: coursesIds
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

  const isCourseExist = await wishListModel.find({userId: user._id , courseId});
  if(!isCourseExist){
    return next(new CustomError("Course is not found" , 400));
  }

  const deleteCourse = await wishListModel.findOneAndDelete({userId: user._id , courseId});

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

  const isCourseExist = await wishListModel.find({userId: user._id , courseId});
  if(!isCourseExist){
    return next(new CustomError("Course is not found" , 400));
  }

  const getCourse = await wishListModel.findOne({userId: user._id , courseId});

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


export const getCourseAddedCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { user } = req;
  const {courseId} = req.params;
  
  if (!user) throw new Error("User is not found!");

  const isCourseExist = await wishListModel.find({userId: user._id , courseId});
  if(!isCourseExist){
    return next(new CustomError("Course is not found" , 400));
  }

  const getCourse = await cartModel.findOneAndUpdate({userId: user._id , courseId} , {isCartAdded: true}, {new: true});

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


export const wishlistCheckCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | any> => {
  const { courseId } = req.params;
  const { user } = req;
   
  if (!user) throw new Error("User is undefined!");

  const isCourseExist = await wishListModel.findOne({userId: user._id , courseId});
  
  if(!isCourseExist){
    return new CustomError("Course Not Found in Wishlist" , 400);
  }

  res
    .status(200)
    .json({
      message: "Course founded in wishlist",
      statusCode: 200,
      success: true,
      data: {isWishlistAdded: !!isCourseExist , id: isCourseExist._id}
    });
};