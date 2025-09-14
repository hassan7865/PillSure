import { Router, Request, Response } from "express";
import { AuthService } from "../services/authservice";
import { verifyToken, requireRole, generateToken } from "../middleware/jwt.handler";
import { createError } from "../middleware/error.handler";
import { LoginRequest, RegisterRequest, GoogleLoginRequest, UserRole } from "../core/types";

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
    this.router.post("/google-login", this.googleLogin.bind(this));

    // Protected routes
    this.router.post("/logout", verifyToken, this.logout.bind(this));
    this.router.post("/refresh", verifyToken, this.refreshToken.bind(this));
    this.router.get("/profile", verifyToken, this.getProfile.bind(this));
    this.router.put("/profile", verifyToken, this.updateProfile.bind(this));
    
    // Admin only routes
    this.router.get("/users", verifyToken, requireRole([UserRole.ADMIN]), this.getAllUsers.bind(this));
  }

  private async register(req: Request, res: Response) {
    try {
      const userData: RegisterRequest = req.body;

      // Basic validation
      if (!userData.email || !userData.firstName || !userData.lastName) {
        throw createError("Email, first name, and last name are required", 400);
      }

      // For non-Google users, password is required
      if (!userData.isGoogle && !userData.password) {
        throw createError("Password is required for non-Google users", 400);
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw createError("Invalid email format", 400);
      }

      // Password strength validation for non-Google users
      if (!userData.isGoogle && userData.password && userData.password.length < 6) {
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

  private async googleLogin(req: Request, res: Response) {
    try {
      const loginData: GoogleLoginRequest = req.body;

      // Basic validation
      if (!loginData.email || !loginData.idToken) {
        throw createError("Email and ID token are required", 400);
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginData.email)) {
        throw createError("Invalid email format", 400);
      }

      const result = await this.authService.googleLogin(loginData);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Google login failed"
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
          role: user.roleName,
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
          role: updatedUser.roleName
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

  private async logout(req: Request, res: Response) {
    try {

      
      res.status(200).json({
        success: true,
        message: "Logout successful"
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Logout failed"
      });
    }
  }

  private async refreshToken(req: Request, res: Response) {
    try {
      // The token is already verified by the verifyToken middleware
      // We can generate a new token with extended expiration
      const userId = (req as any).user.userId;
      const email = (req as any).user.email;
      const role = (req as any).user.role;

     
    
      const newToken = generateToken({ userId, email, role });

      res.status(200).json({
        success: true,
        token: newToken
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Token refresh failed"
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
