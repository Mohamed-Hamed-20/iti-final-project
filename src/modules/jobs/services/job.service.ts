import { Request, Response, NextFunction } from "express";
import jobModel from "../../../DB/models/job.model";
import { CustomError } from "../../../utils/errorHandling";

export const addJob = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { title } = req.body;
  
      const newJob = new jobModel({ title });
      const savedJob = await newJob.save();
  
      return res.status(201).json({
        message: "Job added successfully",
        statusCode: 201,
        success: true,
        category: savedJob,
      });
    } catch (error) {
      return next(new CustomError(`Failed to add job: ${(error as Error).message}`, 500));
    }
  };

export const getAllJobs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const courses = await jobModel.find().lean();
  
      return res.status(200).json({
        message: "Jobs fetched successfully",
        statusCode: 200,
        success: true,
        courses,
      });
    } catch (error) {
      return next(new CustomError(`Failed to fetch jobs: ${(error as Error).message}`, 500));
    }
  };
