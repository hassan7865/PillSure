import { Router, Request, Response } from "express";
import { AuthService } from "../services/authservice";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { createError } from "../middleware/error.handler";
import { LoginRequest, RegisterRequest, UserRole } from "../core/types";

export class AuthRoutes {
  private router: Router;
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.router = Router();
    this.authService = authService;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Public routes
    this.router.post("/register", this.register.bind(this));
    this.router.post("/login", this.login.bind(this));

    // Protected routes
    this.router.get("/profile", verifyToken, this.getProfile.bind(this));
    this.router.put("/profile", verifyToken, this.updateProfile.bind(this));
    
    // Admin only routes
    this.router.get("/users", verifyToken, requireRole([UserRole.ADMIN]), this.getAllUsers.bind(this));
  }

  private async register(req: Request, res: Response) {
    try {
      const userData: RegisterRequest = req.body;

      // Basic validation
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        throw createError("All fields are required", 400);
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw createError("Invalid email format", 400);
      }

      // Password strength validation
      if (userData.password.length < 6) {
        throw createError("Password must be at least 6 characters long", 400);
      }

      const result = await this.authService.register(userData);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Registration failed"
      });
    }
  }

  private async login(req: Request, res: Response) {
    try {
      const loginData: LoginRequest = req.body;

      // Basic validation
      if (!loginData.email || !loginData.password) {
        throw createError("Email and password are required", 400);
      }

      const result = await this.authService.login(loginData);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Login failed"
      });
    }
  }

  private async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await this.authService.getUserById(userId);

      if (!user) {
        throw createError("User not found", 404);
      }

      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roleDetails.name,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to retrieve profile"
      });
    }
  }

  private async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;
      delete updateData.role;

      const updatedUser = await this.authService.updateUserProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.roleDetails.name
        }
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to update profile"
      });
    }
  }

  private async getAllUsers(req: Request, res: Response) {
    try {
      // This would need to be implemented in the AuthService
      // For now, just return a placeholder
      res.status(200).json({
        success: true,
        message: "Users retrieved successfully",
        users: []
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to retrieve users"
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
