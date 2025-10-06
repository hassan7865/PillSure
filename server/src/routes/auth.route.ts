import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { verifyToken, requireRole, generateToken } from "../middleware/jwt.handler";
import { 
  createError, 
  BadRequestError, 
  ValidationError, 
  NotFoundError,
  UnauthorizedError 
} from "../middleware/error.handler";
import { LoginRequest, RegisterRequest, GoogleLoginRequest, UserRole } from "../core/types";
import { createSuccessResponse } from "../core/api-response";

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

  private async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userData: RegisterRequest = req.body;

      // Basic validation
      if (!userData.email || !userData.firstName || !userData.lastName) {
        return next(BadRequestError("Email, first name, and last name are required"));
      }

      // For non-Google users, password is required
      if (!userData.isGoogle && !userData.password) {
        return next(BadRequestError("Password is required for non-Google users"));
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return next(ValidationError("Invalid email format"));
      }

      // Password strength validation for non-Google users
      if (!userData.isGoogle && userData.password && userData.password.length < 6) {
        return next(ValidationError("Password must be at least 6 characters long"));
      }

      const result = await this.authService.register(userData);
      res.status(201).json(createSuccessResponse(result, "User registered successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async login(req: Request, res: Response, next: NextFunction) {
    try {
      const loginData: LoginRequest = req.body;

      // Basic validation
      if (!loginData.email || !loginData.password) {
        return next(BadRequestError("Email and password are required"));
      }

      const result = await this.authService.login(loginData);
      res.status(200).json(createSuccessResponse(result, "Login successful"));
    } catch (error) {
      next(error);
    }
  }

  private async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const loginData: GoogleLoginRequest = req.body;

      // Basic validation
      if (!loginData.email || !loginData.idToken) {
        return next(BadRequestError("Email and ID token are required"));
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginData.email)) {
        return next(ValidationError("Invalid email format"));
      }

      const result = await this.authService.googleLogin(loginData);
      res.status(200).json(createSuccessResponse(result, "Google login successful"));
    } catch (error) {
      next(error);
    }
  }

  private async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const user = await this.authService.getUserById(userId);

      if (!user) {
        return next(NotFoundError("User not found"));
      }

      res.status(200).json(createSuccessResponse(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roleName,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        },
        "Profile retrieved successfully"
      ));
    } catch (error) {
      next(error);
    }
  }

  private async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const updateData = req.body;

      // Remove sensitive fields
      delete updateData.password;
      delete updateData.email;
      delete updateData.role;

      const updatedUser = await this.authService.updateUserProfile(userId, updateData);

      res.status(200).json(createSuccessResponse(
        {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.roleName
        },
        "Profile updated successfully"
      ));
    } catch (error) {
      next(error);
    }
  }

  private async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(createSuccessResponse(
        { users: [] },
        "Users retrieved successfully"
      ));
    } catch (error) {
      next(error);
    }
  }

  private async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(createSuccessResponse(
        null,
        "Logout successful"
      ));
    } catch (error) {
      next(error);
    }
  }

  private async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const email = (req as any).user.email;
      const role = (req as any).user.role;

      const newToken = generateToken({ userId, email, role });

      res.status(200).json(createSuccessResponse(
        { token: newToken },
        "Token refreshed successfully"
      ));
    } catch (error) {
      next(error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
