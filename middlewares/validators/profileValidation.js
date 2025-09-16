import { body } from "express-validator";
import userModel from "../../models/UserModel.js";

export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage("Username can only contain letters, numbers, dots, and underscores")
    .custom(async (username, { req }) => {
      const existingUser = await userModel.findOne({ username });
      if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
        throw new Error("Username already taken");
      }
      return true;
    }),

  body("bio")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Bio cannot be longer than 160 characters"),

  body("location")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Location cannot be longer than 100 characters"),
];
