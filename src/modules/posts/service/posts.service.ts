import { NextFunction, Request, Response } from "express";
import { Post } from "../../../DB/models/post.model";
import { CustomError } from "../../../utils/errorHandling";
import ApiPipeline from "../../../utils/apiFeacture";
import { Roles } from "../../../DB/interfaces/user.interface";
import { PipelineStage, Types } from "mongoose";

const allowSearchFields = ["text", "author.firstName", "author.lastName"];
const defaultFields = [
  "text",
  "author",
  "comments",
  "likes",
  "createdAt",
  "updatedAt",
];

// Add a new post
export const addPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { text } = req.body;
  const authorId = req.user?._id;

  const newPost = new Post({
    text,
    author: authorId,
  });

  const savedPost = await newPost.save();

  return res.status(201).json({
    message: "Post added successfully",
    statusCode: 201,
    success: true,
    post: savedPost,
  });
};

// Get all posts
export const getAllPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    page = "1",
    size = "10",
    select,
    sort = "-createdAt",
    search,
  } = req.query;

  const pageNum = Number(page) || 1;
  const sizeNum = Number(size) || 10;
  const skip = (pageNum - 1) * sizeNum;

  // Ensure sort is a string and provide a default if invalid
  const sortValue = typeof sort === "string" ? sort : "-createdAt";

  // Explicitly type pipeline as PipelineStage[]
  const pipeline: PipelineStage[] = [
    // Lookup author details
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [{ $project: { firstName: 1, lastName: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$author" }, // Single author
    // Lookup comments with user details
    {
      $lookup: {
        from: "users",
        let: { commentUsers: "$comments.user" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$commentUsers"] } } },
          { $project: { firstName: 1, lastName: 1, avatar: 1 } },
        ],
        as: "commentUsers",
      },
    },
    // Merge commentUsers into comments
    {
      $project: {
        text: 1,
        author: 1,
        createdAt: 1,
        updatedAt: 1,
        comments: {
          $map: {
            input: "$comments",
            as: "comment",
            in: {
              _id: "$$comment._id",
              text: "$$comment.text",
              createdAt: "$$comment.createdAt",
              user: {
                $arrayElemAt: [
                  "$commentUsers",
                  { $indexOfArray: ["$commentUsers._id", "$$comment.user"] },
                ],
              },
            },
          },
        },
        likes: 1,
      },
    },
    // Lookup likes with user details
    {
      $lookup: {
        from: "users",
        let: { likeUsers: "$likes.user" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$likeUsers"] } } },
          { $project: { firstName: 1, lastName: 1, avatar: 1 } },
        ],
        as: "likeUsers",
      },
    },
    // Merge likeUsers into likes
    {
      $project: {
        text: 1,
        author: 1,
        comments: 1,
        createdAt: 1,
        updatedAt: 1,
        likes: {
          $map: {
            input: "$likes",
            as: "like",
            in: {
              createdAt: "$$like.createdAt",
              user: {
                $arrayElemAt: [
                  "$likeUsers",
                  { $indexOfArray: ["$likeUsers._id", "$$like.user"] },
                ],
              },
            },
          },
        },
      },
    },
  ];

  // Add search filter
  if (search && typeof search === "string") {
    pipeline.push({
      $match: {
        $or: allowSearchFields.map((field) => ({
          [field]: { $regex: search, $options: "i" },
        })),
      },
    });
  }

  // Add sort
  pipeline.push({
    $sort: sortValue.startsWith("-")
      ? { [sortValue.slice(1)]: -1 }
      : { [sortValue]: 1 },
  });

  // Add pagination
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: sizeNum });

  // Add projection
  pipeline.push(
    select && typeof select === "string"
      ? {
          $project: select.split(",").reduce((acc, field) => {
            acc[field.trim()] = 1;
            return acc;
          }, {} as Record<string, 1>),
        }
      : {
          $project: defaultFields.reduce((acc, field) => {
            acc[field] = 1;
            return acc;
          }, {} as Record<string, 1>),
        }
  );

  const [total, posts] = await Promise.all([
    Post.countDocuments().lean(),
    Post.aggregate(pipeline).exec(),
  ]);

  return res.status(200).json({
    message: "Posts fetched successfully",
    statusCode: 200,
    totalPosts: total,
    totalPages: Math.ceil(total / sizeNum),
    success: true,
    posts,
  });
};

