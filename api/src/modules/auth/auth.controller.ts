import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { successResponse, errorResponse } from '../../utils/response';
//import { AppError } from '../../middleware/errorHandler';

/**
 * Register new user
 */
export const register = async (req: Request, res: Response): Promise<Response> => {
  const { email, username, password, firstName, lastName, role } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return errorResponse(res, 'Email already registered', 400);
    }
    return errorResponse(res, 'Username already taken', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'EVENTEE',
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return successResponse(
    res,
    'Registration successful',
    {
      user,
      token,
    },
    201
  );
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<Response> => {
  const { emailOrUsername, password } = req.body;

  // Find user by email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  });

  if (!user) {
    return errorResponse(res, 'Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return errorResponse(res, 'Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return successResponse(res, 'Login successful', {
    user: userWithoutPassword,
    token,
  });
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  return successResponse(res, 'Profile retrieved successfully', user);
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { firstName, lastName, username } = req.body;

  // Check if username is taken by another user
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      return errorResponse(res, 'Username already taken', 400);
    }
  }

  // Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      username,
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      updatedAt: true,
    },
  });

  return successResponse(res, 'Profile updated successfully', user);
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return errorResponse(res, 'Current password is incorrect', 400);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return successResponse(res, 'Password changed successfully');
};

/**
 * Refresh token
 */
export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Generate new token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return successResponse(res, 'Token refreshed successfully', { token });
};