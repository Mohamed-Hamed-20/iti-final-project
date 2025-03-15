import { Request, Response, NextFunction } from "express";
import categoryModel from "../../../DB/models/category.model";
import { CustomError } from "../../../utils/errorHandling";
import { Model } from "mongoose";

export const addCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { title } = req.body;
      if (!title || !req.file) {
        return next(new CustomError("Missing required fields", 400));
      }
  
      const thumbnail = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  
      const newCategory = new categoryModel({ title, thumbnail });
      const savedCategory = await newCategory.save();
  
      return res.status(201).json({
        message: "Category added successfully",
        statusCode: 201,
        success: true,
        category: savedCategory,
      });
    } catch (error) {
      return next(new CustomError(`Failed to add category: ${(error as Error).message}`, 500));
    }
  };








