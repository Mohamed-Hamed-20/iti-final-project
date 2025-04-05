import { Request, Response, NextFunction } from "express";
import categoryModel from "../../../DB/models/category.model";
import courseModel from "../../../DB/models/courses.model";
import { CustomError } from "../../../utils/errorHandling";
import S3Instance from "../../../utils/aws.sdk.s3";
import {categoryKey} from "./category.helper";
import mongoose from 'mongoose';



export const addCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title } = req.body;

  if (!req.file) {
    return next(new CustomError("Missing required fields", 400));
  }

  // Case-insensitive check for existing category
  const existingCategory = await categoryModel.findOne({
    title: { $regex: new RegExp(`^${title}$`, 'i') }
  });

  if (existingCategory) {
    return next(new CustomError("Category with this title already exists", 400));
  }

  const newCategory = new categoryModel({
    title,
    courseCount: 0 
  });

  const folder = await categoryKey(newCategory._id, newCategory.title);

  if (!folder) {
    return next(new CustomError("Failed to add category", 500));
  }

  req.file.folder = folder;
  newCategory.thumbnail = req.file.folder;

  const [uploadImage, savedCategory] = await Promise.all([
    new S3Instance().uploadLargeFileWithPath(req.file),
    newCategory.save(),
  ]);

  if (uploadImage instanceof Error) {
    await categoryModel.deleteOne({ _id: newCategory._id });
    return next(new CustomError("Error Uploading Image Server Error!", 500));
  }

  res.status(201).json({
    message: "Category added successfully",
    statusCode: 201,
    success: true,
    course: savedCategory,
  });
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title } = req.body;
  const { categoryId } = req.params;

  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    return next(new CustomError("Valid category ID is required", 400));
  }

  const objectId = new mongoose.Types.ObjectId(categoryId);

  // Case-insensitive check for existing category with different ID
  if (title) {
    const existingCategory = await categoryModel.findOne({
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      _id: { $ne: objectId }
    });

    if (existingCategory) {
      return next(new CustomError("Category with this title already exists", 400));
    }
  }

  const updateData: any = { title };

  if (req.file) {
    const folder = await categoryKey(objectId, title || '');
    
    if (!folder) {
      return next(new CustomError("Failed to update category", 500));
    }

    req.file.folder = folder;
    updateData.thumbnail = req.file.folder;

    const uploadResult = await new S3Instance().uploadLargeFileWithPath(req.file);
    if (uploadResult instanceof Error) {
      return next(new CustomError("Error Uploading Image Server Error!", 500));
    }
  }

  const updatedCategory = await categoryModel.findByIdAndUpdate(
    objectId, 
    updateData, 
    { new: true }
  );

  if (!updatedCategory) {
    return next(new CustomError("Category not found", 404));
  }

  res.status(200).json({
    message: "Category updated successfully",
    statusCode: 200,
    success: true,
    category: updatedCategory,
  });
};
  
  export const deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
      const { categoryId } = req.params;
  
      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new CustomError("Valid category ID is required", 400));
      }

      const objectId = new mongoose.Types.ObjectId(categoryId);

      // First check if there are any courses in this category
      const coursesInCategory = await courseModel.countDocuments({ categoryId: objectId });
      if (coursesInCategory > 0) {
        return next(new CustomError("Cannot delete category with existing courses", 400));
      }

      const deletedCategory = await categoryModel.findByIdAndDelete(objectId);
  
      if (!deletedCategory) {
        return next(new CustomError("Category not found", 404));
      }

      try {
        if (deletedCategory.thumbnail) {
          await new S3Instance().deleteFile(deletedCategory.thumbnail);
        }
      } catch (error) {
        console.error("Failed to delete thumbnail from S3:", error);
      }
  
      return res.status(200).json({
        message: "Category deleted successfully",
        statusCode: 200,
        success: true,
      });

  };
  
  export const getAllCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
      const categories = await categoryModel.find().lean();
  
      const categoriesWithUrls = await Promise.all(
        categories.map(async (category) => {
          const result: any = { ...category };
          
          if (category?.thumbnail) {
            try {
              result.thumbnailUrl = await new S3Instance().getFile(category.thumbnail);
            } catch (error) {
              console.error(`File not found for category ${category._id}:`, category.thumbnail);
              result.thumbnailUrl = null;
            }
          }
          return result;
        })
      );
  
      return res.status(200).json({
        message: "Categories fetched successfully",
        statusCode: 200,
        success: true,
        categories: categoriesWithUrls,
      });
  };
  
    
    
  
  
  
  
  
  
  
  
  