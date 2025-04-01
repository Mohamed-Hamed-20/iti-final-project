import { RequestHandler, Router } from "express";
import * as postServices from "./service/posts.service";
import {
  addPostSchema,
  updatePostSchema,
  likePostSchema,
  addCommentSchema,
  getPostsSchema,
  getPostByIdSchema,
} from "./posts.validation";
import { valid } from "../../middleware/validation";
import { asyncHandler } from "../../utils/errorHandling";
import { isAuth } from "../../middleware/auth";
import { Roles } from "../../DB/interfaces/user.interface"; // Assuming this matches your user interface
import { cokkiesSchema } from "../auth/auth.validation"; // Assuming this exists

const router = Router();

// Add Post (Only Instructors)
router.post(
  "/add",
  valid(cokkiesSchema) as RequestHandler,
  valid(addPostSchema) as RequestHandler,
  isAuth([Roles.Instructor]),
  asyncHandler(postServices.addPost)
);

// Get All Posts
router.get(
  "/all",
  valid(getPostsSchema) as RequestHandler,
  asyncHandler(postServices.getAllPosts)
);

// Get Post by ID
router.get(
  "/:id",
  valid(getPostByIdSchema) as RequestHandler,
  asyncHandler(postServices.getPostById)
);

// Update Post (Only Instructors, must be the author)
router.put(
  "/:id",
  valid(cokkiesSchema) as RequestHandler,
  valid(updatePostSchema) as RequestHandler,
  isAuth([Roles.Instructor]),
  asyncHandler(postServices.updatePost)
);

// Delete Post (Only Instructors, must be the author)
router.delete(
  "/:id",
  valid(cokkiesSchema) as RequestHandler,
  isAuth([Roles.Instructor]),
  asyncHandler(postServices.deletePost)
);

// Like Post (Any authenticated user)
router.post(
  "/like/:id",
  valid(cokkiesSchema) as RequestHandler,
  valid(likePostSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(postServices.likePost)
);

// Unlike Post (Any authenticated user who liked it)
router.post(
  "/unlike/:id",
  valid(cokkiesSchema) as RequestHandler,
  valid(likePostSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(postServices.unlikePost)
);

// Add Comment (Any authenticated user, including the author)
router.post(
  "/comment/:id",
  valid(cokkiesSchema) as RequestHandler,
  valid(addCommentSchema) as RequestHandler,
  isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
  asyncHandler(postServices.addComment)
);
// Delete Comment
router.delete(
    "/comment/:postId/:commentId",
    valid(cokkiesSchema) as RequestHandler,
    isAuth([Roles.User, Roles.Instructor, Roles.Admin]),
    asyncHandler(postServices.deleteComment)
)
export default router;