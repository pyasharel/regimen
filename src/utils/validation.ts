import { z } from "zod";

// Authentication form validation schemas
export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be less than 128 characters");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters");

export const authSignUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
});

export const authSignInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