// Get a single post by ID
export const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const pipeline = [
    // Match the post by ID
    { $match: { _id: new Types.ObjectId(id) } },
    // Lookup author details
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [{ $project: { firstName: 1, lastName: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$author" }, // Since author is a single object
    // Lookup comments with user details
    {
      $lookup: {
        from: "users",
        let: { commentUsers: "$comments.user" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$commentUsers"] } } },
          { $project: { firstName: 1, lastName: 1, avatar: 1 } },
        ],
        as: "commentUsers",
      },
    },
    // Merge commentUsers into comments
    {
      $project: {
        text: 1,
        author: 1,
        createdAt: 1,
        updatedAt: 1,
        comments: {
          $map: {
            input: "$comments",
            as: "comment",
            in: {
              _id: "$$comment._id",
              text: "$$comment.text",
              createdAt: "$$comment.createdAt",
              user: {
                $arrayElemAt: [
                  "$commentUsers",
                  { $indexOfArray: ["$commentUsers._id", "$$comment.user"] },
                ],
              },
            },
          },
        },
        likes: 1, // Keep likes as-is for now
      },
    },
    // Lookup likes with user details
    {
      $lookup: {
        from: "users",
        let: { likeUsers: "$likes.user" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$likeUsers"] } } },
          { $project: { firstName: 1, lastName: 1, avatar: 1 } },
        ],
        as: "likeUsers",
      },
    },
    // Merge likeUsers into likes
    {
      $project: {
        text: 1,
        author: 1,
        comments: 1,
        createdAt: 1,
        updatedAt: 1,
        likes: {
          $map: {
            input: "$likes",
            as: "like",
            in: {
              createdAt: "$$like.createdAt",
              user: {
                $arrayElemAt: [
                  "$likeUsers",
                  { $indexOfArray: ["$likeUsers._id", "$$like.user"] },
                ],
              },
            },
          },
        },
      },
    },
  ];

  const postArray = await Post.aggregate(pipeline);

  if (!postArray.length) {
    return next(new CustomError("Post not found", 404));
  }

  const post = postArray[0];

  return res.status(200).json({
    message: "Post fetched successfully",
    statusCode: 200,
    success: true,
    post,
  });
};

// Update a post
export const updatePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { text } = req.body;

  const post = await Post.findById(id).lean();
  if (!post) {
    return next(new CustomError("Post not found", 404));
  }

  if (post.author.toString() !== req.user?._id.toString()) {
    return next(new CustomError("Not allowed to modify this post", 403));
  }

  const updatedPost = await Post.findByIdAndUpdate(
    id,
    { $set: { text, updatedAt: new Date() } },
    { new: true, lean: true }
  );

  return res.status(200).json({
    message: "Post updated successfully",
    statusCode: 200,
    success: true,
    post: updatedPost,
  });
};

// Delete a post
export const deletePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const post = await Post.findById(id).lean();
  if (!post) {
    return next(new CustomError("Post not found", 404));
  }

  if (post.author.toString() !== req.user?._id.toString()) {
    return next(new CustomError("Not allowed to delete this post", 403));
  }

  await Post.deleteOne({ _id: id });

  return res.status(200).json({
    message: "Post deleted successfully",
    statusCode: 200,
    success: true,
  });
};

// Like a post
export const likePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user?._id;

  const post = await Post.findById(id);
  if (!post) {
    return next(new CustomError("Post not found", 404));
  }

  // Removed the check that prevented users from liking their own posts
  const hasLiked = post.likes.some(
    (like) => like?.user?.toString() === userId?.toString()
  );
  if (hasLiked) {
    return next(new CustomError("You have already liked this post", 400));
  }

  post.likes.push({ user: userId, createdAt: new Date() });
  const updatedPost = await post.save();

  return res.status(200).json({
    message: "Post liked successfully",
    statusCode: 200,
    success: true,
    post: updatedPost,
  });
};

// Unlike a post
export const unlikePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user?._id;

  const post = await Post.findById(id);
  if (!post) {
    return next(new CustomError("Post not found", 404));
  }

  // Check if the user has liked the post
  const likeIndex = post.likes.findIndex((like) =>
    like?.user?.toString() === userId?.toString()
  );

  if (likeIndex === -1) {
    return res.status(200).json({
      message: "You have not liked this post, no action taken",
      statusCode: 200,
      success: true,
      post,
    });
  }

  post.likes.splice(likeIndex, 1);
  const updatedPost = await post.save();

  return res.status(200).json({
    message: "Post unliked successfully",
    statusCode: 200,
    success: true,
    post: updatedPost,
  });
};

// Add a comment
export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user?._id;

  const post = await Post.findById(id);
  if (!post) {
    return next(new CustomError("Post not found", 404));
  }

  post.comments.push({ user: userId, text, createdAt: new Date() });
  const updatedPost = await post.save();

  return res.status(200).json({
    message: "Comment added successfully",
    statusCode: 200,
    success: true,
    post: updatedPost,
  });
};

// Delete a comment
export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { postId, commentId } = req.params;
  const userId = req.user?._id;
  const userRole = req.user?.role;

  const post = await Post.findById(postId);
  if (!post) {
    return next(new CustomError("Post not found", 404));
  }

  const commentIndex = post.comments.findIndex(
    (comment) => comment._id?.toString() === commentId
  );
  if (commentIndex === -1) {
    return next(new CustomError("Comment not found", 404));
  }

  const comment = post.comments[commentIndex];
  const isCommentOwner = comment?.user?.toString() === userId?.toString();
  const isPrivileged = [Roles.Instructor, Roles.Admin].includes(
    userRole as Roles
  );

  if (!isCommentOwner && !isPrivileged) {
    return next(new CustomError("Not authorized to delete this comment", 403));
  }

  post.comments.splice(commentIndex, 1);
  const updatedPost = await post.save();

  return res.status(200).json({
    message: "Comment deleted successfully",
    statusCode: 200,
    success: true,
    post: updatedPost,
  });
};
