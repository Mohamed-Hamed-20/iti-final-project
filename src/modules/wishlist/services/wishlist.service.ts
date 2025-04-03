import { NextFunction, Request, Response } from "express";
import { wishListModel } from "../../../DB/models/wishlist.model";
import { CustomError } from "../../../utils/errorHandling";
import { cartModel } from "../../../DB/models/cart.model";
import { Iuser } from "../../../DB/interfaces/user.interface";
import S3Instance from "../../../utils/aws.sdk.s3";
import courseModel from "../../../DB/models/courses.model";


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
) => {
  const { user } = req as { user: Iuser };

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  try {
    const wishlistItems = await wishListModel.find({ userId: user._id }).lean();
    
    if (!wishlistItems || wishlistItems.length === 0) {
      return res.status(200).json({
        message: "No courses found in your wishlist",
        statusCode: 200,
        success: true,
        data: [],
      });
    }

    const courseIds = wishlistItems.map(item => item.courseId);

    const pipeline = [
      {
        $match: {
          _id: { $in: courseIds }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "instructorId",
          foreignField: "_id",
          as: "instructorId",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                avatar: 1
              }
            }
          ]
        }
      },
      {
        $unwind: "$instructorId"
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
          pipeline: [
            {
              $project: {
                title: 1,
                thumbnail: 1
              }
            }
          ]
        }
      },
      {
        $unwind: "$categoryId"
      }
    ];

    const courses = await courseModel.aggregate(pipeline).exec();

    // Add URLs to courses and merge with wishlist info
    const wishlistCourses = await Promise.all(
      courses.map(async (course) => {
        const wishlistItem = wishlistItems.find(item => 
          item.courseId.toString() === course._id.toString()
        );
        
        let url = '';
        if (course?.thumbnail) {
          url = await new S3Instance().getFile(course.thumbnail);
        }

        return {
          ...wishlistItem,
          courseId: {
            ...course,
            url, 
            instructorId: course.instructorId, 
            categoryId: course.categoryId    
          }
        };
      })
    );

    return res.status(200).json({
      message: "Wishlist courses fetched successfully",
      statusCode: 200,
      success: true,
      data: wishlistCourses,
    });
  } catch (error) {
    next(new CustomError("Failed to fetch wishlist courses", 500));
  }
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