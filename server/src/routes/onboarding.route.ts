import { Router, Request, Response, NextFunction } from "express";
import { OnboardingService } from "../services/onboarding.service";
import { verifyToken } from "../middleware/jwt.handler";
import { 
  BadRequestError, 
  ValidationError 
} from "../middleware/error.handler";
import { 
  PatientOnboardingRequest, 
  DoctorOnboardingRequest, 
  HospitalOnboardingRequest 
} from "../core/types";
import { ApiResponse } from "../core/api-response";

export class OnboardingRoutes {
  private router: Router;
  private onboardingService: OnboardingService;

  constructor(onboardingService: OnboardingService) {
    this.router = Router();
    this.onboardingService = onboardingService;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // All onboarding routes require authentication
    // These endpoints handle both create and update automatically
    this.router.post("/patient", verifyToken, this.savePatientOnboarding.bind(this));
    this.router.post("/doctor", verifyToken, this.saveDoctorOnboarding.bind(this));
    this.router.post("/hospital", verifyToken, this.saveHospitalOnboarding.bind(this));
    this.router.put("/step", verifyToken, this.updateOnboardingStep.bind(this));
    this.router.get("/status", verifyToken, this.getOnboardingStatus.bind(this));
    
    // Get saved onboarding data
    this.router.get("/patient", verifyToken, this.getPatientOnboarding.bind(this));
    this.router.get("/doctor", verifyToken, this.getDoctorOnboarding.bind(this));
    this.router.get("/hospital", verifyToken, this.getHospitalOnboarding.bind(this));
  }

  // Unified save endpoints - handle both create and update
  private async savePatientOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
      
      // Check if onboarding is already complete
      const status = await this.onboardingService.getOnboardingStatus(userId);
      if (status.isOnboardingComplete) {
        const redirectPath = this.getRedirectPath(userRole);
        return res.status(200).json(ApiResponse(
          { shouldRedirect: true, redirectTo: redirectPath, role: userRole },
          "Onboarding is already complete.",
        ));
      }

      const data: PatientOnboardingRequest = req.body;
      const result = await this.onboardingService.savePatientOnboarding(userId, data);
      const redirectPath = result.isOnboardingComplete ? this.getRedirectPath(userRole) : undefined;
      res.status(200).json(ApiResponse(
        {
          ...result,
          role: userRole,
          ...(result.isOnboardingComplete ? { shouldRedirect: true, redirectTo: redirectPath } : {})
        },
        result.isOnboardingComplete ? "Onboarding completed successfully." : "Patient data saved successfully."
      ));
    } catch (error) {
      next(error);
    }
  }

  private async saveDoctorOnboarding(req: Request, res: Response, next: NextFunction) {
      const userRole = (req as any).user.role;
    try {
      const userId = (req as any).user.userId;
      
      // Check if onboarding is already complete
      const status = await this.onboardingService.getOnboardingStatus(userId);
      if (status.isOnboardingComplete) {
        const redirectPath = this.getRedirectPath(userRole);
        return res.status(200).json(ApiResponse(
          { shouldRedirect: true, redirectTo: redirectPath, role: userRole },
          "Onboarding is already complete.",
        ));
      }

      const data: DoctorOnboardingRequest = req.body;
      const result = await this.onboardingService.saveDoctorOnboarding(userId, data);
      const redirectPath = result.isOnboardingComplete ? this.getRedirectPath(userRole) : undefined;
      res.status(200).json(ApiResponse(
        {
          ...result,
          role: userRole,
          ...(result.isOnboardingComplete ? { shouldRedirect: true, redirectTo: redirectPath } : {})
        },
        result.isOnboardingComplete ? "Onboarding completed successfully." : "Doctor data saved successfully."
      ));
    } catch (error) {
      next(error);
    }
  }

  private async saveHospitalOnboarding(req: Request, res: Response, next: NextFunction) {
      const userRole = (req as any).user.role;
    try {
      const userId = (req as any).user.userId;
      
      // Check if onboarding is already complete
      const status = await this.onboardingService.getOnboardingStatus(userId);
      if (status.isOnboardingComplete) {
        const redirectPath = this.getRedirectPath(userRole);
        return res.status(200).json(ApiResponse(
          { shouldRedirect: true, redirectTo: redirectPath, role: userRole },
          "Onboarding is already complete.",
        ));
      }

      const data: HospitalOnboardingRequest = req.body;
      const result = await this.onboardingService.saveHospitalOnboarding(userId, data);
      const redirectPath = result.isOnboardingComplete ? this.getRedirectPath(userRole) : undefined;
      res.status(200).json(ApiResponse(
        {
          ...result,
          role: userRole,
          ...(result.isOnboardingComplete ? { shouldRedirect: true, redirectTo: redirectPath } : {})
        },
        result.isOnboardingComplete ? "Onboarding completed successfully." : "Hospital data saved successfully."
      ));
    } catch (error) {
      next(error);
    }
  }

  // Get saved onboarding data
  private async getPatientOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getPatientData(userId);
      res.status(200).json(ApiResponse(result, "Patient data retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getDoctorOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getDoctorData(userId);
      res.status(200).json(ApiResponse(result, "Doctor data retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getHospitalOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getHospitalData(userId);
      res.status(200).json(ApiResponse(result, "Hospital data retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async updateOnboardingStep(req: Request, res: Response, next: NextFunction) {
      const userRole = (req as any).user.role;
    try {
      const userId = (req as any).user.userId;
      const { step } = req.body;

      if (typeof step !== 'number' || step < 0 || step > 3) {
        return next(ValidationError("Invalid step number. Must be between 0 and 3"));
      }

      // Check if onboarding is already complete
      const status = await this.onboardingService.getOnboardingStatus(userId);
      if (status.isOnboardingComplete) {
        const redirectPath = this.getRedirectPath(userRole);
        return res.status(200).json(ApiResponse(
          { shouldRedirect: true, redirectTo: redirectPath, role: userRole },
          "Onboarding is already complete."
        ));
      }

      const result = await this.onboardingService.updateOnboardingStep(userId, step);
      res.status(200).json(ApiResponse(result, `Onboarding step updated to ${step}.`));
    } catch (error) {
      next(error);
    }
  }

  private async getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      const result = await this.onboardingService.getOnboardingStatus(userId);
      const redirectPath = result.isOnboardingComplete ? this.getRedirectPath(userRole) : undefined;
      res.status(200).json(ApiResponse(
        {
          ...result,
          role: userRole,
          ...(result.isOnboardingComplete ? { shouldRedirect: true, redirectTo: redirectPath } : {})
        },
        "Onboarding status retrieved successfully."
      ));
    } catch (error) {
      next(error);
    }
  }


  private getRedirectPath(role: string): string {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'doctor':
        return '/dashboard/doctor';
      case 'admin':
        return '/dashboard/admin';
      case 'hospital':
        return '/dashboard/hospital';
      default:
        return '/dashboard';
    }
  }


  public getRouter(): Router {
    return this.router;
  }
}
