import { z } from 'zod';
import { CommonValidations } from './base';

// Login schema
export const loginSchema = z.object({
  email: CommonValidations.email(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// Registration schema
export const registerSchema = CommonValidations.confirmPassword().extend({
  name: CommonValidations.requiredString('Name', 2, 50),
  email: CommonValidations.email(),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: CommonValidations.email(),
});

// Reset password schema
export const resetPasswordSchema = CommonValidations.confirmPassword();

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  ...CommonValidations.confirmPassword().shape,
});

// Email verification
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Profile update
export const updateProfileSchema = z.object({
  name: CommonValidations.requiredString('Name', 2, 50).optional(),
  email: CommonValidations.email().optional(),
  avatar: CommonValidations.url().optional(),
  bio: CommonValidations.optionalString(500),
});

// Type exports
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type EmailVerificationData = z.infer<typeof emailVerificationSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;